const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

// Register Endpoint
router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name: name.trim(), email: normalizedEmail, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Endpoint
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, 'YOUR_JWT_SECRET', { expiresIn: '1d' });
    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
