// controllers/topicsController.js

const Topic = require('../models/Topic');

exports.getTopTopics = async (req, res) => {
  try {
    const topTopics = await Topic.find()
      .sort({ popularity: -1 }) // Sort descending by popularity
      .limit(10); // Fetch top 10 topics

    res.status(200).json({ topics: topTopics });
  } catch (error) {
    console.error('Error fetching top topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// New function to handle topic search and popularity update
exports.searchTopics = async (req, res) => {
  try {
    const searchQuery = req.query.q;

    // Find topics matching the search query
    const topics = await Topic.find({
      name: { $regex: searchQuery, $options: 'i' },
    }).sort({ popularity: -1 });

    // Update popularity for each matched topic
    for (const topic of topics) {
      // Increment popularity by a small amount (e.g., 5% of average confidence)
      const increment = 0.05; // Adjust this value as needed
      topic.popularity += increment;
      await topic.save();
    }

    res.status(200).json({ topics });
  } catch (error) {
    console.error('Error searching topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getSuggestedTopics = async (req, res) => {
  try {
    const suggestions = await Topic.find()
      .sort({ popularity: -1 })
      .limit(10);

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
