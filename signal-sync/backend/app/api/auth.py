from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.middleware.auth import create_access_token
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

class AadhaarRequest(BaseModel):
    aadhaar_number: str

class AadhaarVerify(BaseModel):
    aadhaar_number: str
    otp: str
    role: UserRole

class DLUploadRequest(BaseModel):
    dl_number: str
    role: UserRole
    # In a real system we'd accept an UploadFile for the image. Simulating here.

@router.post("/login/aadhaar/request-otp")
async def request_aadhaar_otp(req: AadhaarRequest):
    """Simulate requesting an OTP for Aadhaar."""
    # In reality, this would call an external Aadhaar API.
    # Here we just pretend it succeeded and OTP is 123456
    return {"message": f"OTP sent to mobile linked with Aadhaar {req.aadhaar_number[-4:]} (Use 123456 for testing)"}

@router.post("/login/aadhaar/verify")
async def verify_aadhaar_otp(req: AadhaarVerify, db: AsyncSession = Depends(get_db)):
    """Verify OTP and issue a local JWT user token with specific role."""
    if req.otp != "123456":
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")
         
    # Mock finding or creating user in DB based on Aadhaar
    # We will use "aadhaar:{aadhaar_number}" as the pseudo-firebase_uid for local JWTs
    local_uid = f"aadhaar:{req.aadhaar_number}"
    
    result = await db.execute(select(User).where(User.firebase_uid == local_uid))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            firebase_uid=local_uid,
            email=f"{req.aadhaar_number}@aadhaar.local",
            display_name=f"Aadhaar User {req.aadhaar_number[-4:]}",
            role=req.role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Generate JWT
    token_data = {"uid": user.firebase_uid, "role": user.role.value}
    token = create_access_token(token_data)
    
    return {"access_token": token, "token_type": "bearer", "user": {"uid": user.firebase_uid, "role": user.role.value}}

@router.post("/login/dl/upload")
async def upload_dl(req: DLUploadRequest, db: AsyncSession = Depends(get_db)):
    """Simulate Document upload for Driving License verification."""
    # Simulation: accept immediately and provision
    local_uid = f"dl:{req.dl_number}"
    
    result = await db.execute(select(User).where(User.firebase_uid == local_uid))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            firebase_uid=local_uid,
            email=f"{req.dl_number}@dl.local",
            display_name=f"DL User {req.dl_number[-4:]}",
            role=req.role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Generate JWT
    token_data = {"uid": user.firebase_uid, "role": user.role.value}
    token = create_access_token(token_data)
    
    return {"access_token": token, "token_type": "bearer", "user": {"uid": user.firebase_uid, "role": user.role.value}}
