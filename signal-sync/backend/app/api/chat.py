from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
async def handle_chat(req: ChatRequest):
    """
    Handle Chatbot requests.
    Predefined behaviors based on text.
    """
    msg = req.message.lower()
    
    if "initiate corridor" in msg or "start green wave" in msg:
        reply = "To initiate a corridor, log in with an appropriate operator role (Ambulance, Fire Truck, or VVIP) and click 'Initiate Green Wave' on your portal dashboard."
    
    elif "required documents" in msg or "documents" in msg:
        reply = "We accept Aadhaar (OTP verified) or a valid Driving License ID. You'll need these to log in as an operator."
        
    elif "status" in msg or "track" in msg:
        reply = "You can track the status of your Emergency Incident directly on the live map in the platform portal."
        
    elif "hello" in msg or "hi" in msg:
        reply = "Hello! I am the Signal Sync AI assistant. I can help you with initiating corridors, required documents, or status queries."
        
    else:
        reply = "I'm sorry, I don't fully understand. I can help you with: \n1. How to initiate a corridor\n2. Required login documents\n3. How to check an incident's status."
        
    return ChatResponse(reply=reply)
