"""
SignalSync Edge AI Simulator — Firebase Client
=============================================
Connects the Python edge node to Firebase Firestore using a Service Account key.
When an ambulance is detected by YOLO, this module pushes an override event
to Firestore which the Next.js dashboard listens to via onSnapshot().

SETUP:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the file as  edge-sim/serviceAccountKey.json
   (This file is in .gitignore — never commit it)
"""

import firebase_admin  # type: ignore
from firebase_admin import credentials, firestore  # type: ignore
from datetime import datetime, timezone
import os

_db = None

def _get_db():
    global _db
    if _db is None:
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if not os.path.exists(key_path):
            raise FileNotFoundError(
                "\n\nMissing  edge-sim/serviceAccountKey.json\n"
                "Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key\n"
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
    print(f"[Firebase] Pushed: {node_id} — {node_name} — EMERGENCY conf={confidence:.1f}%")


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
    print(f"[Firebase] Pushed: {node_id} — CLEAR")
