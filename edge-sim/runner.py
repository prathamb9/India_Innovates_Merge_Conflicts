"""
SignalSync Edge AI Simulator — Main YOLO Runner
===============================================
Reads a local demo video file frame by frame, runs YOLOv8n object detection,
and when an ambulance (or emergency vehicle) is detected with high confidence
for 3+ consecutive frames, fires a Firebase event that triggers the dashboard.

HOW TO RUN:
    cd edge-sim
    pip install -r requirements.txt
    python runner.py --video demo.mp4

HOW TO RUN WITH WEBCAM (live):
    python runner.py --webcam

HOW TO RUN WITHOUT FIREBASE (offline test):
    python runner.py --video demo.mp4 --no-firebase
"""

import cv2  # type: ignore
import time
import argparse
from ultralytics import YOLO  # type: ignore

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 0.55   # Minimum confidence to register a detection
CONFIRM_FRAMES       = 3       # Number of consecutive frames before firing event
CAMERA_NODES = [
    {"id": "CAM-01", "name": "Connaught Place"},
    {"id": "CAM-02", "name": "AIIMS Junction"},
    {"id": "CAM-03", "name": "Karol Bagh"},
    {"id": "CAM-04", "name": "IGI Terminal 3"},
    {"id": "CAM-05", "name": "GTK Road Azadpur"},
    {"id": "CAM-06", "name": "Lajpat Nagar"},
]

# YOLO class names to treat as emergency vehicles
EMERGENCY_CLASSES = {"ambulance", "truck", "bus"}  # truck/bus as fallback if custom model not used
# If you fine-tune with Indian emergency vehicles, add: "fire truck", "police car"

# ---------------------------------------------------------------------------
# Main detection loop
# ---------------------------------------------------------------------------
def run(video_path: str, use_webcam: bool, use_firebase: bool, headless: bool = False):
    print("\n  SignalSync Edge AI Simulator  ")
    print("=" * 40)

    # Load model (downloads automatically on first run — ~6MB)
    print("[YOLO] Loading yolov8n.pt model...")
    model = YOLO("yolov8n.pt")
    print("[YOLO] Model loaded. Starting detection loop...\n")

    # Open video source
    cap = cv2.VideoCapture(0 if use_webcam else video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open {'webcam' if use_webcam else video_path}")
        return

    # Use a random node for this session (simulates a specific intersection camera)
    import random
    node = random.choice(CAMERA_NODES)
    print(f"[NODE] This session simulates: {node['id']} — {node['name']}\n")

    consecutive_detections = 0
    event_fired            = False
    cooldown_until         = 0  # Timestamp after which we can fire again
    frame_count            = 0
    last_detected_emergency = False
    last_best_conf          = 0.0
    last_boxes              = []

    if use_firebase:
        try:
            import firebase_client as fb  # type: ignore
            print("[Firebase] Connection module loaded.\n")
        except ImportError:
            print("[WARNING] firebase_client.py not found. Running without Firebase.\n")
            use_firebase = False

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            # Loop the video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            event_fired = False
            consecutive_detections = 0
            continue

        # Downscale immediately to drastically reduce CPU load
        frame = cv2.resize(frame, (640, 360))

        frame_count += 1
        
        if frame_count % 4 == 1:
            # Run YOLO inference
            results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)

            last_detected_emergency = False
            last_best_conf = 0.0
            last_boxes.clear()

            for r in results:
                for box in r.boxes:  # type: ignore
                    cls_name = model.names[int(box.cls[0])].lower()  # type: ignore
                    conf     = float(box.conf[0])  # type: ignore
                    x1, y1, x2, y2 = map(int, box.xyxy[0])  # type: ignore
                    if cls_name in EMERGENCY_CLASSES:
                        last_detected_emergency = True
                        last_best_conf = max(last_best_conf, conf)
                    last_boxes.append((cls_name, conf, x1, y1, x2, y2))
        
        # Draw cached boxes
        for (cls_name, conf, x1, y1, x2, y2) in last_boxes:
            if cls_name in EMERGENCY_CLASSES:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 100), 2)
                cv2.putText(frame, f"{cls_name.upper()} {conf:.0%}", (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 100), 2)

        # Count consecutive emergency frames
        # Only increment on frames where actual inference was done to match older timing
        if frame_count % 4 == 1:
            if last_detected_emergency:
                consecutive_detections += 1  # type: ignore
            else:
                consecutive_detections = 0

        # Fire event after CONFIRM_FRAMES consecutive detections
        now = time.time()
        if consecutive_detections >= CONFIRM_FRAMES and not event_fired and now > cooldown_until:
            event_fired  = True
            cooldown_until = now + 30  # 30-second cooldown before next event
            conf_pct = round(last_best_conf * 100, 1)  # type: ignore
            print(f"\n[ALERT] Emergency vehicle confirmed at {node['id']} — {node['name']}")  # type: ignore
            print(f"        Confidence: {conf_pct}% · Firing Firebase event...")

            if use_firebase:
                fb.push_emergency(node["id"], node["name"], conf_pct)  # type: ignore
                print(f"        Firebase event sent! Dashboard should trigger in ~1 second.\n")
                # Schedule clear after 23 seconds (matches dashboard 20s green + 3s buffer)
                import threading
                threading.Timer(23, lambda: fb.push_clear(node["id"])).start()
            else:
                print("        [Offline mode] Firebase not connected.\n")

        # Overlay: Status bar
        status_color = (0, 255, 100) if last_detected_emergency else (100, 200, 255)
        status_text  = f"DETECTING | conf {last_best_conf:.0%}" if last_detected_emergency else "SCANNING"
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 28), (10, 15, 30), -1)
        cv2.putText(frame, f"{node['id']} {node['name']}  |  {status_text}", (8, 19),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, status_color, 1)

        # Show frame only if NOT headless
        if not headless:
            cv2.imshow(f"SignalSync Edge AI — {node['id']} {node['name']}", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        else:
            # Small delay to avoid maxing out CPU in headless mode
            cv2.waitKey(1)

    cap.release()
    if not headless:
        cv2.destroyAllWindows()
    print("[Edge AI] Session ended.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SignalSync Edge AI Simulator")
    parser.add_argument("--video",       default="demo.mp4",  help="Path to demo video file")
    parser.add_argument("--webcam",      action="store_true", help="Use live webcam instead of video")
    parser.add_argument("--no-firebase", action="store_true", help="Run without Firebase (offline test)")
    parser.add_argument("--headless",    action="store_true", help="No GUI window (video shown in browser dashboard instead)")
    args = parser.parse_args()

    run(
        video_path   = args.video,
        use_webcam   = args.webcam,
        use_firebase = not args.no_firebase,
        headless     = args.headless,
    )
