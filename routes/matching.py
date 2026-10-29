# routes/matching.py
from fastapi import APIRouter, HTTPException
from matching_engine.scorer import rank_matches

router = APIRouter(prefix="/api/matches", tags=["Matching"])

@router.post("/rank")
def get_ranked_matches(payload: dict):
    """
    Returns ranked ride offers compatible with the student's request (FR-12, FR-13).
    Expects payload format: {"request": {...}, "offers": [...]}
    """
    try:
        request_data = payload.get("request", {})
        available_offers = payload.get("offers", [])

        results = rank_matches(request_data, available_offers)
        return {"status": "success", "matches": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))