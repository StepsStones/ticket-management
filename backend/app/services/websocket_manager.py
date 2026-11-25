from typing import Dict, List, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("websocket")

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Maps role -> set of active WebSockets for fast role-based broadcast
        self.role_connections: Dict[str, Set[WebSocket]] = {
            "SUPER_ADMIN": set(),
            "ADMIN": set(),
            "EMPLOYEE": set()
        }

    async def connect(self, websocket: WebSocket, user_id: str, role: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        if role in self.role_connections:
            self.role_connections[role].add(websocket)
        logger.info(f"WebSocket connected for user {user_id} ({role})")

    def disconnect(self, websocket: WebSocket, user_id: str, role: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        if role in self.role_connections:
            self.role_connections[role].discard(websocket)
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            dead_sockets = set()
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_connections[user_id].discard(dead)

    async def broadcast_to_roles(self, message: dict, roles: List[str]):
        targets: Set[WebSocket] = set()
        for role in roles:
            if role in self.role_connections:
                targets.update(self.role_connections[role])
        
        dead_sockets = set()
        for connection in targets:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                dead_sockets.add(connection)
        
        for dead in dead_sockets:
            for role_set in self.role_connections.values():
                role_set.discard(dead)

    async def broadcast_all(self, message: dict):
        dead_sockets = set()
        for user_sockets in self.active_connections.values():
            for connection in user_sockets:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_sockets.add(connection)
        for dead in dead_sockets:
            for user_sockets in self.active_connections.values():
                user_sockets.discard(dead)

ws_manager = ConnectionManager()
