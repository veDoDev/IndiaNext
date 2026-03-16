from pydantic import BaseModel
from typing import List, Optional


class AnalyzeTextRequest(BaseModel):
    text: str


class AnalyzeURLRequest(BaseModel):
    url: str


class FlaggedPhrase(BaseModel):
    text: str
    reason: str
    level: str  # "red" | "amber"


class AnalyzeTextResponse(BaseModel):
    threat_score: int
    severity: str        # "LOW" | "MED" | "HIGH" | "CRIT"
    verdict: str         # "PHISHING"/"LEGIT"  or  "INJECTION"/"SAFE"
    confidence: float    # 0.0 – 1.0
    flagged_phrases: List[FlaggedPhrase]
    recommended_action: str


class BehaviourEvent(BaseModel):
    timestamp: str       # "HH:MM:SS"
    action: str
    ip: str


class AnalyzeBehaviourRequest(BaseModel):
    events: List[BehaviourEvent]


class FlaggedEvent(BaseModel):
    timestamp: str
    description: str
    severity: str        # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"


class AnalyzeBehaviourResponse(BaseModel):
    threat_score: int
    severity: str
    verdict: str         # "ANOMALY" | "NORMAL"
    confidence: float
    flagged_events: List[FlaggedEvent]
    recommended_action: str