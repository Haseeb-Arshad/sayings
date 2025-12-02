// routes/commentsRoutes.js
const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/comments - Add a comment
router.post('/', authMiddleware, commentsController.addComment);

// GET /api/comments/post/:postId - Get comments for a post
router.get('/post/:postId', commentsController.getComments);

module.exports = router;
