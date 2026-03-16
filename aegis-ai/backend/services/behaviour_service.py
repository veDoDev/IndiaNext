from typing import List
from datetime import datetime
from models.schemas import BehaviourEvent, AnalyzeBehaviourResponse, FlaggedEvent

def get_severity_from_score(score: int) -> str:
    if score <= 25: return "LOW"
    if score <= 50: return "MED"
    if score <= 75: return "HIGH"
    return "CRIT"

def analyze_behaviour(events: List[BehaviourEvent]) -> AnalyzeBehaviourResponse:
    score = 0
    flagged_events = []
    
    if not events:
        return AnalyzeBehaviourResponse(
            threat_score=0,
            severity="LOW",
            verdict="NORMAL",
            confidence=1.0,
            flagged_events=[],
            recommended_action="No events to analyze."
        )

    # Sort events by time
    try:
        sorted_events = sorted(events, key=lambda e: datetime.strptime(e.timestamp, "%H:%M:%S"))
    except Exception:
        sorted_events = events

    failed_logins = []
    successful_login_after_fail = False
    
    ip_history = set()
    pages_visited = 0
    start_time = None
    last_time = None

    for i, event in enumerate(sorted_events):
        action_lower = event.action.lower()
        ip = event.ip
        
        try:
            current_time = datetime.strptime(event.timestamp, "%H:%M:%S")
        except Exception:
            current_time = datetime.now()

        # Check unknown IP
        # Assuming first event IP is "known", others might be unknown if they differ
        if i == 0:
            ip_history.add(ip)
        else:
            if ip not in ip_history:
                score += 10
                ip_history.add(ip)
                flagged_events.append(FlaggedEvent(timestamp=event.timestamp, description=f"Access from unknown IP: {ip}", severity="MEDIUM"))

        # Check failed logins
        if "login failed" in action_lower or "failed login" in action_lower:
            failed_logins.append(current_time)
            
            # Check 3+ failed logins within 2 mins
            recent_fails = [t for t in failed_logins if (current_time - t).total_seconds() <= 120]
            if len(recent_fails) == 3:
                score += 35
                flagged_events.append(FlaggedEvent(timestamp=event.timestamp, description="3+ failed logins within 2 minutes.", severity="HIGH"))
        
        # Check successful login after fail
        if "login success" in action_lower or "successful login" in action_lower:
            recent_fails = [t for t in failed_logins if (current_time - t).total_seconds() <= 120]
            if len(recent_fails) > 0:
                score += 20
                flagged_events.append(FlaggedEvent(timestamp=event.timestamp, description="Successful login immediately after failed attempts.", severity="HIGH"))
                
        # Access between 10PM - 6AM
        if current_time.hour >= 22 or current_time.hour < 6:
            score += 15
            flagged_events.append(FlaggedEvent(timestamp=event.timestamp, description="Access during non-business hours (10 PM - 6 AM).", severity="MEDIUM"))
            
        # Bulk data export
        if "export" in action_lower and ("1000 records" in action_lower or "bulk" in action_lower):
            score += 20
            flagged_events.append(FlaggedEvent(timestamp=event.timestamp, description="Bulk data export detected.", severity="MEDIUM"))
            
        # Page traversal
        if "view page" in action_lower or "visit" in action_lower:
            if start_time is None:
                start_time = current_time
            pages_visited += 1
            last_time = current_time

    if start_time and last_time and (last_time - start_time).total_seconds() <= 60:
        if pages_visited > 20:
            score += 25
            flagged_events.append(FlaggedEvent(timestamp=last_time.strftime("%H:%M:%S"), description="High speed page traversal (>20 pages/min).", severity="HIGH"))


    score = min(score, 100)
    severity = get_severity_from_score(score)
    verdict = "ANOMALY" if score > 50 else "NORMAL"
    
    # Create action
    if verdict == "ANOMALY":
        action = "Force session invalidation. Require MFA on next login and temporary block IP if severity is critical."
    else:
        action = "User behaviour seems normal. No immediate action required."

    # If score is > 0 and no flagged events (should be rare), add generic
    if score > 0 and not flagged_events:
        flagged_events.append(FlaggedEvent(timestamp=events[-1].timestamp, description="Suspicious pattern detected across events.", severity="LOW"))

    return AnalyzeBehaviourResponse(
        threat_score=score,
        severity=severity,
        verdict=verdict,
        confidence=0.95,  # Rule engine has high confidence
        flagged_events=flagged_events,
        recommended_action=action
    )
