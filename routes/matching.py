from fastapi import APIRouter
from routes.messaging import messaging_service

router = APIRouter(prefix="/api/matches", tags=["Matching"])

@router.post("/rank")
def rank_matches(payload: dict):
    # Process matching / ranking logic
    match_result = {"ride_id": "ride_999", "status": "matched"}
    
    # Trigger automated notification if offers/requests are processed
    messaging_service.send_match_notification(user_id="driver_01", match_details=match_result)
    messaging_service.send_match_notification(user_id="rider_01", match_details=match_result)

    return {"status": "success", "ranked_matches": [match_result]}