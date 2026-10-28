from messaging import MessagingSubsystem


def test_messaging_workflow():
  # Initialize subsystem
  chat_system = MessagingSubsystem()

  # 1. Create a conversation
  chat_system.create_conversation(
      conversation_id="conv_101",
      ride_id="ride_55",
      driver_id="Keertika",
      rider_id="Pavithra",
  )

  # 2. Send messages
  chat_system.send_message(
      conversation_id="conv_101",
      sender_id="Pavithra",
      content="Hey, are we still leaving at 9 AM?",
  )

  chat_system.send_message(
      conversation_id="conv_101",
      sender_id="Keertika",
      content="Yes! See you at the campus gate.",
  )

  # 3. Retrieve and verify messages
  messages = chat_system.get_messages("conv_101")
  assert len(messages) == 2
  assert messages[0]["content"] == "Hey, are we still leaving at 9 AM?"
  assert messages[1]["sender_id"] == "Keertika"

  print("All messaging tests passed successfully!")


if __name__ == "__main__":
  test_messaging_workflow()
  