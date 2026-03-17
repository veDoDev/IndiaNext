from fastapi import APIRouter, HTTPException
from models.schemas import (
    AnalyzeTextRequest, AnalyzeTextResponse,
    AnalyzeBehaviourRequest, AnalyzeBehaviourResponse,
    AnalyzeURLRequest,
)
from services.hf_service import analyze_injection
from services.url_service import analyze_url
from services.behaviour_service import analyze_behaviour

router = APIRouter(prefix="/analyze", tags=["Analysis"])

# Support both phishing service versions
try:
    from services.phishing_service import analyze_phishing_advanced as analyze_phishing
except ImportError:
    from services.hf_service import analyze_phishing


@router.post("/phishing")
def handle_phishing(request: AnalyzeTextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    result = analyze_phishing_advanced(request.text)
    return result

@router.post("/injection", response_model=AnalyzeTextResponse)
def handle_injection(request: AnalyzeTextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    return analyze_injection(request.text)


@router.post("/url", response_model=AnalyzeTextResponse)
def handle_url(request: AnalyzeURLRequest):
    if not request.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    return analyze_url(request.url)


@router.post("/behaviour", response_model=AnalyzeBehaviourResponse)
def handle_behaviour(request: AnalyzeBehaviourRequest):
    if not request.events:
        raise HTTPException(status_code=400, detail="Events list cannot be empty.")
    return analyze_behaviour(request.events)
