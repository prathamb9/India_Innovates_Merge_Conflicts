from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
from app.models.incident import IncidentStatus, VehicleType, StatusPhase

class IncidentVehicleCreate(BaseModel):
    vehicle_type: VehicleType
    details: Optional[Dict[str, Any]] = None

class IncidentCreate(BaseModel):
    cad_incident_id: Optional[str] = None
    dispatch_ticket: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    vehicles: List[IncidentVehicleCreate]

class IncidentVehicleOut(BaseModel):
    vehicle_id: str
    incident_id: str
    driver_id: str
    vehicle_type: VehicleType
    current_phase: StatusPhase
    details: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class IncidentOut(BaseModel):
    id: str
    firebase_uid: str
    cad_incident_id: Optional[str]
    dispatch_ticket: Optional[str]
    is_verified: bool
    status: IncidentStatus
    location: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    vehicles: List[IncidentVehicleOut]

    class Config:
        from_attributes = True

class VerifyIncidentResponse(BaseModel):
    incident_id: str
    status: str
    
class StatusUpdateRequest(BaseModel):
    vehicle_id: str
    new_phase: StatusPhase
