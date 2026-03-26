import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Enum, DateTime, Float, Integer,
    Boolean, func, JSON, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    PUBLIC_USER = "PUBLIC_USER"
    DISPATCHER = "DISPATCHER"
    ADMIN = "ADMIN"
    VVIP_AUTHORITY = "VVIP_AUTHORITY"
    AMBULANCE_DRIVER = "AMBULANCE_DRIVER"
    FIRE_TRUCK_OPERATOR = "FIRE_TRUCK_OPERATOR"
    VVIP_OPERATOR = "VVIP_OPERATOR"


ROLE_LEVEL: dict[UserRole, int] = {
    UserRole.PUBLIC_USER: 0,
    UserRole.AMBULANCE_DRIVER: 1,
    UserRole.FIRE_TRUCK_OPERATOR: 1,
    UserRole.VVIP_OPERATOR: 1,
    UserRole.DISPATCHER: 2,
    UserRole.VVIP_AUTHORITY: 3,
    UserRole.ADMIN: 4,
}


class User(Base):
    __tablename__ = "users"

    firebase_uid = Column(String(128), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255))
    phone = Column(String(20), nullable=True)
    aadhaar_number = Column(String(12), nullable=True)
    dl_number = Column(String(50), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PUBLIC_USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())

    corridors = relationship("Corridor", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")
