"""
WebSocket connection manager.
Tracks connections grouped by:
  - intersection_id  (for signal + traffic updates)
  - corridor_id      (for corridor progress)
  - "_all"           (for emergency broadcasts)
"""
import json
from typing import Dict, List, Set
from fastapi import WebSocket
import structlog

log = structlog.get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        # room_key -> set of active WebSocket connections
        self._rooms: Dict[str, Set[WebSocket]] = {}

    def _room(self, key: str) -> Set[WebSocket]:
        if key not in self._rooms:
            self._rooms[key] = set()
        return self._rooms[key]

    async def connect(self, ws: WebSocket, room: str) -> None:
        await ws.accept()
        self._room(room).add(ws)
        log.debug("WS connected", room=room, total=len(self._room(room)))

    def disconnect(self, ws: WebSocket, room: str) -> None:
        self._room(room).discard(ws)
        log.debug("WS disconnected", room=room, remaining=len(self._room(room)))

    async def _send(self, ws: WebSocket, payload: dict, room: str) -> None:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            self.disconnect(ws, room)

    async def broadcast_intersection(self, intersection_id: int, payload: dict) -> None:
        room = f"intersection:{intersection_id}"
        dead = set()
        for ws in list(self._room(room)):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        self._room(room).difference_update(dead)
        # Also send to _all
        await self.broadcast_all(payload)

    async def broadcast_corridor(self, corridor_id: str, payload: dict) -> None:
        room = f"corridor:{corridor_id}"
        dead = set()
        for ws in list(self._room(room)):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        self._room(room).difference_update(dead)
        await self.broadcast_all(payload)

    async def broadcast_all(self, payload: dict) -> None:
        room = "_all"
        dead = set()
        for ws in list(self._room(room)):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        self._room(room).difference_update(dead)


# Module-level singleton
ws_manager = ConnectionManager()
