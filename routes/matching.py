from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from matching_engine.scorer import rank_matches

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
def get_ranked_matches(payload: MatchRankingPayload):
    try:
        req_dict = payload.request.model_dump()
        offers_list = [offer.model_dump() for offer in payload.offers]
        
        ranked_results = rank_matches(
            request=req_dict,
            offers=offers_list,
            max_time_window_min=payload.max_time_window_min
        )
        
        return {
            "status": "success",
            "count": len(ranked_results),
            "matches": ranked_results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
