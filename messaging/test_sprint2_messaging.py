import sys
import os

# Add root directory to path so 'main' can be imported correctly from anywhere
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_send_and_get_message():
    response = client.post("/api/messages/send", json={
        "sender_id": "user1",
        "recipient_id": "user2",
        "content": "Hello for Sprint 2!"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    get_resp = client.get("/api/messages/user2")
    assert get_resp.status_code == 200
    assert len(get_resp.json()["messages"]) > 0