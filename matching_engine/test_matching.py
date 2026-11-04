import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)

def test_match_triggers_notification():
    response = client.post("/api/matches/rank", json={
        "request": {"pickup_lat": 12.9716, "pickup_lng": 77.5946, "seats_needed": 1},
        "offers": [
            {"id": "offer_1", "driver_lat": 12.9720, "driver_lng": 77.5950, "available_seats": 2, "status": "ACTIVE"}
        ],
        "driver_id": "driver_01",
        "rider_id": "rider_01",
        "ride_id": "ride_999"
    })
    assert response.status_code == 200

    msg_response = client.get("/api/messages/rider_01")
    assert msg_response.status_code == 200
    messages = msg_response.json()["messages"]
    assert any("Match found" in m["content"] for m in messages)