from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.vision import VisionAlertRequest, VisionAlertResponse
from app.models.intersection import SignalState
from app.services.signal_service import SignalService
from app.services.conflict_engine import ConflictEngine
from app.services.audit_service import AuditService
from app.config import settings
from app.middleware.auth import get_current_user
from app.models.user import User
import asyncio

router = APIRouter(prefix="/vision", tags=["vision / ML"])


@router.post("/alert", response_model=VisionAlertResponse)
async def vision_alert(
    req: VisionAlertRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Receive real-time YOLO detection events.
    Triggers emergency signal override if confidence  threshold
    AND no higher-priority corridor already owns the intersection.
    """
    # Confidence gate
    if req.confidence < settings.vision_confidence_threshold:
        return VisionAlertResponse(
            processed=False,
            action_taken="BELOW_THRESHOLD",
            intersection_id=req.intersection_id,
            new_signal_state="UNCHANGED",
        )

    # Conflict ownership check  don't override a green corridor
    owner = ConflictEngine.get_owner(req.intersection_id)
    current = await SignalService.get_state(req.intersection_id)
    if current.get("state") in ("GREEN_CORRIDOR", "OVERRIDE"):
        return VisionAlertResponse(
            processed=False,
            action_taken="ALREADY_ACTIVE",
            intersection_id=req.intersection_id,
            new_signal_state=current.get("state", "UNKNOWN"),
        )

    # Trigger async emergency sequence (yellow -> all-red -> green)
    asyncio.create_task(
        SignalService.emergency_override(req.intersection_id, req.vehicle_type)
    )

    await AuditService.log(db, None, None, "VISION_ALERT_TRIGGERED", {
        "intersection_id": req.intersection_id,
        "vehicle_type": req.vehicle_type,
        "confidence": req.confidence,
        "direction": req.direction,
        "camera_id": req.camera_id,
    })

    return VisionAlertResponse(
        processed=True,
        action_taken="OVERRIDE_TRIGGERED",
        intersection_id=req.intersection_id,
        new_signal_state=SignalState.OVERRIDE.value,
    )
