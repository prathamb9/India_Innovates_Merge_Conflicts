from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/intersection/{intersection_id}")
async def ws_intersection(ws: WebSocket, intersection_id: int):
    """Subscribe to live signal + traffic updates for one intersection."""
    room = f"intersection:{intersection_id}"
    await ws_manager.connect(ws, room)
    try:
        while True:
            # Keep alive  client can ping, we echo
            data = await ws.receive_text()
            await ws.send_text(data)
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, room)


@router.websocket("/corridor/{corridor_id}")
async def ws_corridor(ws: WebSocket, corridor_id: str):
    """Subscribe to progress events for a specific corridor."""
    room = f"corridor:{corridor_id}"
    await ws_manager.connect(ws, room)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, room)


@router.websocket("/alerts")
async def ws_alerts(ws: WebSocket):
    """Subscribe to all system-wide emergency alerts."""
    room = "_all"
    await ws_manager.connect(ws, room)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, room)

@router.websocket("/incident/{incident_id}")
async def ws_incident(ws: WebSocket, incident_id: str):
    """Subscribe to progress and status events for a specific incident."""
    room = f"incident:{incident_id}"
    await ws_manager.connect(ws, room)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, room)
