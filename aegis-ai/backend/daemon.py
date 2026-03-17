"""
daemon.py — AEGIS.AI background daemon thread.

Runs as a daemon thread alongside the FastAPI server.
Every TICK_INTERVAL seconds it:
  1. Reads all active sessions from session_store
  2. Scores each session using the behaviour engine
  3. If score crosses ALERT_THRESHOLD and not already alerted:
     → Fires alert via WebSocket to admin dashboard
     → Marks session as alerted

In production this would be replaced by a proper task queue
(Celery + Redis) for multi-tenant horizontal scaling.
"""

import threading
import asyncio
from datetime import datetime
from services.behaviour_service import analyze_behaviour
from models.schemas import BehaviourEvent
import session_store
from session_store import ALERT_THRESHOLD

TICK_INTERVAL = 2  # seconds between scoring runs


def _score_session(user_id: str, session: dict) -> None:
    """Score a single session and update the store."""
    events_raw = session.get("events", [])
    if not events_raw:
        return

    # Convert raw dicts to BehaviourEvent models
    events = []
    for e in events_raw:
        try:
            events.append(BehaviourEvent(
                timestamp=e.get("timestamp", datetime.utcnow().strftime("%H:%M:%S")),
                action=e.get("action", ""),
                ip=e.get("ip", "0.0.0.0"),
            ))
        except Exception:
            continue

    if not events:
        return

    result = analyze_behaviour(events)
    session_store.update_session_score(
        user_id=user_id,
        score=result.threat_score,
        severity=result.severity,
        flagged_events=[e.dict() for e in result.flagged_events],
        verdict=result.verdict,
    )
    return result


async def _run_tick(loop, ws_manager) -> None:
    """One scoring tick — runs in the daemon thread's event loop."""
    sessions = session_store.get_all_sessions()
    for user_id, session in sessions.items():
        result = _score_session(user_id, session)
        if result is None:
            continue

        # Fire alert if threshold crossed and not already alerted
        if result.threat_score >= ALERT_THRESHOLD and not session_store.was_alerted(user_id):
            session_store.mark_alerted(user_id)
            alert_payload = {
                "type": "ALERT",
                "user_id": user_id,
                "threat_score": result.threat_score,
                "severity": result.severity,
                "verdict": result.verdict,
                "confidence": result.confidence,
                "flagged_events": [e.dict() for e in result.flagged_events],
                "recommended_action": result.recommended_action,
                "timestamp": datetime.utcnow().isoformat(),
            }
            # Broadcast to all connected admin dashboards
            await ws_manager.broadcast_all(alert_payload)
            print(f"[AEGIS DAEMON] 🚨 ALERT fired for user {user_id} "
                  f"— score: {result.threat_score} ({result.severity})")
        elif result.threat_score > 0:
            # Send live score update (no alert, just score update)
            update_payload = {
                "type": "SCORE_UPDATE",
                "user_id": user_id,
                "threat_score": result.threat_score,
                "severity": result.severity,
                "verdict": result.verdict,
                "confidence": result.confidence,
                "flagged_events": [e.dict() for e in result.flagged_events],
                "timestamp": datetime.utcnow().isoformat(),
            }
            await ws_manager.broadcast_all(update_payload)


def _daemon_loop(ws_manager) -> None:
    """Main daemon loop — runs in a background thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    print("[AEGIS DAEMON] Background scoring thread started")
    while True:
        try:
            loop.run_until_complete(_run_tick(loop, ws_manager))
        except Exception as e:
            print(f"[AEGIS DAEMON] Tick error: {e}")
        import time
        time.sleep(TICK_INTERVAL)


def start_daemon(ws_manager) -> threading.Thread:
    """Start the daemon thread. Call this once at app startup."""
    t = threading.Thread(
        target=_daemon_loop,
        args=(ws_manager,),
        daemon=True,  # dies when main process dies
        name="aegis-daemon",
    )
    t.start()
    return t