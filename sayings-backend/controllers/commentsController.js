// controllers/commentsController.js
const Comment = require('../models/Comment');
const Post = require('../models/Posts');

exports.addComment = async (req, res) => {
  try {
    const { postId, comment } = req.body;
    const user = req.user.id || null; // Handle anonymous comments if allowed

    const newComment = new Comment({
      post: postId,
      user,
      comment,
    });

    await newComment.save();

    // Increment comment count on the post
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });

    const populatedComment = await newComment.populate('user', 'username avatar');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .sort({ timestamp: 1 })
      .populate('user', 'username avatar');
    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
