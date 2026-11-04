from fastapi import APIRouter, HTTPException
from routes.messaging import messaging_service
from pydantic import BaseModel, Field
from typing import List, Optional
from matching_engine.scorer import rank_matches as compute_rankings  # Alias to avoid name collision

router = APIRouter(prefix="/api/matches", tags=["Matching Engine"])

class RideRequestPayload(BaseModel):
    pickup_lat: float
    pickup_lon: float
    dropoff_lat: float
    dropoff_lon: float
    desired_time_min: float

class RideOfferPayload(BaseModel):
    id: str
    driver_name: Optional[str] = "Student"
    pickup_lat: float
    pickup_lon: float
    dropoff_lat: float
    dropoff_lon: float
    departure_time_min: float
    available_seats: int
    status: Optional[str] = "active"
    pickup_name: Optional[str] = "Pickup"
    dropoff_name: Optional[str] = "Dropoff"

class MatchRankingPayload(BaseModel):
    request: RideRequestPayload
    offers: List[RideOfferPayload]
    max_time_window_min: Optional[float] = 30.0

@router.post("/rank")
def rank_matches_endpoint(payload: MatchRankingPayload):
    try:
        req_dict = payload.request.model_dump()
        offers_list = [offer.model_dump() for offer in payload.offers]
        
        # Call the actual scoring engine
        ranked_results = compute_rankings(
            request=req_dict,
            offers=offers_list,
            max_time_window_min=payload.max_time_window_min
        )
        
        # Trigger automated notifications for the top match if available
        if ranked_results:
            top_match = ranked_results[0]
            messaging_service.send_match_notification(user_id="driver_01", match_details=top_match)
            messaging_service.send_match_notification(user_id="rider_01", match_details=top_match)

        return {
            "status": "success",
            "count": len(ranked_results),
            "matches": ranked_results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))