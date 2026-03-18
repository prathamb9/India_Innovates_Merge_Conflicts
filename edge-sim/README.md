# SignalSync Edge AI Simulator

This directory contains the **Python Edge AI Simulator** — the software stand-in for a real NVIDIA Jetson Nano street-level hardware unit.

It uses **YOLOv8n** to process a demo video and automatically push Firebase events that trigger the Next.js dashboard.

---

## Quick Start

### 1. Install dependencies

```bash
cd edge-sim
pip install -r requirements.txt
```

### 2. Add your Firebase Service Account key

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → Project Settings → **Service Accounts**
2. Click **"Generate new private key"** and download the JSON file
3. Save it as `edge-sim/serviceAccountKey.json`

> **This file is in `.gitignore`. Never commit it to GitHub.**

### 3. Add a demo video

- Place any traffic/ambulance `.mp4` file in this folder and name it `demo.mp4`
- Tips for sourcing footage: search YouTube for "ambulance intersection India" and download with [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### 4. Run the YOLO detection loop

```bash
python runner.py --video demo.mp4
```

A window will open showing the video with live YOLOv8 bounding boxes. When an ambulance (or truck if using standard model) is detected for 3+ frames, it automatically fires the Firebase event.

### 5. (Optional) Run the Dashboard Video Stream

In a **second terminal**:

```bash
python streamer.py --video demo.mp4
```

Then in your Next.js dashboard, the live YOLO stream is accessible at:
```
http://localhost:8000/video_feed
```

---

## Run Without Firebase (offline test)

```bash
python runner.py --video demo.mp4 --no-firebase
```

This lets you test the YOLO detection visually without needing the Firebase key.

---

## Testing with Webcam

```bash
python runner.py --webcam
```

---

## Architecture

```
demo.mp4 ──► OpenCV frames ──► YOLOv8n model
                                    │
                          ambulance detected (3 frames, 55%+ conf)
                                    │
                        firebase_client.push_emergency()
                                    │
                       Firestore collection: edge_events
                                    │
                    Next.js onSnapshot() listener fires
                                    │
                        YoloFailsafePanel.jsx → Emergency Override UI
```

---

## Files

| File | Purpose |
|---|---|
| `runner.py` | Main YOLO detection loop — reads video, detects, fires Firebase |
| `firebase_client.py` | Firebase Admin SDK connection + Firestore write helpers |
| `streamer.py` | FastAPI MJPEG server — streams processed video to dashboard |
| `requirements.txt` | Python dependencies |
| `serviceAccountKey.json` | Firebase key — **add this manually, never commit** |
| `demo.mp4` | Demo traffic video — **add this manually** |
