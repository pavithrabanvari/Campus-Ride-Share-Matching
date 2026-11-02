from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/messages", tags=["Messaging"])

# In-memory storage for messages
message_db = []

class MessageCreate(BaseModel):
    sender_id: str
    recipient_id: str
    content: str

@router.post("/send")
def send_message(message: MessageCreate):
    message_db.append(message.model_dump())
    return {"status": "success", "message": "Message sent successfully", "data": message}

@router.get("/{user_id}")
def get_messages(user_id: str):
    user_messages = [m for m in message_db if m["recipient_id"] == user_id or m["sender_id"] == user_id]
    return {"user_id": user_id, "messages": user_messages}