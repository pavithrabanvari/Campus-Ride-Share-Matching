const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../middleware/auth');

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (![name, email, password].every(nonEmpty)) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Enter a valid email and a password of at least 8 characters.' });
  }
  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12)
    });
    return res.status(201).json({ success: true, message: 'User registered successfully', userId: String(user._id) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to register this account.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!nonEmpty(email) || !nonEmpty(password)) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: String(user._id) }, jwtSecret, { expiresIn: '1d' });
    return res.json({ success: true, token, userId: String(user._id), name: user.name });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
});

module.exports = router;
