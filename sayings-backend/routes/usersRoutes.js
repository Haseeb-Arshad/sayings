// routes/usersRoutes.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

// Register Route
router.post('/register', usersController.registerUser);

// Login Route
router.post('/login', usersController.loginUser);

// Get Current User Route
router.get('/me', authMiddleware, usersController.getCurrentUser);

module.exports = router;
