from fastapi import APIRouter
from models.schemas import AnalyzeTextRequest, AnalyzeTextResponse, AnalyzeBehaviourRequest, AnalyzeBehaviourResponse
from services.hf_service import analyze_phishing, analyze_injection
from services.behaviour_service import analyze_behaviour

router = APIRouter(prefix="/analyze")

@router.post("/phishing", response_model=AnalyzeTextResponse)
def handle_phishing(request: AnalyzeTextRequest):
    return analyze_phishing(request.text)

@router.post("/injection", response_model=AnalyzeTextResponse)
def handle_injection(request: AnalyzeTextRequest):
    return analyze_injection(request.text)

@router.post("/behaviour", response_model=AnalyzeBehaviourResponse)
def handle_behaviour(request: AnalyzeBehaviourRequest):
    return analyze_behaviour(request.events)
