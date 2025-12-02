// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Replace with your actual User model
const authMiddleware = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A'; // Ensure this matches your environment variable

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Authenticate user (Replace with your actual authentication logic)
  const user = await User.findOne({ email });
  if (!user || !user.isValidPassword(password)) { // Assume isValidPassword is a method on User model
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: '1d',
  });

  res.json({ message: 'Logged in successfully', token, user: { id: user._id, email: user.email } });
});

// Logout route (Optional: If implementing token blacklisting)
router.post('/logout', (req, res) => {
  // Implement token blacklisting if necessary
  res.json({ message: 'Logged out successfully' });
});

// Protected route example
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
