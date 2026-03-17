"""
websocket_manager.py — WebSocket connection manager for AEGIS.AI daemon alerts.

Maintains a registry of connected admin clients.
When the daemon fires an alert, it broadcasts to all connected clients
for that tenant/client_key.
"""

from fastapi import WebSocket
from typing import Dict, List
import json


class WebSocketManager:
    def __init__(self):
        # client_key -> list of active WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_key: str) -> None:
        await websocket.accept()
        if client_key not in self._connections:
            self._connections[client_key] = []
        self._connections[client_key].append(websocket)
        print(f"[AEGIS WS] Admin connected for key: {client_key} "
              f"({len(self._connections[client_key])} total)")

    def disconnect(self, websocket: WebSocket, client_key: str) -> None:
        if client_key in self._connections:
            self._connections[client_key] = [
                ws for ws in self._connections[client_key] if ws != websocket
            ]
        print(f"[AEGIS WS] Admin disconnected for key: {client_key}")

    async def broadcast(self, client_key: str, payload: dict) -> None:
        """Send alert payload to all admin dashboards watching this client_key."""
        if client_key not in self._connections:
            return
        dead = []
        for ws in self._connections[client_key]:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        for ws in dead:
            self._connections[client_key].remove(ws)

    async def broadcast_all(self, payload: dict) -> None:
        """Broadcast to ALL connected admin clients (used for demo mode)."""
        for client_key in list(self._connections.keys()):
            await self.broadcast(client_key, payload)


# Singleton instance shared across the app
manager = WebSocketManager()