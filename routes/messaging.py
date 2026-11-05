from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/messages", tags=["Messaging"])

class MessagingSubsystem:
    def __init__(self):
        self.messages = []

    def send_message(self, sender_id: str, recipient_id: str, content: str):
        msg = {
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "content": content
        }
        self.messages.append(msg)
        return msg

    def get_messages_for_user(self, user_id: str):
        return [m for m in self.messages if m["recipient_id"] == user_id or m["sender_id"] == user_id]

    def send_match_notification(self, user_id: str, match_details: dict):
        content = f"Match found! You have been paired for ride {match_details.get('ride_id', 'N/A')}."
        return self.send_message(sender_id="SYSTEM", recipient_id=user_id, content=content)

# Instantiate the shared service
messaging_service = MessagingSubsystem()

class MessageCreate(BaseModel):
    sender_id: str
    recipient_id: str
    content: str

@router.post("/send")
def send_message(message: MessageCreate):
    res = messaging_service.send_message(
        sender_id=message.sender_id,
        recipient_id=message.recipient_id,
        content=message.content
    )
    return {"status": "success", "data": res}

@router.get("/{user_id}")
def get_messages(user_id: str):
    user_msgs = messaging_service.get_messages_for_user(user_id)
    return {"user_id": user_id, "messages": user_msgs}