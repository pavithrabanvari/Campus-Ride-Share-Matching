from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/messages", tags=["Messaging"])

class MessagingSubsystem:
    def __init__(self):
        self.messages = []
        self.conversations = {}

    def create_conversation(self, conversation_id: str, ride_id: str, driver_id: str, rider_id: str):
        conv = {
            "conversation_id": conversation_id,
            "ride_id": ride_id,
            "driver_id": driver_id,
            "rider_id": rider_id,
            "messages": []
        }
        self.conversations[conversation_id] = conv
        return conv

    def send_message(self, sender_id: str, recipient_id: str = None, content: str = "", conversation_id: str = None):
        if conversation_id and conversation_id in self.conversations:
            conv = self.conversations[conversation_id]
            if not recipient_id:
                recipient_id = conv["rider_id"] if sender_id == conv["driver_id"] else conv["driver_id"]

        msg = {
            "sender_id": sender_id,
            "recipient_id": recipient_id or "unknown",
            "content": content,
            "conversation_id": conversation_id
        }
        self.messages.append(msg)
        
        if conversation_id and conversation_id in self.conversations:
            self.conversations[conversation_id]["messages"].append(msg)
            
        return msg

    def get_messages(self, conversation_id: str):
        """Retrieve messages for a specific conversation ID."""
        if conversation_id in self.conversations:
            return self.conversations[conversation_id]["messages"]
        return [m for m in self.messages if m.get("conversation_id") == conversation_id]

    def get_messages_for_user(self, user_id: str):
        return [m for m in self.messages if m["recipient_id"] == user_id or m["sender_id"] == user_id]

    def send_match_notification(self, user_id: str, match_details: dict):
        content = f"Match found! You have been paired for ride {match_details.get('ride_id', 'N/A')}."
        return self.send_message(sender_id="SYSTEM", recipient_id=user_id, content=content)

# Global shared instance
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