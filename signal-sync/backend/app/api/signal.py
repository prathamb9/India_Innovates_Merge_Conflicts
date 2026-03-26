from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.models.intersection import SignalState
from app.schemas.signal import SignalOverrideRequest, SignalScheduleRequest, SignalStateOut
from app.services.signal_service import SignalService
from app.services.conflict_engine import ConflictEngine
from app.services.audit_service import AuditService

router = APIRouter(prefix="/signal", tags=["signal"])


@router.post("/override", response_model=SignalStateOut)
async def override_signal(
    req: SignalOverrideRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Admin-level override of a signal state.
    Respects conflict ownership  if a higher-priority corridor owns this
    intersection, the override is rejected.
    """
    owner = ConflictEngine.get_owner(req.intersection_id)
    if owner and req.new_state != SignalState.GREEN_CORRIDOR:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Intersection is locked by corridor {owner}. Use corridor API to manage.",
        )
    state = await SignalService.override(
        req.intersection_id, req.new_state, req.green_duration_sec, req.reason
    )
    await AuditService.log(db, user.firebase_uid, None, "SIGNAL_OVERRIDE", {
        "intersection_id": req.intersection_id,
        "new_state": req.new_state.value,
        "reason": req.reason,
    })
    return state


@router.post("/schedule", response_model=dict)
async def schedule_signal(
    req: SignalScheduleRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Schedule a future green-corridor phase for a specific intersection."""
    await SignalService.schedule_green_corridor(
        intersection_id=req.intersection_id,
        corridor_id=req.corridor_id,
        offset_sec=req.green_start_offset_sec,
        duration_sec=req.green_duration_sec,
    )
    await AuditService.log(db, user.firebase_uid, req.corridor_id, "SIGNAL_SCHEDULED", {
        "intersection_id": req.intersection_id,
        "offset_sec": req.green_start_offset_sec,
    })
    return {"scheduled": True, "intersection_id": req.intersection_id}


@router.get("/{intersection_id}", response_model=SignalStateOut)
async def get_signal(
    intersection_id: int,
    user: User = Depends(get_current_user),
):
    """Read current signal state from Redis (sub-millisecond)."""
    state = await SignalService.get_state(intersection_id)
    return state
