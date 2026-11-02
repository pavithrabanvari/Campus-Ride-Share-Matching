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