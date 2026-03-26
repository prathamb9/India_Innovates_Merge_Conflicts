import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])

GROQ_API_KEY = settings.groq_api_key
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are Signal Sync AI  the intelligent assistant for Signal Sync, India's AI-powered smart traffic management system. You help users with:

1. **Green Corridors**  How to create emergency vehicle corridors (Ambulance, Fire Truck, VVIP)
2. **Traffic Management**  Real-time signal preemption, IoT-based 500m advance triggers
3. **Platform Usage**  Login, registration, Aadhaar verification, vehicle registration
4. **Live Dashboard**  City monitoring, camera feeds, YOLO detection, signal override
5. **Route Planning**  Shortest paths, traffic-aware routing via Google Maps

Key facts about Signal Sync:
- Supports 7 cities: Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad
- Uses YOLO v8 for real-time vehicle detection from traffic cameras
- Green corridors automatically switch signals to GREEN as ambulance approaches within 500m
- Operators need verified accounts (Aadhaar or Driving License) to create corridors
- Admin panel controls signal override, user verification, and corridor management

Be concise, helpful, and professional. Answer in the same language the user writes in.
If asked something unrelated to traffic management, politely redirect to Signal Sync topics."""


class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
async def handle_chat(req: ChatRequest):
    """
    Handle chatbot requests via Groq LLM API.
    Falls back to basic responses if Groq API is unavailable.
    """
    if not GROQ_API_KEY:
        return ChatResponse(reply=_fallback_reply(req.message))

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": req.message},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 512,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
                return ChatResponse(reply=reply)
            else:
                print(f"Groq API error {resp.status_code}: {resp.text}")
                return ChatResponse(reply=_fallback_reply(req.message))

    except Exception as e:
        print(f"Groq API exception: {e}")
        return ChatResponse(reply=_fallback_reply(req.message))


def _fallback_reply(message: str) -> str:
    """Basic keyword-based fallback when Groq is unavailable."""
    msg = message.lower()

    if "initiate corridor" in msg or "start green wave" in msg or "corridor" in msg:
        return "To initiate a corridor, log in with an operator role (Ambulance/Fire/VVIP) and click 'Initiate Green Wave' on the portal."

    elif "document" in msg or "aadhaar" in msg or "login" in msg:
        return "We accept Aadhaar (OTP verified) or a valid Driving License for operator registration."

    elif "status" in msg or "track" in msg:
        return "Track your corridor status on the live map in the portal dashboard."

    elif "hello" in msg or "hi" in msg:
        return "Hello! I'm Signal Sync AI. I can help with corridors, registration, dashboard features, and more!"

    else:
        return "I can help with: creating green corridors, login/registration, tracking incidents, and dashboard features. What would you like to know?"
