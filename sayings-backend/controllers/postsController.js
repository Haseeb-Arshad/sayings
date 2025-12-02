// controllers/postController.js

const Post = require('../models/Posts');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Topic = require('../models/Topic');

// Get posts with optional filters
exports.getPosts = async (req, res) => {
  try {
    const { filter, page = 1, limit = 10 } = req.query;
    let query = {};

    if (filter === 'top') {
      query = {}; // Define 'top' based on likes
      const posts = await Post.find(query)
        .sort({ likes: -1, timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('user', 'username avatar');
      return res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
    } else if (filter === 'recent' || !filter) {
      query = {};
      const posts = await Post.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('user', 'username avatar');
      return res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
    } else if (filter.startsWith('topic:')) {
      const topic = filter.split(':')[1];
      query = { 'topics.topic': topic };
      const posts = await Post.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('user', 'username avatar');
      return res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
    } else {
      return res.status(400).json({ error: 'Invalid filter' });
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get posts by a specific user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter, page = 1, limit = 10 } = req.query;
    let query = { user: userId };

    if (filter === 'top') {
      // Fetch top posts by likes
      const posts = await Post.find(query)
        .sort({ likes: -1, timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('user', 'username avatar');
      return res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
    } else {
      // Default to recent posts
      const posts = await Post.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('user', 'username avatar');
      return res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
    }
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { audioURL, transcript, topics } = req.body;
    const user = req.user.id || null; // Associate with user if authenticated

    const newPost = new Post({
      user,
      audioURL,
      transcript,
      topics,
    });

    await newPost.save();
    const populatedPost = await newPost.populate('user', 'username avatar');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Like a post
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likes: 1 } },
      { new: true }
    ).populate('user', 'username avatar');

    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
  try {
    const { postId, comment } = req.body;
    const user = req.user.id || null; // Optional for anonymous

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

// Share a post (increase share count)
exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { shared: 1 } },
      { new: true }
    ).populate('user', 'username avatar');

    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// controllers/postController.js
exports.getPosts = async (req, res) => {
  try {
    const { filter } = req.query;

    let sort = { createdAt: -1 }; // Default: Recent posts

    if (filter === 'trending') {
      sort = { likes: -1 }; // Sort by number of likes
    } else if (filter === 'popular') {
      sort = { views: -1 }; // Sort by number of views
    }

    const posts = await Post.find()
      .sort(sort)
      .populate('user', 'username avatar') // Populate user details
      .populate('topics', 'name'); // Populate topic details

    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




// Like a post with uniqueness based on user or IP
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user ? req.user.id : null; // Authenticated user ID if available
    const userIP = req.ip; // User's IP address

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let hasLiked = false;

    if (userId) {
      // Check if the user has already liked the post
      hasLiked = post.likedByUsers.includes(userId);
      if (!hasLiked) {
        post.likes += 1;
        post.likedByUsers.push(userId);
      }
    } else {
      // For unauthenticated users, check IP
      hasLiked = post.likedByIPs.includes(userIP);
      if (!hasLiked) {
        post.likes += 1;
        post.likedByIPs.push(userIP);
      }
    }

    await post.save();

    // Populate user details if authenticated
    await post.populate('user', 'username avatar');

    res.json({
      post,
      message: hasLiked ? 'You have already liked this post.' : 'Post liked successfully.',
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Get a single post by ID
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('user', 'username avatar')
      .populate('topics', 'topic confidence');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.status(200).json({ post });
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id; // Retrieved from authMiddleware

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Check if the requesting user is the owner of the post
    if (!post.user || post.user.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    await Post.findByIdAndDelete(postId);

    res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};