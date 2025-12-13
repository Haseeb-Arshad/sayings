// controllers/postController.js

const Post = require('../models/Posts');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Topic = require('../models/Topic');

// Helper function to decode cursor
const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return decoded;
  } catch (error) {
    console.error('Error decoding cursor:', error);
    return null;
  }
};

// Helper function to encode cursor
const encodeCursor = (post, filter) => {
  const cursorData = {
    id: post._id.toString(),
    timestamp: post.timestamp || post.createdAt,
  };
  
  // For top posts, include likes for proper cursor-based pagination
  if (filter === 'top') {
    cursorData.likes = post.likes;
  }
  
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
};

// Get posts with cursor-based pagination
exports.getPosts = async (req, res) => {
  try {
    const { filter, cursor, limit = 20 } = req.query;
    const limitNum = parseInt(limit);
    let query = {};
    let sort = {};

    // Set up query and sort based on filter
    if (filter === 'top') {
      sort = { likes: -1, timestamp: -1 };
    } else if (filter === 'recent' || !filter) {
      sort = { timestamp: -1 };
    } else if (filter.startsWith('topic:')) {
      const topic = filter.split(':')[1];
      query = { 'topics.topic': topic };
      sort = { timestamp: -1 };
    } else {
      return res.status(400).json({ error: 'Invalid filter' });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (decodedCursor) {
        if (filter === 'top' && decodedCursor.likes !== undefined) {
          // For top posts, we need to handle the composite sort on likes and timestamp
          query.$or = [
            { likes: { $lt: decodedCursor.likes } },
            { 
              likes: decodedCursor.likes,
              timestamp: { $lt: new Date(decodedCursor.timestamp) }
            }
          ];
        } else {
          query.timestamp = { $lt: new Date(decodedCursor.timestamp) };
        }
      }
    }

    // Fetch posts with cursor-based pagination
    const posts = await Post.find(query)
      .sort(sort)
      .limit(limitNum + 1) // Fetch one extra to determine if there are more
      .populate('user', 'username avatar')
      .populate('topics', 'name');

    const hasMore = posts.length > limitNum;
    const postsToReturn = hasMore ? posts.slice(0, limitNum) : posts;
    
    // Generate cursor for next page
    let nextCursor = null;
    if (hasMore && postsToReturn.length > 0) {
      nextCursor = encodeCursor(postsToReturn[postsToReturn.length - 1], filter);
    }

    // Generate prev cursor (for navigation)
    let prevCursor = null;
    if (cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (decodedCursor && postsToReturn.length > 0) {
        prevCursor = encodeCursor(postsToReturn[0], filter);
      }
    }

    res.json({
      posts: postsToReturn,
      nextCursor,
      prevCursor,
      hasMore,
      filter
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get posts by a specific user with cursor-based pagination
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter, cursor, limit = 20 } = req.query;
    const limitNum = parseInt(limit);
    let query = { user: userId };
    let sort = {};

    // Set up sort based on filter
    if (filter === 'top') {
      sort = { likes: -1, timestamp: -1 };
    } else {
      sort = { timestamp: -1 }; // Default to recent
    }

    // Handle cursor-based pagination
    if (cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (decodedCursor) {
        if (filter === 'top' && decodedCursor.likes !== undefined) {
          // For top posts, handle composite sort
          query.$or = [
            { likes: { $lt: decodedCursor.likes } },
            { 
              likes: decodedCursor.likes,
              timestamp: { $lt: new Date(decodedCursor.timestamp) }
            }
          ];
        } else {
          query.timestamp = { $lt: new Date(decodedCursor.timestamp) };
        }
      }
    }

    // Fetch posts with cursor-based pagination
    const posts = await Post.find(query)
      .sort(sort)
      .limit(limitNum + 1) // Fetch one extra to determine if there are more
      .populate('user', 'username avatar');

    const hasMore = posts.length > limitNum;
    const postsToReturn = hasMore ? posts.slice(0, limitNum) : posts;
    
    // Generate cursor for next page
    let nextCursor = null;
    if (hasMore && postsToReturn.length > 0) {
      nextCursor = encodeCursor(postsToReturn[postsToReturn.length - 1], filter);
    }

    res.json({
      posts: postsToReturn,
      nextCursor,
      hasMore,
      filter
    });
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


// Duplicate getPosts function removed - using cursor-based version above




// Duplicate likePost function removed - using simpler version above


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