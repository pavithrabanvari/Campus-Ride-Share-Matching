const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('node:path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/static', express.static(path.join(__dirname, 'frontend')));

// Import Routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const matchingRoutes = require('./routes/matching');
const messagingRoutes = require('./routes/messaging');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/matches', matchingRoutes);
app.use('/api/messages', messagingRoutes);

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-ride-share';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('Database connection error:', err));

app.listen(PORT, () => console.log(`Campus Ride Share running at http://localhost:${PORT}`));
