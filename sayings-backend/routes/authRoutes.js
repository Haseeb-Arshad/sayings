// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const authMiddleware = require('../middleware/authMiddleware');

// Register route
router.post('/register', authController.registerUser);

// Login route
router.post('/login', authController.loginUser);

// Logout route
router.post('/logout', authController.logoutUser);

// Get current user (Protected)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;

