// routes/topicsRoutes.js

const express = require('express');
const router = express.Router();
const topicsController = require('../controllers/topicsController');

// GET /api/topics/top - Get top topics
router.get('/top', topicsController.getTopTopics);

// GET /api/topics/search?q=searchQuery - Search for topics
router.get('/search', topicsController.searchTopics);

module.exports = router;
