import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Enum, DateTime, ForeignKey, func, Integer, Boolean, Float, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class IncidentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    INVALID = "INVALID"

class VehicleType(str, enum.Enum):
    AMBULANCE = "AMBULANCE"
    FIRE_TRUCK = "FIRE_TRUCK"
    VVIP = "VVIP"

class StatusPhase(str, enum.Enum):
    PHASE_A = "PHASE_A" # Going to pickup/incident
    PHASE_B = "PHASE_B" # Transporting/return (Higher Priority)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = Column(String(128), ForeignKey("users.firebase_uid"), nullable=False)
    
    # Verification Layer fields
    cad_incident_id = Column(String(100), nullable=True)     # For fire trucks
    dispatch_ticket = Column(String(100), nullable=True)     # For ambulances
    is_verified = Column(Boolean, default=False)
    
    # Standard metadata
    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Shared Location metadata if applicable
    location = Column(JSON, nullable=True) 

    creator = relationship("User", backref="incidents")
    vehicles = relationship("IncidentVehicle", back_populates="incident", cascade="all, delete-orphan")


class IncidentVehicle(Base):
    __tablename__ = "incident_vehicles"

    vehicle_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    driver_id = Column(String(128), ForeignKey("users.firebase_uid"), nullable=False)
    
    vehicle_type = Column(Enum(VehicleType), nullable=False)
    
    # Status Tracking Phase
    current_phase = Column(Enum(StatusPhase), nullable=False, default=StatusPhase.PHASE_A)
    
    # Dynamic form fields could be stored here or via relations
    details = Column(JSON, nullable=True) # E.g., patient severity, fire type, vvip level
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    incident = relationship("Incident", back_populates="vehicles")
    driver = relationship("User", backref="driven_vehicles")
