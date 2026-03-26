from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_dispatcher
from app.models.user import User
from app.schemas.corridor import CorridorCreateRequest, CorridorStartRequest, CorridorStopRequest, CorridorOut
from app.services.corridor_service import CorridorService

router = APIRouter(prefix="/corridor", tags=["corridor"])


@router.post("/create", response_model=CorridorOut, status_code=status.HTTP_201_CREATED)
async def create_corridor(
    req: CorridorCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_dispatcher),
):
    """Create a new corridor (PENDING state). Requires DISPATCHER role or higher."""
    try:
        corridor = await CorridorService.create(req, user, db)
        return corridor
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/start", response_model=CorridorOut)
async def start_corridor(
    req: CorridorStartRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_dispatcher),
):
    """Activate a corridor  schedules green phases and begins tracking."""
    try:
        corridor = await CorridorService.start(req.corridor_id, user, db)
        return corridor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stop", response_model=CorridorOut)
async def stop_corridor(
    req: CorridorStopRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_dispatcher),
):
    """Terminate an active corridor and restore all signals to AI_DYNAMIC."""
    try:
        corridor = await CorridorService.stop(req.corridor_id, req.reason, user, db)
        return corridor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{corridor_id}", response_model=CorridorOut)
async def get_corridor(
    corridor_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Fetch corridor details  any authenticated user."""
    corridor = await CorridorService.get(corridor_id, db)
    if not corridor:
        raise HTTPException(status_code=404, detail="Corridor not found")
    return corridor
