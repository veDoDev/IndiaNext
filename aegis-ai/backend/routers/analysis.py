from fastapi import APIRouter
from models.schemas import AnalyzeTextRequest, AnalyzeTextResponse, AnalyzeBehaviourRequest, AnalyzeBehaviourResponse
from services.phishing_service import analyze_phishing_advanced
from services.hf_service import analyze_injection
from services.behaviour_service import analyze_behaviour
from services.auto_detect import detect_input_type
from pydantic import BaseModel

router = APIRouter(prefix="/analyze")

class AutoAnalyzeRequest(BaseModel):
    text: str

@router.post("/phishing")
def handle_phishing(request: AnalyzeTextRequest):
    result = analyze_phishing_advanced(request.text)
    return result

@router.post("/injection", response_model=AnalyzeTextResponse)
def handle_injection(request: AnalyzeTextRequest):
    return analyze_injection(request.text)

@router.post("/behaviour", response_model=AnalyzeBehaviourResponse)
def handle_behaviour(request: AnalyzeBehaviourRequest):
    return analyze_behaviour(request.events)

@router.post("/auto")
def handle_auto(request: AutoAnalyzeRequest):
    """Auto-detect input type and route to appropriate analyzer."""
    input_type = detect_input_type(request.text)
    
    if input_type == 'phishing':
        result = analyze_phishing_advanced(request.text)
        result['detected_as'] = 'phishing'
        return result
    elif input_type == 'injection':
        result = analyze_injection(request.text)
        result_dict = result.dict() if hasattr(result, 'dict') else dict(result)
        result_dict['detected_as'] = 'injection'
        return result_dict
    else:  # behaviour
        import json
        try:
            events_data = json.loads(request.text)
            from models.schemas import BehaviourEvent
            events = [BehaviourEvent(**e) for e in events_data]
            result = analyse_behaviour_behaviour(events)
            result_dict = result.dict() if hasattr(result, 'dict') else dict(result)
            result_dict['detected_as'] = 'behaviour'
            return result_dict
        except Exception:
            result = analyze_injection(request.text)
            result_dict = result.dict() if hasattr(result, 'dict') else dict(result)
            result_dict['detected_as'] = 'injection'
            return result_dict
