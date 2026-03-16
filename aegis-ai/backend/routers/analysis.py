from fastapi import APIRouter
from models.schemas import AnalyzeTextRequest, AnalyzeTextResponse, AnalyzeBehaviourRequest, AnalyzeBehaviourResponse
from services.phishing_service import analyze_phishing_advanced
from services.hf_service import analyze_injection
from services.url_service import analyze_url
from services.behaviour_service import analyze_behaviour
from services.url_service import analyze_url

router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post("/phishing", response_model=AnalyzeTextResponse)
def handle_phishing(request: AnalyzeTextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    return analyze_phishing(request.text)


@router.post("/injection", response_model=AnalyzeTextResponse)
def handle_injection(request: AnalyzeTextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    return analyze_injection(request.text)

@router.post("/url", response_model=AnalyzeTextResponse)
def handle_url(request: AnalyzeTextRequest):
    return analyze_url(request.text)

@router.post("/behaviour", response_model=AnalyzeBehaviourResponse)
def handle_behaviour(request: AnalyzeBehaviourRequest):
    if not request.events:
        raise HTTPException(status_code=400, detail="Events list cannot be empty.")
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
    elif input_type == 'url':
        result = analyze_url(request.text)
        result_dict = result.dict() if hasattr(result, 'dict') else dict(result)
        result_dict['detected_as'] = 'url'
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
