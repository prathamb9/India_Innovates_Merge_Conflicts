from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.incident import Incident, IncidentVehicle, IncidentStatus
from app.schemas.incident import IncidentCreate, IncidentOut, VerifyIncidentResponse, StatusUpdateRequest
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/incident", tags=["incident"])

@router.post("/", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
async def create_incident(
    req: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new incident with multiple vehicles."""
    verified = False
    # Mock Verification Layer
    if req.cad_incident_id and req.cad_incident_id.startswith("CAD"):
        verified = True
    elif req.dispatch_ticket and req.dispatch_ticket.startswith("DT"):
        verified = True
        
    incident = Incident(
        firebase_uid=user.firebase_uid,
        cad_incident_id=req.cad_incident_id,
        dispatch_ticket=req.dispatch_ticket,
        is_verified=verified,
        status=IncidentStatus.PENDING,
        location=req.location
    )
    db.add(incident)
    await db.flush() # To get incident.id
    
    for v_req in req.vehicles:
        vehicle = IncidentVehicle(
            incident_id=incident.id,
            driver_id=user.firebase_uid, # For now, creator is driver
            vehicle_type=v_req.vehicle_type,
            details=v_req.details
        )
        db.add(vehicle)
        
    await db.commit()
    
    # Reload with relations
    result = await db.execute(
        select(Incident).options(selectinload(Incident.vehicles)).where(Incident.id == incident.id)
    )
    fresh_incident = result.scalar_one()
    
    # Notify WebSocket 
    await ws_manager.broadcast("_all", {"type": "INCIDENT_CREATED", "incident_id": fresh_incident.id})
    return fresh_incident

@router.get("/verify/{incident_id_or_ticket}", response_model=VerifyIncidentResponse)
async def verify_incident(
    incident_id_or_ticket: str,
    db: AsyncSession = Depends(get_db)
):
    """Check Verification Layer for CAD or Dispatch Ticket."""
    # Simulate DB lookup or external API call
    if incident_id_or_ticket.startswith("CAD") or incident_id_or_ticket.startswith("DT"):
        status_val = "ACTIVE"
    else:
        status_val = "INVALID"
        
    # Check DB for existing incident
    result = await db.execute(
        select(Incident).where(
            (Incident.cad_incident_id == incident_id_or_ticket) | 
            (Incident.dispatch_ticket == incident_id_or_ticket)
        )
    )
    db_incident = result.scalar_one_or_none()
    if db_incident and db_incident.status != IncidentStatus.INVALID:
         status_val = "ACTIVE"
         
    return VerifyIncidentResponse(incident_id=incident_id_or_ticket, status=status_val)


@router.patch("/vehicle/status/{vehicle_id}", response_model=IncidentOut)
async def update_vehicle_status(
    vehicle_id: str,
    req: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update vehicle phase (A/B) and broadcast via WebSocket."""
    result = await db.execute(select(IncidentVehicle).where(IncidentVehicle.vehicle_id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    vehicle.current_phase = req.new_phase
    incident_id = vehicle.incident_id
    await db.commit()
    
    # Reload full incident to return and broadcast
    i_result = await db.execute(
        select(Incident).options(selectinload(Incident.vehicles)).where(Incident.id == incident_id)
    )
    incident = i_result.scalar_one()
    
    await ws_manager.broadcast_to_room(f"incident:{incident.id}", {
        "type": "VEHICLE_STATUS_UPDATED", 
        "vehicle_id": vehicle_id, 
        "new_phase": req.new_phase.value
    })
    
    return incident

@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Fetch incident details."""
    result = await db.execute(
        select(Incident).options(selectinload(Incident.vehicles)).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
