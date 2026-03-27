"""
SignalSync Edge AI  4-Direction Pipelined YOLO Streamer
=========================================================
Each intersection direction (NORTH/SOUTH/EAST/WEST) has its own pipeline:

    [Pre-process Thread]  ->  YOLO annotate 3.5s batch  ->  swap to play buffer
    [Stream Thread]       ->  serve play buffer at 20fps as MJPEG
    [Signal Controller]   ->  compare N/S avg vs E/W avg -> assign GREEN/RED

HOW TO RUN:
    cd edge-sim
    python streamer.py --video demo.mp4 --port 8001
    python streamer.py --video demo.mp4 --no-firebase
"""

import cv2            # type: ignore
import time
import threading
import argparse
import collections
from ultralytics import YOLO  # type: ignore
from fastapi import FastAPI, Header  # type: ignore
from pydantic import BaseModel  # type: ignore
from fastapi.responses import StreamingResponse, JSONResponse  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import uvicorn                # type: ignore

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 0.35
EMERGENCY_CLASSES    = {"ambulance", "truck", "bus"}
VEHICLE_CLASSES      = {"car", "motorcycle", "bus", "truck", "bicycle", "van", "ambulance"}

TARGET_FPS    = 20
BUFFER_SECS   = 3.5                          # pre-process 3.5 s before playing
BUFFER_FRAMES = int(BUFFER_SECS * TARGET_FPS)  #  70 frames

# 4 directions — each reads from its own video file
DIRECTIONS = [
    {"id": "NORTH", "axis": "ns"},
    {"id": "SOUTH", "axis": "ns"},
    {"id": "EAST",  "axis": "ew"},
    {"id": "WEST",  "axis": "ew"},
]

# Legacy node list (for Firebase stats push compatibility)
CAMERA_NODES = [
    {"id": "CAM-01", "name": "Connaught Place",   "direction": "NORTH"},
    {"id": "CAM-02", "name": "AIIMS Junction",    "direction": "SOUTH"},
    {"id": "CAM-03", "name": "Karol Bagh",        "direction": "EAST"},
    {"id": "CAM-04", "name": "IGI Terminal 3",    "direction": "WEST"},
    {"id": "CAM-05", "name": "GTK Road Azadpur",  "direction": "NORTH"},
    {"id": "CAM-06", "name": "Lajpat Nagar",      "direction": "SOUTH"},
]

# ---------------------------------------------------------------------------
# YOLO model  loaded once, shared across all threads
# ---------------------------------------------------------------------------
_model      = None
_model_lock = threading.Lock()

def get_model():
    global _model
    with _model_lock:
        if _model is None:
            print("[YOLO] Loading yolov8n.pt model...")
            _model = YOLO("yolov8n.pt")
            print("[YOLO] Model ready.\n")
    return _model


# ---------------------------------------------------------------------------
# Signal state  shared, protected by lock
# ---------------------------------------------------------------------------
_signal_lock  = threading.Lock()
_signal_state = {
    "green_axis": "ns",          # "ns" or "ew"
    "mode": "fixed",             # "dynamic" or "fixed"
    "ns_density": 0,
    "ew_density": 0,
    "phase": "green",            # current phase in fixed mode
    "phase_timer": 20,           # seconds remaining
}

