"""
SignalSync Edge AI Simulator — Multi-Node FastAPI MJPEG Video Streamer
======================================================================
Serves a separate live YOLO-annotated MJPEG stream for each camera node:
    http://localhost:8001/video_feed/CAM-01  …  /video_feed/CAM-06

Each node replays the same demo.mp4 but starts at a different frame offset
so each card on the dashboard looks visually distinct.

Also exposes a /stats endpoint with the latest per-node YOLO statistics and
pushes those stats to Firestore (if serviceAccountKey.json is present).

HOW TO RUN:
    cd edge-sim
    python streamer.py --video demo.mp4 --port 8001

HOW TO RUN (offline, no Firebase):
    python streamer.py --video demo.mp4 --no-firebase
"""

import cv2            # type: ignore
import time
import threading
import argparse
from ultralytics import YOLO  # type: ignore
from fastapi import FastAPI    # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import uvicorn                # type: ignore

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 0.35   # Lowered so more classes show on demo video
EMERGENCY_CLASSES    = {"ambulance", "truck", "bus"}
VEHICLE_CLASSES      = {"car", "motorcycle", "bus", "truck", "bicycle", "van", "ambulance"}

CAMERA_NODES = [
    {"id": "CAM-01", "name": "Connaught Place",   "offset_pct": 0.00},
    {"id": "CAM-02", "name": "AIIMS Junction",    "offset_pct": 0.17},
    {"id": "CAM-03", "name": "Karol Bagh",        "offset_pct": 0.33},
    {"id": "CAM-04", "name": "IGI Terminal 3",    "offset_pct": 0.50},
    {"id": "CAM-05", "name": "GTK Road Azadpur",  "offset_pct": 0.67},
    {"id": "CAM-06", "name": "Lajpat Nagar",      "offset_pct": 0.83},
]

# ---------------------------------------------------------------------------
# Shared state: latest stats per node (thread-safe via a lock)
# ---------------------------------------------------------------------------
_stats_lock = threading.Lock()
_latest_stats: dict = {
    node["id"]: {
        "vehicle_count": 0,
        "density_pct": 0,
        "ns_density_pct": 0,
        "ew_density_pct": 0,
        "class_breakdown": {},
        "emergency": False,
        "timestamp": 0.0,
    }
    for node in CAMERA_NODES
}

# Shared annotated frame — background worker draws YOLO boxes, MJPEG endpoints just serve it
_frame_lock = threading.Lock()
_latest_annotated_frame = None  # numpy array with bounding boxes drawn

# ---------------------------------------------------------------------------
# YOLO model — loaded once, shared across all threads
# ---------------------------------------------------------------------------
_model = None
_model_lock = threading.Lock()

def get_model():
    global _model
    with _model_lock:
        if _model is None:
            print("[YOLO] Loading yolov8n.pt model …")
            _model = YOLO("yolov8n.pt")
            print("[YOLO] Model ready.\n")
    return _model


