import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])


class ProfileOut(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    display_name: Optional[str] = None

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar(cls, v):
        if v is not None and v != "":
            cleaned = re.sub(r"\s", "", v)
            if not re.match(r"^\d{12}$", cleaned):
                raise ValueError("Aadhaar must be exactly 12 digits")
            return cleaned
        return v

    @field_validator("dl_number")
    @classmethod
    def validate_dl(cls, v):
        if v is not None and v != "":
            cleaned = v.strip().upper()
            if len(cleaned) < 5:
                raise ValueError("Invalid Driving License number")
            return cleaned
        return v


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: User = Depends(get_current_user)):
    """Return the authenticated user's full profile."""
    return ProfileOut(
        uid=user.firebase_uid,
        email=user.email,
        display_name=user.display_name,
        phone=user.phone,
        aadhaar_number=user.aadhaar_number,
        dl_number=user.dl_number,
        vehicle_type=user.vehicle_type,
        vehicle_number=user.vehicle_number,
        role=user.role.value,
    )


@router.put("/profile", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's profile fields."""
    if body.phone is not None:
        user.phone = body.phone or None
    if body.aadhaar_number is not None:
        user.aadhaar_number = body.aadhaar_number or None
    if body.dl_number is not None:
        user.dl_number = body.dl_number or None
    if body.vehicle_type is not None:
        user.vehicle_type = body.vehicle_type or None
    if body.vehicle_number is not None:
        user.vehicle_number = body.vehicle_number.strip().upper() if body.vehicle_number else None
    if body.display_name is not None:
        user.display_name = body.display_name or user.display_name

    db.add(user)
    await db.flush()

    return ProfileOut(
        uid=user.firebase_uid,
        email=user.email,
        display_name=user.display_name,
        phone=user.phone,
        aadhaar_number=user.aadhaar_number,
        dl_number=user.dl_number,
        vehicle_type=user.vehicle_type,
        vehicle_number=user.vehicle_number,
        role=user.role.value,
    )
