// routes/usersRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users/username/:username - Fetch user by username
router.get('/username/:username', userController.getUserByUsername);

// You can add more user-related routes here in the future

module.exports = router;
