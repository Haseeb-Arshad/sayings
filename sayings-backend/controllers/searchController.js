const SearchQuery = require('../models/SearchQuery');
const SearchClick = require('../models/SearchClick');

const searchService = require('../services/searchService');
const { getTrendingTopics } = require('../services/trendingTopicsCache');

function parseFilterString(filter) {
  if (!filter) return {};

  const parsed = {};
  const parts = Array.isArray(filter) ? filter : String(filter).split(',');

  for (const part of parts) {
    const [rawKey, ...rest] = String(part).split(':');
    const key = rawKey?.trim()?.toLowerCase();
    const value = rest.join(':').trim();

    if (!key || !value) continue;

    if (key === 'topic') parsed.topic = value;
    if (key === 'emotion') parsed.emotion = value;
    if (key === 'creator') parsed.creator = value;
    if (key === 'from') parsed.from = value;
    if (key === 'to') parsed.to = value;
  }

  return parsed;
}

exports.search = async (req, res) => {
  try {
    const {
      q,
      sort = 'relevance',
      mode = 'keyword',
      filter,
      topic,
      emotion,
      creator,
      from,
      to,
      limit,
      cursor,
      typeahead,
      track,
    } = req.query;

    const query = String(q || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'No search query provided.' });
    }

    const parsedFromFilter = parseFilterString(filter);

    const filters = {
      ...parsedFromFilter,
      ...(topic ? { topic } : {}),
      ...(emotion ? { emotion } : {}),
      ...(creator ? { creator: String(creator).replace(/^@/, '') } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    };

    const isTypeahead = String(typeahead) === 'true';
    const shouldTrack = String(track) !== 'false' && !isTypeahead;

    const result = await searchService.search({
      q: query,
      filters,
      sort,
      mode,
      cursor,
      limit: limit ? Number(limit) : undefined,
      typeahead: isTypeahead,
    });

    let queryId = null;
    if (shouldTrack) {
      const doc = await SearchQuery.create({
        q: query,
        sort,
        mode,
        filters,
        resultsCount: (result.posts?.length || 0) + (result.users?.length || 0) + (result.topics?.length || 0),
        typeahead: false,
        user: req.user?._id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      queryId = doc._id?.toString?.() || doc._id;
    }

    res.json({
      query,
      queryId,
      filters,
      sort: sort === 'recent' ? 'recent' : 'relevance',
      modeUsed: result.modeUsed,
      semanticReady: result.semanticReady,
      nextCursor: result.nextCursor,
      results: {
        posts: result.posts,
        users: result.users,
        topics: result.topics,
      },
    });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.trending = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const topics = await getTrendingTopics({ limit });
    res.json({ topics });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.trackClick = async (req, res) => {
  try {
    const { queryId, targetType, targetId, position } = req.body || {};

    if (!queryId || !targetType || !targetId) {
      return res.status(400).json({ error: 'queryId, targetType, and targetId are required.' });
    }

    const click = await SearchClick.create({
      queryId,
      targetType,
      targetId,
      position,
      user: req.user?._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ ok: true, id: click._id?.toString?.() || click._id });
  } catch (error) {
    console.error('Error tracking search click:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
