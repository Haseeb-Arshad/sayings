const Topic = require('../models/Topic');

const ONE_HOUR_MS = 60 * 60 * 1000;

let cached = {
  topics: null,
  expiresAt: 0,
};

async function fetchTrendingTopics(limit = 10) {
  const topics = await Topic.find().sort({ popularity: -1 }).limit(limit).lean();
  return topics.map((t) => ({
    id: t._id?.toString?.() || t._id,
    name: t.name,
    popularity: t.popularity,
  }));
}

async function getTrendingTopics({ limit = 10 } = {}) {
  const now = Date.now();
  if (cached.topics && cached.expiresAt > now) {
    return cached.topics.slice(0, limit);
  }

  const topics = await fetchTrendingTopics(limit);
  cached = {
    topics,
    expiresAt: now + ONE_HOUR_MS,
  };

  return topics;
}

module.exports = {
  getTrendingTopics,
};
