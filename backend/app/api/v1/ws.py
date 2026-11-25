from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.services.websocket_manager import ws_manager
from sqlalchemy.future import select
import logging

logger = logging.getLogger("websocket")
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)  # Policy violation
        return
        
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=1008)
        return
        
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
        user = user_res.scalar_one_or_none()
        if not user:
            await websocket.close(code=1008)
            return
        user_role = user.role.value
        
    await ws_manager.connect(websocket, user_id, user_role)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id, user_role)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket, user_id, user_role)
