// controllers/searchController.js

const Post = require('../models/Posts');
const User = require('../models/User');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'No search query provided.' });

    // Search Users
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
      ],
      isAnonymous: false,
    }).select('username avatar');

    // Search Posts
    const posts = await Post.find({ transcript: { $regex: q, $options: 'i' } })
      .limit(10)
      .select('transcript audioURL')
      .populate('user', 'username avatar');

    // Search Topics
    const topics = await Post.aggregate([
      { $unwind: '$topics' },
      { $match: { 'topics.topic': { $regex: q, $options: 'i' } } },
      { $group: { _id: '$topics.topic' } },
      { $limit: 10 },
    ]);

    const topicResults = topics.map((t) => ({ topic: t._id, type: 'topic' }));

    // Format results
    const formattedUsers = users.map((user) => ({ ...user.toObject(), type: 'user' }));
    const formattedPosts = posts.map((post) => ({ ...post.toObject(), type: 'post' }));
    const formattedTopics = topicResults;

    res.json({ results: [...formattedUsers, ...formattedPosts, ...formattedTopics] });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