# ---------------------------------------------------------------------------
# Per-node frame generator
# ---------------------------------------------------------------------------
def generate_frames(video_path: str, node: dict, use_firebase: bool, fb=None):
    """
    Yields MJPEG frames for a single camera node.
    The video starts at node['offset_pct'] * total_frames so each node
    appears to show a different moment in time.
    """
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    start_frame = int(total * node["offset_pct"])
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    model = get_model()
    node_id   = node["id"]
    node_name = node["name"]

    last_push  = 0.0   # timestamp of last Firebase push
    PUSH_EVERY = 2.0   # seconds between stat pushes
    frame_count = 0
    last_boxes = []    # Cache boxes between inferences
    last_emergency_detected = False

    while True:
        # Prevent the while loop from maxing out CPU and spamming the browser
        time.sleep(0.04)  # ~25 FPS artificial limit

        ret, frame = cap.read()
        if not ret:
            # Loop back to start (not the offset, to keep looping naturally)
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
            
        # Downscale immediately to drastically reduce CPU load from 6 concurrent streams
        frame = cv2.resize(frame, (640, 360))
            
        frame_count += 1

        # ── YOLO inference (Frame Skipping for Speed) ─────────────────────
        if frame_count % 4 == 1:
            results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
            last_boxes.clear()
            last_emergency_detected = False
            for r in results:
                for box in r.boxes:          # type: ignore
                    cls_name = model.names[int(box.cls[0])].lower()   # type: ignore
                    conf     = float(box.conf[0])                      # type: ignore
                    x1, y1, x2, y2 = map(int, box.xyxy[0])             # type: ignore
                    if cls_name in EMERGENCY_CLASSES:
                        last_emergency_detected = True
                    last_boxes.append((cls_name, conf, x1, y1, x2, y2))

        vehicle_count   = 0
        class_breakdown = {}
        ns_box_area     = 0
        ew_box_area     = 0
        total_box_area  = 0
        frame_area      = frame.shape[0] * frame.shape[1]

        for (cls_name, conf, x1, y1, x2, y2) in last_boxes:
            # Colour: emergency = green, vehicle = cyan, other = dim blue
            if cls_name in EMERGENCY_CLASSES:
                colour = (0, 255, 100)
            elif cls_name in VEHICLE_CLASSES:
                colour = (0, 220, 255)
                vehicle_count += 1
                box_area = (x2 - x1) * (y2 - y1)
                total_box_area += box_area
                
                # Heuristic: Wider than tall by 1.3x is likely East/West cross traffic
                if (x2 - x1) > (y2 - y1) * 1.3:
                    ew_box_area += box_area
                else:
                    ns_box_area += box_area

                class_breakdown[cls_name] = class_breakdown.get(cls_name, 0) + 1
            else:
                colour = (80, 80, 200)

            cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)
            cv2.putText(frame, f"{cls_name} {conf:.0%}",
                        (x1, max(y1 - 6, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.46, colour, 1)

        # ── Compute density ───────────────────────────────────────────────
        def calc_density(area): return min(100, int((area / max(frame_area, 1)) * 1800))
        variation      = (hash(node_id) % 20) - 10   # fixed offset per node
        raw_density    = calc_density(total_box_area)
        raw_ns_density = calc_density(ns_box_area)
        raw_ew_density = calc_density(ew_box_area)
        
        density_pct    = max(5, min(97, raw_density + variation))
        ns_density_pct = max(0, min(97, raw_ns_density + (variation // 2)))
        ew_density_pct = max(0, min(97, raw_ew_density + (variation // 2)))

        # ── Update shared stats dict ──────────────────────────────────────
        now = time.time()
        with _stats_lock:
            _latest_stats[node_id] = {
                "vehicle_count":   vehicle_count,
                "density_pct":     density_pct,
                "ns_density_pct":  ns_density_pct,
                "ew_density_pct":  ew_density_pct,
                "class_breakdown": class_breakdown,
                "emergency":       last_emergency_detected,
                "timestamp": now,
            }

        # ── Push to Firebase every PUSH_EVERY seconds ─────────────────────
        if use_firebase and fb and (now - last_push) >= PUSH_EVERY:
            try:
                fb.push_stats(node_id, {
                    "vehicle_count":   vehicle_count,
                    "density_pct":     density_pct,
                    "ns_density_pct":  ns_density_pct,
                    "ew_density_pct":  ew_density_pct,
                    "class_breakdown": class_breakdown,
                    "node_name":       node_name,
                })
                last_push = now
            except Exception as e:
                print(f"[Firebase] Push error for {node_id}: {e}")

        # ── Status bar overlay ────────────────────────────────────────────
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 26), (6, 10, 20), -1)
        cv2.putText(frame,
                    f"{node_id}  {node_name}  |  Vehicles: {vehicle_count}  |  Density: {density_pct}%  |  YOLO-v8n",
                    (8, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (0, 200, 255), 1)

        # ── Encode as MJPEG ───────────────────────────────────────────────
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
               + buffer.tobytes() + b"\r\n")

    cap.release()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="SignalSync Multi-Node Stream")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# These will be set before uvicorn starts
_video_path  = "demo.mp4"
_use_firebase = False
_fb_module   = None


def generate_frames_cached():
    """
    Serves the latest YOLO-annotated frame from the background worker.
    Zero AI processing per connection — just JPEG encoding.
    """
    while True:
        time.sleep(0.04)  # ~25 FPS
        with _frame_lock:
            if _latest_annotated_frame is None:
                continue
            frame = _latest_annotated_frame.copy()
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
               + buffer.tobytes() + b"\r\n")


@app.get("/video_feed/{cam_id}")
def video_feed(cam_id: str):
    """MJPEG stream — serves pre-annotated frames from background worker (zero extra YOLO)"""
    return StreamingResponse(
        generate_frames_cached(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/video_feed")
def video_feed_default():
    """Fallback: serves annotated stream (backwards compatibility)."""
    return StreamingResponse(
        generate_frames_cached(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/stats")
def get_stats():
    """Returns the latest per-node YOLO statistics as JSON."""
    with _stats_lock:
        return dict(_latest_stats)


@app.get("/stats/{cam_id}")
def get_node_stats(cam_id: str):
    """Returns the latest stats for a single camera node."""
    with _stats_lock:
        return _latest_stats.get(cam_id, {"error": "Unknown node"})


@app.get("/health")
def health():
    return {"status": "ok", "service": "SignalSync Multi-Node Streamer", "nodes": len(CAMERA_NODES)}


# ---------------------------------------------------------------------------
# Background stats-only worker — single thread, pushes stats for ALL 6 nodes
# ---------------------------------------------------------------------------
def _background_stats_worker(video_path: str, use_firebase: bool, fb_module):
    """
    Reads video at ~20 FPS, runs YOLO every 6th frame, draws cached
    bounding boxes on ALL frames so the stream looks like smooth video.
    """
    import time as _time
    cap = cv2.VideoCapture(video_path)
    model = get_model()
    frame_count = 0
    last_push = 0.0
    PUSH_EVERY = 2.0
    INFER_EVERY = 6  # Run YOLO every 6th frame (~3.3 inferences/sec at 20 FPS)

    # Cached detection results — drawn on every frame until next inference
    cached_boxes = []       # list of (x1, y1, x2, y2, cls_name, conf, is_emg)
    cached_vehicle_count = 0
    cached_density = 0
    cached_ns = 0
    cached_ew = 0
    cached_breakdown = {}
    cached_emergency = False

    print("[Stats Worker] Background stats thread started — 20 FPS video + YOLO detection")

    while True:
        _time.sleep(0.05)  # ~20 FPS — smooth video playback

        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = cv2.resize(frame, (640, 360))
        frame_count += 1
        frame_area = frame.shape[0] * frame.shape[1]

        # ── Run YOLO inference on every Nth frame ──
        if frame_count % INFER_EVERY == 1:
            results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)

            new_boxes = []
            vehicle_count = 0
            class_breakdown = {}
            ns_box_area = 0
            ew_box_area = 0
            total_box_area = 0
            emergency_detected = False

            for r in results:
                for box in r.boxes:  # type: ignore
                    cls_name = model.names[int(box.cls[0])].lower()  # type: ignore
                    x1, y1, x2, y2 = map(int, box.xyxy[0])  # type: ignore
                    conf = float(box.conf[0])  # type: ignore
                    is_emg = cls_name in EMERGENCY_CLASSES
                    if is_emg:
                        emergency_detected = True
                    if cls_name in VEHICLE_CLASSES:
                        vehicle_count += 1
                        box_area = (x2 - x1) * (y2 - y1)
                        total_box_area += box_area
                        if (x2 - x1) > (y2 - y1) * 1.3:
                            ew_box_area += box_area
                        else:
                            ns_box_area += box_area
                        class_breakdown[cls_name] = class_breakdown.get(cls_name, 0) + 1
                        new_boxes.append((x1, y1, x2, y2, cls_name, conf, is_emg))

            def calc_density(area):
                return min(100, int((area / max(frame_area, 1)) * 1800))

            # Update cached values
            cached_boxes = new_boxes
            cached_vehicle_count = vehicle_count
            cached_density = calc_density(total_box_area)
            cached_ns = calc_density(ns_box_area)
            cached_ew = calc_density(ew_box_area)
            cached_breakdown = class_breakdown
            cached_emergency = emergency_detected

            # Push stats for all 6 nodes
            now = _time.time()
            for node in CAMERA_NODES:
                variation = (hash(node["id"]) % 20) - 10
                density_pct = max(5, min(97, cached_density + variation))
                ns_density_pct = max(0, min(97, cached_ns + (variation // 2)))
                ew_density_pct = max(0, min(97, cached_ew + (variation // 2)))

                with _stats_lock:
                    _latest_stats[node["id"]] = {
                        "vehicle_count": cached_vehicle_count,
                        "density_pct": density_pct,
                        "ns_density_pct": ns_density_pct,
                        "ew_density_pct": ew_density_pct,
                        "class_breakdown": cached_breakdown,
                        "emergency": cached_emergency,
                        "timestamp": now,
                    }

                if use_firebase and fb_module and (now - last_push) >= PUSH_EVERY:
                    try:
                        fb_module.push_stats(node["id"], {
                            "vehicle_count": cached_vehicle_count,
                            "density_pct": density_pct,
                            "ns_density_pct": ns_density_pct,
                            "ew_density_pct": ew_density_pct,
                            "class_breakdown": cached_breakdown,
                            "node_name": node["name"],
                        })
                    except Exception as e:
                        print(f"[Firebase] Push error for {node['id']}: {e}")

            if use_firebase and fb_module and (now - last_push) >= PUSH_EVERY:
                last_push = now

        # ── Draw cached bounding boxes on EVERY frame (smooth video) ──
        for (x1, y1, x2, y2, cls_name, conf, is_emg) in cached_boxes:
            color = (0, 0, 255) if is_emg else (0, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{cls_name} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
            cv2.putText(frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

        # Draw HUD overlay
        hud = f"Vehicles: {cached_vehicle_count} | Density: {cached_density}% | N/S: {cached_ns}% | E/W: {cached_ew}% | YOLO-v8n"
        cv2.rectangle(frame, (0, 0), (640, 22), (0, 0, 0), -1)
        cv2.putText(frame, hud, (8, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 245, 255), 1)

        # Store annotated frame for MJPEG endpoint — UPDATED EVERY FRAME
        global _latest_annotated_frame
        with _frame_lock:
            _latest_annotated_frame = frame

    cap.release()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SignalSync Multi-Node MJPEG Streamer")
    parser.add_argument("--video",       default="demo.mp4", help="Path to demo video file")
    parser.add_argument("--port",        default=8001, type=int, help="Port to serve on")
    parser.add_argument("--no-firebase", action="store_true",   help="Skip Firebase push")
    args = parser.parse_args()

    _video_path   = args.video
    _use_firebase = not args.no_firebase

    if _use_firebase:
        try:
            import firebase_client as fb  # type: ignore
            _fb_module = fb
            print("[Firebase] firebase_client.py loaded — stats will be pushed to Firestore.")
        except Exception as e:
            print(f"[WARNING] Could not load firebase_client: {e}")
            print("[WARNING] Running without Firebase.\n")
            _use_firebase = False

    print(f"\n[Streamer] Starting SignalSync Stats Engine on port {args.port}")
    print(f"[Streamer] Video source: {args.video}")
    print(f"[Streamer] Firebase push: {'enabled' if _use_firebase else 'disabled (offline)'}")
    print(f"[Streamer] Stats API:  http://localhost:{args.port}/stats")
    print(f"[Streamer] Health:     http://localhost:{args.port}/health\n")

    # Start background stats worker thread
    stats_thread = threading.Thread(
        target=_background_stats_worker,
        args=(_video_path, _use_firebase, _fb_module),
        daemon=True,
    )
    stats_thread.start()
    print("[Streamer] Background YOLO stats worker started (single thread for all 6 nodes)\n")

    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")

