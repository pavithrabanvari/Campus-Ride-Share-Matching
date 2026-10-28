class MessagingSubsystem:

  def __init__(self):
    # Store conversations in memory (dictionary mapping conversation_id to details)
    self.conversations = {}

  def create_conversation(self, conversation_id, ride_id, driver_id, rider_id):
    """Creates a new conversation thread between a driver and a rider for a specific ride."""
    if conversation_id not in self.conversations:
      self.conversations[conversation_id] = {
          "ride_id": ride_id,
          "driver_id": driver_id,
          "rider_id": rider_id,
          "messages": [],
      }
    return self.conversations[conversation_id]

  def send_message(self, conversation_id, sender_id, content):
    """Sends a message within an existing conversation thread."""
    if conversation_id not in self.conversations:
      raise ValueError("Conversation does not exist.")

    if not content.strip():
      raise ValueError("Message content cannot be empty.")

    message = {"sender_id": sender_id, "content": content}
    self.conversations[conversation_id]["messages"].append(message)
    return message

  def get_messages(self, conversation_id):
    """Retrieves all messages for a specific conversation thread."""
    if conversation_id not in self.conversations:
      return []
    return self.conversations[conversation_id]["messages"]