# ---------------------------------------------------------------------------
# Per-direction pipeline
# ---------------------------------------------------------------------------
class DirectionPipeline:
    """
    Maintains two frame buffers for one camera direction.

    Background thread pre-processes the NEXT buffer while the current
    buffer is being served to MJPEG clients.  Buffers swap atomically
    so there is never a gap in the stream.
    """

    def __init__(self, direction: dict, video_path: str):
        self.id         = direction["id"]
        self.axis       = direction["axis"]
        self.video_path = video_path

        # Two deques  one playing, one being filled
        self._play_buf  = collections.deque()   # JPEG bytes, currently served
        self._next_buf  = []                    # list being pre-filled

        self._buf_lock  = threading.Lock()
        self._swap_event = threading.Event()    # signals that next buf is ready

        # Latest YOLO stats for this direction
        self.stats_lock = threading.Lock()
        self.stats = {
            "vehicle_count": 0,
            "density_pct": 0,
            "ns_density_pct": 0,
            "ew_density_pct": 0,
            "class_breakdown": {},
            "emergency": False,
        }

        self._stop = False

    # ------------------------------------------------------------------
    def _annotate_frame(self, frame, model, cached_boxes):
        """Draw YOLO bounding boxes + HUD on frame, return annotated copy."""
        frame_area = frame.shape[0] * frame.shape[1]
        vehicle_count  = 0
        class_breakdown = {}
        ns_area = ew_area = total_area = 0
        emergency = False

        for (x1, y1, x2, y2, cls_name, conf, is_emg) in cached_boxes:
            color = (0, 120, 255) if is_emg else (0, 235, 80) if cls_name in VEHICLE_CLASSES else (80, 80, 200)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{cls_name} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
            cv2.putText(frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

            if cls_name in VEHICLE_CLASSES:
                vehicle_count += 1
                box_area = (x2 - x1) * (y2 - y1)
                total_area += box_area
                if (x2 - x1) > (y2 - y1) * 1.3:
                    ew_area += box_area
                else:
                    ns_area += box_area
                class_breakdown[cls_name] = class_breakdown.get(cls_name, 0) + 1
            if is_emg:
                emergency = True

        def density(area): return min(100, int((area / max(frame_area, 1)) * 1800))

        d     = density(total_area)
        ns_d  = density(ns_area)
        ew_d  = density(ew_area)

        # HUD overlay
        cv2.rectangle(frame, (0, 0), (640, 24), (0, 0, 0), -1)
        cv2.putText(frame,
            f"CAM: {self.id}  |  Vehicles: {vehicle_count}  |  Density: {d}%  |  YOLO-v8n",
            (8, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 245, 255), 1)

        return frame, vehicle_count, d, ns_d, ew_d, class_breakdown, emergency

    # ------------------------------------------------------------------
    def _process_loop(self, model):
        """
        Background thread: reads video, runs YOLO every 4th frame,
        fills BUFFER_FRAMES into _next_buf, then swaps with _play_buf.
        """
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open video: {self.video_path}")
            return

        frame_idx    = 0
        cached_boxes = []

        # Accumulators for averaging stats across the buffer window
        acc_vehicles  = []
        acc_density   = []
        acc_ns        = []
        acc_ew        = []
        acc_breakdown = {}
        acc_emergency = False

        while not self._stop:
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = cv2.resize(frame, (854, 480))
            frame_idx += 1

            # YOLO inference every 4th frame
            if frame_idx % 4 == 1:
                results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
                cached_boxes = []
                for r in results:
                    for box in r.boxes:  # type: ignore
                        cls_name = model.names[int(box.cls[0])].lower()  # type: ignore
                        x1, y1, x2, y2 = map(int, box.xyxy[0])          # type: ignore
                        conf     = float(box.conf[0])                    # type: ignore
                        is_emg   = cls_name in EMERGENCY_CLASSES
                        cached_boxes.append((x1, y1, x2, y2, cls_name, conf, is_emg))

            # Annotate frame and collect stats
            ann_frame, vc, d, ns_d, ew_d, bd, emg = self._annotate_frame(
                frame.copy(), model, cached_boxes
            )

            acc_vehicles.append(vc)
            acc_density.append(d)
            acc_ns.append(ns_d)
            acc_ew.append(ew_d)
            for k, v in bd.items():
                acc_breakdown[k] = acc_breakdown.get(k, 0) + v
            if emg:
                acc_emergency = True

            # JPEG encode and push to next_buf
            _, buf = cv2.imencode(".jpg", ann_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            self._next_buf.append(buf.tobytes())

            # When next_buf has enough frames, swap atomically
            if len(self._next_buf) >= BUFFER_FRAMES:
                # Compute averaged stats for this buffer window
                avg_vc  = int(sum(acc_vehicles) / max(len(acc_vehicles), 1))
                avg_d   = int(sum(acc_density) / max(len(acc_density), 1))
                avg_ns  = int(sum(acc_ns) / max(len(acc_ns), 1))
                avg_ew  = int(sum(acc_ew) / max(len(acc_ew), 1))

                with self.stats_lock:
                    self.stats = {
                        "vehicle_count":   avg_vc,
                        "density_pct":     avg_d,
                        "ns_density_pct":  avg_ns,
                        "ew_density_pct":  avg_ew,
                        "class_breakdown": dict(acc_breakdown),
                        "emergency":       acc_emergency,
                    }

                # Atomic swap
                with self._buf_lock:
                    self._play_buf = collections.deque(self._next_buf)

                # Reset staging buffer + accumulators
                self._next_buf  = []
                acc_vehicles    = []
                acc_density     = []
                acc_ns          = []
                acc_ew          = []
                acc_breakdown   = {}
                acc_emergency   = False

                self._swap_event.set()

            # Cap CPU  don't need real-time here, just keep ahead of playback
            time.sleep(0.01)

        cap.release()

    # ------------------------------------------------------------------
    def start(self, model):
        t = threading.Thread(target=self._process_loop, args=(model,), daemon=True)
        t.start()
        # Wait for first buffer to fill before allowing streams to start
        print(f"[Pipeline] Buffering {BUFFER_SECS}s for {self.id}...")
        self._swap_event.wait(timeout=30)
        print(f"[Pipeline] {self.id} ready to stream.")

    # ------------------------------------------------------------------
    def stream(self):
        """
        Generator: yields MJPEG frames from the play buffer at TARGET_FPS.
        If the buffer runs out (not yet refilled), waits for the next swap.
        """
        frame_interval = 1.0 / TARGET_FPS

        while True:
            with self._buf_lock:
                if self._play_buf:
                    jpeg_bytes = self._play_buf.popleft()
                else:
                    jpeg_bytes = None

            if jpeg_bytes is None:
                # Buffer depleted  wait for next pre-processed batch
                self._swap_event.clear()
                self._swap_event.wait(timeout=5)
                continue

            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                   + jpeg_bytes + b"\r\n")

            time.sleep(frame_interval)

    # ------------------------------------------------------------------
    def get_stats(self):
        with self.stats_lock:
            return dict(self.stats)


# ---------------------------------------------------------------------------
# Global pipeline registry
# ---------------------------------------------------------------------------
_pipelines: dict[str, DirectionPipeline] = {}


# ---------------------------------------------------------------------------
# Signal control thread  runs every second
# ---------------------------------------------------------------------------
def _signal_controller():
    """
    Runs every 1s:
      - Reads N/S and E/W average densities.
      - If diff > 10%: dynamic mode (busier axis GREEN, other RED).
      - Otherwise: fixed 20s GREEN / 5s YELLOW / 15s RED cycle,
        alternating the green_axis on each full cycle.
    """
    FIXED_GREEN  = 20
    FIXED_YELLOW = 3
    FIXED_RED    = 15

    fixed_phase     = "green"
    fixed_remaining = FIXED_GREEN
    EQUAL_THRESHOLD = 10

    while True:
        time.sleep(1)

        # Check for admin override
        with _signal_lock:
            override = _signal_state.get("override_remaining", 0)
            if override > 0:
                _signal_state["override_remaining"] = override - 1
                # Just tick the override timer down, don't touch phase
                _signal_state["phase_timer"] = override - 1
                continue

        # Collect densities
        ns_density = ew_density = ns_count = ew_count = 0
        for d in DIRECTIONS:
            pipe = _pipelines.get(d["id"])
            if pipe:
                s = pipe.get_stats()
                if d["axis"] == "ns":
                    ns_density += s.get("density_pct", 0); ns_count += 1
                else:
                    ew_density += s.get("density_pct", 0); ew_count += 1

        avg_ns = int(ns_density / max(ns_count, 1))
        avg_ew = int(ew_density / max(ew_count, 1))
        diff   = abs(avg_ns - avg_ew)

        with _signal_lock:
            _signal_state["ns_density"] = avg_ns
            _signal_state["ew_density"] = avg_ew

            if diff > EQUAL_THRESHOLD:
                # Dynamic mode
                green_axis = "ns" if avg_ns > avg_ew else "ew"
                _signal_state["mode"]        = "dynamic"
                _signal_state["green_axis"]  = green_axis
                _signal_state["phase"]       = "green"
                _signal_state["phase_timer"] = 0
                # Reset fixed-cycle so next fixed cycle starts fresh
                fixed_phase     = "green"
                fixed_remaining = FIXED_GREEN
            else:
                # Fixed cycle mode — decrement timer
                _signal_state["mode"] = "fixed"
                fixed_remaining -= 1

                if fixed_remaining <= 0:
                    if fixed_phase == "green":
                        # GREEN done -> YELLOW
                        fixed_phase     = "yellow"
                        fixed_remaining = FIXED_YELLOW
                    elif fixed_phase == "yellow":
                        # YELLOW done -> RED; swap green_axis NOW so the
                        # other axis starts showing green when phase flips to green
                        fixed_phase     = "red"
                        fixed_remaining = FIXED_RED
                        _signal_state["green_axis"] = (
                            "ew" if _signal_state["green_axis"] == "ns" else "ns"
                        )
                    else:
                        # RED done -> GREEN
                        fixed_phase     = "green"
                        fixed_remaining = FIXED_GREEN

                _signal_state["phase"]       = fixed_phase
                _signal_state["phase_timer"] = fixed_remaining


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="SignalSync 4-Direction Pipelined Streamer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/video_feed/{direction_id}")
def video_feed(direction_id: str):
    """
    MJPEG stream for a specific direction: NORTH, SOUTH, EAST, WEST.
    Falls back to the oldest stream if id not found.
    """
    direction_id = direction_id.upper()
    pipe = _pipelines.get(direction_id)
    if not pipe:
        # Fallback: return first available pipeline
        pipe = next(iter(_pipelines.values()), None)
    if not pipe:
        return JSONResponse({"error": "No pipelines ready"}, status_code=503)
    return StreamingResponse(
        pipe.stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/video_feed")
def video_feed_default():
    """Backwards-compatible fallback  serves NORTH stream."""
    pipe = _pipelines.get("NORTH") or next(iter(_pipelines.values()), None)
    if not pipe:
        return JSONResponse({"error": "Not ready"}, status_code=503)
    return StreamingResponse(
        pipe.stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/signal_state")
def signal_state():
    with _signal_lock:
        return dict(_signal_state)


# Admin-only signal override
ADMIN_TOKEN = "admin-token-signalsync"   # in production: use env var

class OverrideRequest(BaseModel):
    phase: str        # "green" | "yellow" | "red"
    axis:  str        # "ns"    | "ew"
    duration: int = 30   # seconds to hold override

@app.post("/signal_override")
def signal_override(req: OverrideRequest, authorization: str = Header(default="")):
    """Admin-only: manually force a signal phase for `duration` seconds."""
    token = authorization.replace("Bearer ", "").strip()
    if token != ADMIN_TOKEN:
        return JSONResponse({"error": "Unauthorized — admin token required"}, status_code=403)

    if req.phase not in ("green", "yellow", "red"):
        return JSONResponse({"error": "Invalid phase"}, status_code=400)
    if req.axis not in ("ns", "ew"):
        return JSONResponse({"error": "Invalid axis"}, status_code=400)
    duration = max(5, min(req.duration, 120))

    with _signal_lock:
        _signal_state["mode"]              = "override"
        _signal_state["phase"]             = req.phase
        _signal_state["green_axis"]        = req.axis
        _signal_state["phase_timer"]       = duration
        _signal_state["override_remaining"] = duration

    return {"ok": True, "phase": req.phase, "axis": req.axis, "duration": duration}


@app.get("/stats")
def get_stats():
    """Returns per-direction YOLO stats."""
    result = {}
    for d in DIRECTIONS:
        pipe = _pipelines.get(d["id"])
        if pipe:
            result[d["id"]] = pipe.get_stats()
    return result


@app.get("/stats/{direction_id}")
def get_direction_stats(direction_id: str):
    """Returns stats for a single direction."""
    pipe = _pipelines.get(direction_id.upper())
    if not pipe:
        return JSONResponse({"error": "Unknown direction"}, status_code=404)
    return pipe.get_stats()


@app.get("/health")
def health():
    ready = {d: (d in _pipelines) for d in ["NORTH", "SOUTH", "EAST", "WEST"]}
    return {"status": "ok", "service": "SignalSync Pipelined Streamer", "directions": ready}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SignalSync 4-Direction YOLO Streamer")
    parser.add_argument("--video",       default="demo.mp4",  help="Fallback video for all directions")
    parser.add_argument("--video-north", default=None,        help="Video file for NORTH cam")
    parser.add_argument("--video-south", default=None,        help="Video file for SOUTH cam")
    parser.add_argument("--video-east",  default=None,        help="Video file for EAST cam")
    parser.add_argument("--video-west",  default=None,        help="Video file for WEST cam")
    parser.add_argument("--port",        default=8001, type=int)
    parser.add_argument("--no-firebase", action="store_true", help="Skip Firebase push")
    args = parser.parse_args()

    # Map each direction to its video file (fallback to --video if not specified)
    DIR_VIDEOS = {
        "NORTH": args.video_north or args.video,
        "SOUTH": args.video_south or args.video,
        "EAST":  args.video_east  or args.video,
        "WEST":  args.video_west  or args.video,
    }

    use_firebase = not args.no_firebase
    fb_module    = None

    if use_firebase:
        try:
            import firebase_client as fb  # type: ignore
            fb_module = fb
            print("[Firebase] firebase_client.py loaded.")
        except Exception as e:
            print(f"[WARNING] Could not load firebase_client: {e}")
            use_firebase = False

    for d_id, vpath in DIR_VIDEOS.items():
        print(f"[Streamer] {d_id} => {vpath}")
    print(f"[Streamer] Buffer: {BUFFER_SECS}s ({BUFFER_FRAMES} frames) per direction")
    print(f"[Streamer] Firebase: {'enabled' if use_firebase else 'disabled'}\n")

    # Load YOLO model once before spawning threads
    model = get_model()

    # Create and start all 4 direction pipelines
    pipeline_threads = []
    for direction in DIRECTIONS:
        video_path = DIR_VIDEOS[direction["id"]]
        pipe = DirectionPipeline(direction, video_path)
        _pipelines[direction["id"]] = pipe

        # Spawn the pipeline background thread
        t = threading.Thread(
            target=pipe._process_loop,
            args=(model,),
            daemon=True,
            name=f"Pipeline-{direction['id']}",
        )
        t.start()

    # Wait for all 4 directions to fill their first buffer
    print("[Streamer] Waiting for all 4 direction buffers to be ready...")
    for d_id, pipe in _pipelines.items():
        filled = pipe._swap_event.wait(timeout=60)
        if filled:
            print(f"[Streamer] {d_id}  ready")
        else:
            print(f"[Streamer] {d_id}  timeout  will stream when available")

    # Firebase periodic push (optional)  runs in its own thread
    if use_firebase and fb_module:
        def _firebase_push_loop():
            PUSH_EVERY = 2.0
            last_push = 0.0
            while True:
                time.sleep(0.5)
                now = time.time()
                if now - last_push < PUSH_EVERY:
                    continue
                last_push = now
                # Map directions to legacy CAM node IDs for Firestore compatibility
                dir_to_cam = {
                    "NORTH": ["CAM-01", "CAM-05"],
                    "SOUTH": ["CAM-02", "CAM-06"],
                    "EAST":  ["CAM-03"],
                    "WEST":  ["CAM-04"],
                }
                for d_id, cam_ids in dir_to_cam.items():
                    pipe = _pipelines.get(d_id)
                    if not pipe:
                        continue
                    s = pipe.get_stats()
                    for cam_id in cam_ids:
                        try:
                            node = next((n for n in CAMERA_NODES if n["id"] == cam_id), None)
                            fb_module.push_stats(cam_id, {
                                **s,
                                "node_name": node["name"] if node else cam_id,
                            })
                        except Exception as e:
                            pass  # Silently skip quota errors

        fb_thread = threading.Thread(target=_firebase_push_loop, daemon=True)
        fb_thread.start()
        print("[Firebase] Push thread started.")

    # Signal controller thread
    sig_thread = threading.Thread(target=_signal_controller, daemon=True)
    sig_thread.start()
    print("[Signal] Controller thread started.\n")

    print(f"[Streamer] Serving on http://0.0.0.0:{args.port}")
    print(f"   /video_feed/NORTH  /video_feed/SOUTH  /video_feed/EAST  /video_feed/WEST")
    print(f"   /signal_state      /stats             /health\n")

    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")
