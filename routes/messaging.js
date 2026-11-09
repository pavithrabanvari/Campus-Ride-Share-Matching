const router = require('express').Router();

// Prototype storage: messages reset when the Node process restarts.
const messages = [];

router.post('/send', (req, res) => {
  const { sender_id: senderId, recipient_id: recipientId, content } = req.body || {};
  if (![senderId, recipientId, content].every((value) => typeof value === 'string' && value.trim()) || content.length > 2000) {
    return res.status(400).json({ success: false, message: 'Sender, recipient, and a message of at most 2,000 characters are required.' });
  }
  const message = { sender_id: senderId.trim(), recipient_id: recipientId.trim(), content: content.trim(), timestamp: new Date().toISOString() };
  messages.push(message);
  return res.status(201).json({ status: 'success', data: message });
});

router.get('/:userId', (req, res) => {
  const userMessages = messages.filter((message) => message.sender_id === req.params.userId || message.recipient_id === req.params.userId);
  return res.json({ user_id: req.params.userId, messages: userMessages });
});

module.exports = router;
