// // backend/routes/topicsRoutes.js
// const express = require('express');
// const router = express.Router();
// const Post = require('../models/Posts'); // Ensure Post model is defined

// // GET /api/topics/top
// router.get('/top', async (req, res) => {
//   try {
//     const topTopics = await Post.aggregate([
//       { $unwind: '$topics' },
//       { $group: { _id: '$topics.topic', count: { $sum: 1 } } },
//       { $sort: { count: -1 } },
//       { $limit: 10 },
//       { $project: { topic: '$_id', _id: 0 } },
//     ]);

//     const topics = topTopics.map((t) => t.topic);
//     res.json({ topics });
//   } catch (error) {
//     console.error('Error fetching top topics:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// module.exports = router;


// routes/topicRoutes.js

const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicsController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/topics/top - Public Route
router.get('/top', topicController.getTopTopics);

module.exports = router;
