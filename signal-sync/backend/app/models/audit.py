import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey,
    JSON, func, Integer
)
from sqlalchemy.orm import relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = Column(String(128), ForeignKey("users.firebase_uid"), nullable=True)
    corridor_id = Column(String(36), ForeignKey("corridors.id"), nullable=True)
    action = Column(String(100), nullable=False)   # e.g. CORRIDOR_CREATED, SIGNAL_OVERRIDE
    detail = Column(JSON, default=dict)            # structured payload
    ip_address = Column(String(64))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
    corridor = relationship("Corridor", back_populates="audit_logs")


class TrafficLog(Base):
    """Persisted traffic snapshot for analytics."""
    __tablename__ = "traffic_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    intersection_id = Column(Integer, ForeignKey("intersections.id"), nullable=False)
    density_pct = Column(Integer, nullable=False)   # 0100
    vehicle_count = Column(Integer, default=0)
    signal_state = Column(String(30))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
