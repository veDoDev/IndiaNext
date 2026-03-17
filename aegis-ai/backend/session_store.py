"""
session_store.py — In-memory session event store for AEGIS.AI daemon.

In production this would be replaced by Redis Streams for multi-tenant
horizontal scaling. For the hackathon demo, a thread-safe in-memory
dict gives identical behaviour for a single-node deployment.

Structure:
  sessions = {
    "user_id": {
      "events": [...],
      "threat_score": 0,
      "last_updated": timestamp,
      "alerted": False
    }
  }
"""

import threading
from datetime import datetime
from typing import Dict, List, Any

_lock = threading.Lock()

_sessions: Dict[str, Dict[str, Any]] = {}

ALERT_THRESHOLD = 75  # score above this fires an alert
MAX_EVENTS_PER_SESSION = 100  # cap to avoid memory bloat


def add_event(user_id: str, event: dict) -> None:
    with _lock:
        if user_id not in _sessions:
            _sessions[user_id] = {
                "events": [],
                "threat_score": 0,
                "severity": "LOW",
                "last_updated": datetime.utcnow().isoformat(),
                "alerted": False,
                "flagged_events": [],
            }
        session = _sessions[user_id]
        session["events"].append(event)
        # Keep only last N events
        if len(session["events"]) > MAX_EVENTS_PER_SESSION:
            session["events"] = session["events"][-MAX_EVENTS_PER_SESSION:]
        session["last_updated"] = datetime.utcnow().isoformat()


def get_session(user_id: str) -> dict:
    with _lock:
        return _sessions.get(user_id, {})


def get_all_sessions() -> dict:
    with _lock:
        return dict(_sessions)


def update_session_score(user_id: str, score: int, severity: str,
                         flagged_events: list, verdict: str) -> None:
    with _lock:
        if user_id in _sessions:
            _sessions[user_id]["threat_score"] = score
            _sessions[user_id]["severity"] = severity
            _sessions[user_id]["flagged_events"] = flagged_events
            _sessions[user_id]["verdict"] = verdict


def mark_alerted(user_id: str) -> None:
    with _lock:
        if user_id in _sessions:
            _sessions[user_id]["alerted"] = True


def was_alerted(user_id: str) -> bool:
    with _lock:
        return _sessions.get(user_id, {}).get("alerted", False)


def reset_session(user_id: str) -> None:
    with _lock:
        if user_id in _sessions:
            _sessions[user_id]["alerted"] = False
            _sessions[user_id]["threat_score"] = 0
            _sessions[user_id]["events"] = []
            _sessions[user_id]["flagged_events"] = []


def clear_all() -> None:
    with _lock:
        _sessions.clear()