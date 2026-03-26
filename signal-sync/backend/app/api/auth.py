from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.middleware.auth import create_access_token
from pydantic import BaseModel, field_validator
from typing import Optional
import re

router = APIRouter(prefix="/auth", tags=["auth"])


# -- Request / Response Models ------------------------------------------------

class RegisterRequest(BaseModel):
    firebase_uid: str
    email: str
    name: str
    aadhaar_number: str
    dl_number: str
    phone: Optional[str] = None

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar(cls, v):
        clean = re.sub(r"\s", "", v)
        if not re.fullmatch(r"\d{12}", clean):
            raise ValueError("Aadhaar must be exactly 12 digits")
        return clean

    @field_validator("dl_number")
    @classmethod
    def validate_dl(cls, v):
        if not v or not v.strip():
            raise ValueError("Driving License number is required")
        return v.strip().upper()


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None
    phone: Optional[str] = None


# -- Endpoints ----------------------------------------------------------------

@router.post("/register")
async def register_user(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with Aadhaar and DL details."""

    # Check if user already exists
    result = await db.execute(select(User).where(User.firebase_uid == req.firebase_uid))
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing record with new details
        existing.display_name = req.name
        existing.aadhaar_number = req.aadhaar_number
        existing.dl_number = req.dl_number
        if req.phone:
            existing.phone = req.phone
        await db.commit()
        return {"message": "User updated", "uid": req.firebase_uid}

    user = User(
        firebase_uid=req.firebase_uid,
        email=req.email,
        display_name=req.name,
        role=UserRole.PUBLIC_USER,
        aadhaar_number=req.aadhaar_number,
        dl_number=req.dl_number,
        phone=req.phone,
    )
    db.add(user)
    await db.commit()
    return {"message": "User registered", "uid": req.firebase_uid}


@router.get("/profile")
async def get_profile(uid: str, db: AsyncSession = Depends(get_db)):
    """Get user profile by firebase UID."""
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.display_name,
        "role": user.role.value if user.role else "PUBLIC_USER",
        "aadhaar_number": user.aadhaar_number[:4] + "****" + user.aadhaar_number[-4:] if user.aadhaar_number and len(user.aadhaar_number) == 12 else None,
        "dl_number": user.dl_number,
        "phone": user.phone,
    }


@router.put("/profile")
async def update_profile(req: ProfileUpdate, uid: str = None, db: AsyncSession = Depends(get_db)):
    """Update user profile fields."""
    if not uid:
        raise HTTPException(status_code=400, detail="uid query parameter required")

    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.name is not None:
        user.display_name = req.name
    if req.aadhaar_number is not None:
        clean = re.sub(r"\s", "", req.aadhaar_number)
        if not re.fullmatch(r"\d{12}", clean):
            raise HTTPException(status_code=400, detail="Aadhaar must be 12 digits")
        user.aadhaar_number = clean
    if req.dl_number is not None:
        user.dl_number = req.dl_number.strip().upper()
    if req.phone is not None:
        user.phone = req.phone

    await db.commit()
    return {"message": "Profile updated"}
