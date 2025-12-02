const express = require('express');
const router = express.Router();
const postController = require('../controllers/postsController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/posts - Fetch posts with optional filters
router.get('/', postController.getPosts);

// GET /api/posts/user/:userId - Fetch posts by a specific user
router.get('/user/:userId', postController.getUserPosts);

// POST /api/posts - Create a new post
router.post('/', authMiddleware, postController.createPost);

// PUT /api/posts/:postId/like - Like a post
router.put('/:postId/like', postController.likePost); // Remove authMiddleware to allow unauthenticated likes

// POST /api/posts/:postId/comment - Add a comment to a post
router.post('/:postId/comment', authMiddleware, postController.addComment);

// PUT /api/posts/:postId/share - Share a post
router.put('/:postId/share', authMiddleware, postController.sharePost);

// GET /api/posts/:postId - Fetch a single post by ID
router.get('/:postId', postController.getPostById);

// DELETE /api/posts/:postId - Delete a post
router.delete('/:postId', authMiddleware, postController.deletePost);


module.exports = router;
