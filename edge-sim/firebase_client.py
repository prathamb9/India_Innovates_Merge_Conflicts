"""
SignalSync Edge AI Simulator  Firebase Client
=============================================
Connects the Python edge node to Firebase Firestore using a Service Account key.
When an ambulance is detected by YOLO, this module pushes an override event
to Firestore which the Next.js dashboard listens to via onSnapshot().

SETUP:
1. Go to Firebase Console -> Project Settings -> Service Accounts
2. Click "Generate new private key"
3. Save the file as  edge-sim/serviceAccountKey.json
   (This file is in .gitignore  never commit it)
"""

import firebase_admin  # type: ignore
from firebase_admin import credentials, firestore  # type: ignore
from datetime import datetime, timezone
import os

_db = None
_initialized = False

def _get_db():
    global _db
    if _db is None:
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if not os.path.exists(key_path):
            raise FileNotFoundError(
                "\n\nMissing  edge-sim/serviceAccountKey.json\n"
                "Download it from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key\n"
            )
        if not firebase_admin._apps:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def push_emergency(node_id: str, node_name: str, confidence: float):
    """
    Push an EMERGENCY_OVERRIDE event to Firestore collection: edge_events
    The Next.js YoloFailsafePanel listens to this collection via onSnapshot().
    """
    db = _get_db()
    doc = {
        "node_id": node_id,
        "node_name": node_name,
        "status": "EMERGENCY",
        "confidence": round(confidence, 2),  # type: ignore
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "edge-ai-simulator",
    }
    db.collection("edge_events").add(doc)
    print(f"[Firebase] Pushed: {node_id}  {node_name}  EMERGENCY conf={confidence:.1f}%")


def push_clear(node_id: str):
    """
    Notify the dashboard that the emergency is cleared and the signal can resume.
    """
    db = _get_db()
    doc = {
        "node_id": node_id,
        "status": "CLEAR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "edge-ai-simulator",
    }
    db.collection("edge_events").add(doc)
    print(f"[Firebase] Pushed: {node_id}  CLEAR")


def push_stats(node_id: str, stats: dict):
    """
    Upsert real-time YOLO traffic statistics for a specific camera node.
    Written to Firestore collection: intersection_stats/{node_id}
    The Next.js dashboard listens to this via onSnapshot().
    """
    db = _get_db()
    doc = {
        "node_id":         node_id,
        "node_name":       stats.get("node_name", node_id),
        "vehicle_count":   stats.get("vehicle_count", 0),
        "density_pct":     stats.get("density_pct", 0),
        "ns_density_pct":  stats.get("ns_density_pct", 0),
        "ew_density_pct":  stats.get("ew_density_pct", 0),
        "class_breakdown": stats.get("class_breakdown", {}),
        "updated_at":      datetime.now(timezone.utc).isoformat(),
        "source":          "edge-ai-streamer",
    }
    # Use set() with merge=True so it creates or updates the document
    db.collection("intersection_stats").document(node_id).set(doc, merge=True)
    # Uncomment below for verbose logging:
    # print(f"[Firebase] Stats pushed: {node_id} vehicles={stats.get('vehicle_count')} density={stats.get('density_pct')}%")
