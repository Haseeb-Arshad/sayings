const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/search?q=searchTerm&sort=relevance|recent&filter=topic:foo
router.get('/', searchController.search);

// GET /api/search/trending
router.get('/trending', searchController.trending);

// POST /api/search/analytics/click
router.post('/analytics/click', searchController.trackClick);

module.exports = router;
