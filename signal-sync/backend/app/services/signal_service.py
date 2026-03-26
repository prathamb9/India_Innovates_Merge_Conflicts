from datetime import datetime, timezone
from typing import Optional
from app.models.intersection import SignalState
from app.redis_client import redis_set, redis_get, signal_key
from app.websocket.manager import ws_manager
import asyncio
import structlog

log = structlog.get_logger(__name__)


class SignalService:

    @staticmethod
    async def _save_state(intersection_id: int, state: dict) -> None:
        """Persist signal state to Redis and broadcast via WebSocket."""
        await redis_set(signal_key(intersection_id), state)
        await ws_manager.broadcast_intersection(intersection_id, {
            "event": "SIGNAL_UPDATED",
            "intersection_id": intersection_id,
            **state,
        })

    @staticmethod
    async def get_state(intersection_id: int) -> dict:
        state = await redis_get(signal_key(intersection_id))
        if state is None:
            return {
                "intersection_id": intersection_id,
                "state": SignalState.NORMAL,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        return state

    @staticmethod
    async def override(
        intersection_id: int,
        new_state: SignalState,
        green_duration_sec: int = 30,
        reason: str = "manual_override",
        corridor_id: Optional[str] = None,
    ) -> dict:
        state = {
            "intersection_id": intersection_id,
            "state": new_state.value,
            "green_duration_sec": green_duration_sec,
            "reason": reason,
            "corridor_id": corridor_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await SignalService._save_state(intersection_id, state)
        log.info("Signal overridden", intersection_id=intersection_id, state=new_state.value, reason=reason)
        return state

    @staticmethod
    async def schedule_green_corridor(
        intersection_id: int,
        corridor_id: str,
        offset_sec: int,
        duration_sec: int,
    ) -> None:
        """Schedule a timed GREEN_CORRIDOR phase (non-blocking using asyncio task)."""
        async def _run():
            if offset_sec > 0:
                await asyncio.sleep(offset_sec)
            # Set GREEN_CORRIDOR
            await SignalService.override(
                intersection_id=intersection_id,
                new_state=SignalState.GREEN_CORRIDOR,
                green_duration_sec=duration_sec,
                reason="green_corridor",
                corridor_id=corridor_id,
            )
            # After duration, restore AI_DYNAMIC
            await asyncio.sleep(duration_sec)
            current = await SignalService.get_state(intersection_id)
            if current.get("corridor_id") == corridor_id:
                await SignalService.restore_ai_dynamic(intersection_id)

        asyncio.create_task(_run())

    @staticmethod
    async def emergency_override(intersection_id: int, vehicle_type: str) -> dict:
        """Triggered by YOLO detection  3 s yellow -> all-red -> green for emergency lane."""
        # Yellow clearance
        await SignalService.override(intersection_id, SignalState.OVERRIDE, 3, "emergency_yellow")
        await asyncio.sleep(3)
        # All-red safety buffer
        state = await SignalService.override(intersection_id, SignalState.OVERRIDE, 3, "emergency_all_red")
        await asyncio.sleep(3)
        # Green for emergency
        state = await SignalService.override(intersection_id, SignalState.OVERRIDE, 45,
                                              f"emergency_{vehicle_type}")
        await ws_manager.broadcast_all({
            "event": "EMERGENCY_DETECTED",
            "intersection_id": intersection_id,
            "vehicle_type": vehicle_type,
        })
        return state

    @staticmethod
    async def restore_ai_dynamic(intersection_id: int) -> dict:
        return await SignalService.override(
            intersection_id, SignalState.AI_DYNAMIC, reason="restored"
        )
