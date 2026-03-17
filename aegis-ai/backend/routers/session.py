"""
routers/session.py — Session event ingestion and WebSocket alerts.

Endpoints:
  POST /session/event          ← host website SDK sends events here
  POST /session/reset/{uid}    ← reset a session (demo use)
  GET  /session/{uid}          ← get current session state
  GET  /sdk/aegis.js           ← serves the JS SDK snippet
  WS   /ws/alerts/{client_key} ← admin dashboard connects here
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import session_store
from websocket_manager import manager

router = APIRouter(tags=["Daemon"])


# ── Schemas ───────────────────────────────────────────────────────────────

class SessionEvent(BaseModel):
    user_id: str
    timestamp: Optional[str] = None
    action: str
    ip: Optional[str] = "0.0.0.0"
    client_key: Optional[str] = "demo"


# ── Event ingestion ───────────────────────────────────────────────────────

@router.post("/session/event")
def ingest_event(event: SessionEvent):
    """
    Called by the host website SDK on every user action.
    Adds the event to the session buffer for daemon scoring.
    """
    ts = event.timestamp or datetime.utcnow().strftime("%H:%M:%S")
    session_store.add_event(event.user_id, {
        "timestamp": ts,
        "action": event.action,
        "ip": event.ip,
    })
    return {"status": "ok", "user_id": event.user_id, "timestamp": ts}


@router.get("/session/{user_id}")
def get_session(user_id: str):
    """Get current session state for a user."""
    s = session_store.get_session(user_id)
    if not s:
        return {"error": "Session not found"}
    return s


@router.post("/session/reset/{user_id}")
def reset_session(user_id: str):
    """Reset a session — clears score and alert flag."""
    session_store.reset_session(user_id)
    return {"status": "reset", "user_id": user_id}


@router.post("/session/clear")
def clear_all_sessions():
    """Clear all sessions — for demo reset."""
    session_store.clear_all()
    return {"status": "all sessions cleared"}


# ── WebSocket ─────────────────────────────────────────────────────────────

@router.websocket("/ws/alerts/{client_key}")
async def websocket_alerts(websocket: WebSocket, client_key: str):
    """
    Admin dashboard connects here to receive live alerts.
    Stays open — daemon pushes updates every tick.
    """
    await manager.connect(websocket, client_key)
    try:
        while True:
            # Keep connection alive — wait for client ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_key)


# ── JS SDK ────────────────────────────────────────────────────────────────

SDK_TEMPLATE = """
/* AEGIS.AI SDK v1.0 — Auto-capture user behaviour
 * Paste this script tag into your website <head>:
 * <script src="{base_url}/sdk/aegis.js" data-client-key="YOUR_KEY"></script>
 */
(function() {{
  var script = document.currentScript;
  var clientKey = script ? script.getAttribute('data-client-key') : 'demo';
  var baseUrl = '{base_url}';
  var userId = 'user_' + Math.random().toString(36).substr(2, 9);

  function send(action) {{
    fetch(baseUrl + '/session/event', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{
        user_id: userId,
        action: action,
        ip: '0.0.0.0',
        client_key: clientKey,
        timestamp: new Date().toTimeString().split(' ')[0]
      }})
    }}).catch(function() {{}});
  }}

  // Track page navigation
  window.addEventListener('popstate', function() {{
    send('View page ' + window.location.pathname);
  }});

  // Track form submissions (catches login attempts)
  document.addEventListener('submit', function(e) {{
    var form = e.target;
    send('Form submitted: ' + (form.id || form.action || 'unknown'));
  }});

  // Track fetch requests (catches API calls)
  var origFetch = window.fetch;
  window.fetch = function() {{
    var url = arguments[0];
    send('API call: ' + (typeof url === 'string' ? url.split('?')[0] : 'unknown'));
    return origFetch.apply(this, arguments);
  }};

  // Expose manual tracking for login events
  window.aegis = {{
    loginFailed: function(ip) {{ send('Login failed (Bad credentials)' + (ip ? ' from ' + ip : '')); }},
    loginSuccess: function(ip) {{ send('User logged in successfully' + (ip ? ' from ' + ip : '')); }},
    track: function(action) {{ send(action); }}
  }};

  send('SDK initialized — session started');
}})();
"""


@router.get("/sdk/aegis.js", response_class=PlainTextResponse)
def serve_sdk(request_url: str = ""):
    """Serves the AEGIS.AI JavaScript SDK."""
    import os
    base_url = os.getenv("RENDER_EXTERNAL_URL",
                         "https://aegis-ai-backend-dw9f.onrender.com")
    return PlainTextResponse(
        content=SDK_TEMPLATE.format(base_url=base_url),
        media_type="application/javascript",
    )