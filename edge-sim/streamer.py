"""
SignalSync Edge AI Simulator — FastAPI MJPEG Video Streamer  (OPTIONAL)
=======================================================================
Streams the OpenCV YOLO-processed video feed as an MJPEG stream to the
Next.js dashboard. This lets the judges see the live bounding boxes
rendered directly inside the browser without any extra software.

HOW TO RUN (in a separate terminal alongside runner.py):
    cd edge-sim
    python streamer.py --video demo.mp4

Then open the Next.js dashboard. The camera feed will appear as a live
video inside the YOLO Failsafe panel (if the dashboard is connected).

The stream URL is:  http://localhost:8000/video_feed
"""

import cv2  # type: ignore
import argparse
from ultralytics import YOLO  # type: ignore
from fastapi import FastAPI  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import uvicorn  # type: ignore

CONFIDENCE_THRESHOLD = 0.55
EMERGENCY_CLASSES    = {"ambulance", "truck", "bus"}

app = FastAPI(title="SignalSync Edge AI Stream")

# Allow Next.js (localhost:3000) to access the stream
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Globals shared between endpoints
_model     = None
_video_path = "demo.mp4"


def get_model():
    global _model
    if _model is None:
        print("[YOLO] Loading model for stream...")
        _model = YOLO("yolov8n.pt")
        print("[YOLO] Model ready.")
    return _model


def generate_frames(video_path: str):
    """
    Yields JPEG frames from the video with YOLO bounding boxes drawn.
    The Next.js dashboard can embed this as:
        <img src="http://localhost:8000/video_feed" />
    """
    cap = cv2.VideoCapture(video_path)
    model = get_model()

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        for r in results:
            for box in r.boxes:  # type: ignore
                cls_name = model.names[int(box.cls[0])].lower()  # type: ignore
                conf     = float(box.conf[0])  # type: ignore
                x1, y1, x2, y2 = map(int, box.xyxy[0])  # type: ignore
                colour = (0, 255, 100) if cls_name in EMERGENCY_CLASSES else (80, 180, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)
                cv2.putText(frame, f"{cls_name} {conf:.0%}", (x1, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, colour, 1)

        # Status bar overlay
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 24), (8, 12, 24), -1)
        cv2.putText(frame, "SignalSync Edge AI  |  YOLO-v8n  |  LIVE", (6, 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.46, (0, 200, 255), 1)

        # Encode as JPEG
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        frame_bytes = buffer.tobytes()
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(_video_path),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "SignalSync Edge AI Streamer"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SignalSync MJPEG Streamer")
    parser.add_argument("--video", default="demo.mp4", help="Path to demo video")
    parser.add_argument("--port",  default=8000, type=int)
    args = parser.parse_args()

    _video_path = args.video
    print(f"\n[Streamer] Starting on http://localhost:{args.port}")
    print(f"[Streamer] Stream URL: http://localhost:{args.port}/video_feed")
    print(f"[Streamer] Embed in Next.js: <img src='http://localhost:{args.port}/video_feed' />\n")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")
