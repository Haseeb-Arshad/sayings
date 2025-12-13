const mongoose = require('mongoose');

const Post = require('../models/Posts');
const User = require('../models/User');
const Topic = require('../models/Topic');

const MAX_LIMIT = 50;

function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenizeQuery(q) {
  return Array.from(
    new Set(
      String(q)
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length > 1)
    )
  );
}

function makeSnippet(text, q, { maxLen = 160 } = {}) {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) {
    return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized;
  }

  const regex = new RegExp(tokens.map(escapeRegExp).join('|'), 'i');
  const match = regex.exec(normalized);
  if (!match) {
    return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized;
  }

  const idx = match.index;
  const start = Math.max(0, idx - 60);
  const end = Math.min(normalized.length, idx + 100);

  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const base64 = String(cursor).replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function encodeCursor(obj) {
  const json = JSON.stringify(obj);
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizeSort(sort) {
  return sort === 'recent' ? 'recent' : 'relevance';
}

function normalizeMode(mode) {
  return mode === 'semantic' ? 'semantic' : 'keyword';
}

function isTextIndexMissingError(err) {
  const msg = err?.message || '';
  return msg.includes('text index required') || msg.includes('text index') || msg.includes('No text index');
}

async function resolveCreator(creator) {
  if (!creator) return null;

  const maybeId = String(creator).trim();
  if (mongoose.isValidObjectId(maybeId)) return maybeId;

  const user = await User.findOne({
    username: { $regex: escapeRegExp(maybeId), $options: 'i' },
    isAnonymous: false,
  })
    .select('_id')
    .lean();

  return user?._id?.toString?.() || null;
}

function buildFilterMatch({ topic, emotion, creatorId, from, to }) {
  const and = [];

  if (topic) {
    and.push({ 'topics.topic': { $regex: `^${escapeRegExp(topic)}$`, $options: 'i' } });
  }

  if (emotion) {
    const normalized = String(emotion).trim();
    and.push({
      $or: [
        { generalSentiment: normalized.toUpperCase() },
        { 'overallEmotions.name': { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } },
        { 'emotions.name': { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } },
      ],
    });
  }

  if (creatorId) {
    and.push({ user: new mongoose.Types.ObjectId(creatorId) });
  }

  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);

    and.push({ $or: [{ createdAt: range }, { timestamp: range }] });
  }

  if (and.length === 0) return {};
  return { $and: and };
}

function buildRegexQuery(q) {
  const escaped = escapeRegExp(String(q || '').trim());
  return new RegExp(escaped, 'i');
}

async function searchPostsText({ q, filters, sort, limit, cursor }) {
  const normalizedSort = normalizeSort(sort);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
  const decodedCursor = decodeCursor(cursor);

  const match = {
    $text: {
      $search: q,
      $caseSensitive: false,
      $diacriticSensitive: false,
    },
    ...buildFilterMatch(filters),
  };

  const pipeline = [{ $match: match }, { $addFields: { score: { $meta: 'textScore' } } }];

  if (decodedCursor && normalizedSort === 'relevance' && decodedCursor.lastScore != null && decodedCursor.lastId) {
    pipeline.push({
      $match: {
        $or: [
          { score: { $lt: decodedCursor.lastScore } },
          { score: decodedCursor.lastScore, _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.lastId) } },
        ],
      },
    });
  }

  if (decodedCursor && normalizedSort === 'recent' && decodedCursor.lastCreatedAt && decodedCursor.lastId) {
    pipeline.push({
      $match: {
        $or: [
          { createdAt: { $lt: new Date(decodedCursor.lastCreatedAt) } },
          {
            createdAt: new Date(decodedCursor.lastCreatedAt),
            _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.lastId) },
          },
        ],
      },
    });
  }

  pipeline.push(
    normalizedSort === 'recent'
      ? { $sort: { createdAt: -1, _id: -1 } }
      : { $sort: { score: -1, createdAt: -1, _id: -1 } }
  );

  pipeline.push({ $limit: safeLimit + 1 });

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        audioURL: 1,
        audioPinataURL: 1,
        ipfsHash: 1,
        title: 1,
        description: 1,
        transcript: 1,
        summary: 1,
        topics: 1,
        generalSentiment: 1,
        emotions: 1,
        overallEmotions: 1,
        timestamp: 1,
        createdAt: 1,
        score: 1,
        user: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
      },
    }
  );

  const docs = await Post.aggregate(pipeline);

  let nextCursor = null;
  let items = docs;
  if (docs.length > safeLimit) {
    const last = docs[safeLimit - 1];
    items = docs.slice(0, safeLimit);

    if (normalizedSort === 'recent') {
      nextCursor = encodeCursor({ lastCreatedAt: last.createdAt, lastId: last._id });
    } else {
      nextCursor = encodeCursor({ lastScore: last.score ?? 0, lastId: last._id });
    }
  }

  const posts = items.map((p) => ({
    ...p,
    id: p._id?.toString?.() || p._id,
    snippet: makeSnippet(p.transcript || p.summary || p.description || '', q),
  }));

  return { posts, nextCursor };
}

async function searchPostsRegex({ q, filters, sort, limit, cursor }) {
  const normalizedSort = normalizeSort(sort);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
  const decodedCursor = decodeCursor(cursor);

  const regex = buildRegexQuery(q);

  const and = [
    {
      $or: [
        { title: regex },
        { description: regex },
        { transcript: regex },
        { summary: regex },
        { 'topics.topic': regex },
      ],
    },
  ];

  const filterMatch = buildFilterMatch(filters);
  if (filterMatch.$and) {
    and.push(...filterMatch.$and);
  }

  const match = { $and: and };
  const pipeline = [{ $match: match }];

  // Cursor pagination for regex fallback uses recency.
  if (decodedCursor && decodedCursor.lastCreatedAt && decodedCursor.lastId) {
    pipeline.push({
      $match: {
        $or: [
          { createdAt: { $lt: new Date(decodedCursor.lastCreatedAt) } },
          {
            createdAt: new Date(decodedCursor.lastCreatedAt),
            _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.lastId) },
          },
        ],
      },
    });
  }

  pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  pipeline.push({ $limit: safeLimit + 1 });

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        audioURL: 1,
        audioPinataURL: 1,
        ipfsHash: 1,
        title: 1,
        description: 1,
        transcript: 1,
        summary: 1,
        topics: 1,
        generalSentiment: 1,
        emotions: 1,
        overallEmotions: 1,
        timestamp: 1,
        createdAt: 1,
        user: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
      },
    }
  );

  const docs = await Post.aggregate(pipeline);

  let nextCursor = null;
  let items = docs;
  if (docs.length > safeLimit) {
    const last = docs[safeLimit - 1];
    items = docs.slice(0, safeLimit);

    nextCursor = encodeCursor({ lastCreatedAt: last.createdAt, lastId: last._id });
  }

  const posts = items.map((p) => ({
    ...p,
    id: p._id?.toString?.() || p._id,
    score: normalizedSort === 'relevance' ? undefined : undefined,
    snippet: makeSnippet(p.transcript || p.summary || p.description || '', q),
  }));

  return { posts, nextCursor };
}

async function searchPosts(params) {
  try {
    return await searchPostsText(params);
  } catch (err) {
    if (isTextIndexMissingError(err)) {
      return await searchPostsRegex(params);
    }
    throw err;
  }
}

async function searchUsersText({ q, limit = 5 }) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const users = await User.find(
    {
      $text: { $search: q, $caseSensitive: false, $diacriticSensitive: false },
      isAnonymous: false,
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(safeLimit)
    .select('username avatar bio')
    .lean();

  return users.map((u) => ({ ...u, id: u._id?.toString?.() || u._id }));
}

async function searchUsersRegex({ q, limit = 5 }) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const regex = buildRegexQuery(q);

  const users = await User.find({
    isAnonymous: false,
    $or: [{ username: regex }, { bio: regex }],
  })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('username avatar bio')
    .lean();

  return users.map((u) => ({ ...u, id: u._id?.toString?.() || u._id }));
}

async function searchUsers(params) {
  try {
    return await searchUsersText(params);
  } catch (err) {
    if (isTextIndexMissingError(err)) {
      return await searchUsersRegex(params);
    }
    throw err;
  }
}

async function searchTopics({ q, limit = 8 }) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const topics = await Topic.find({ name: { $regex: q, $options: 'i' } })
    .sort({ popularity: -1 })
    .limit(safeLimit)
    .select('name popularity')
    .lean();

  return topics.map((t) => ({ ...t, id: t._id?.toString?.() || t._id }));
}

async function search({ q, filters, sort, cursor, limit, typeahead, mode }) {
  const trimmed = String(q || '').trim();
  if (!trimmed) {
    return { posts: [], users: [], topics: [], nextCursor: null, modeUsed: normalizeMode(mode), semanticReady: false };
  }

  const creatorId = await resolveCreator(filters?.creator);
  const normalizedFilters = {
    ...filters,
    creatorId,
  };

  const postsPromise = searchPosts({
    q: trimmed,
    filters: normalizedFilters,
    sort,
    cursor,
    limit: typeahead ? Math.min(Number(limit) || 6, 10) : limit,
  });

  const usersPromise = searchUsers({ q: trimmed, limit: typeahead ? 5 : 10 });
  const topicsPromise = searchTopics({ q: trimmed, limit: typeahead ? 6 : 10 });

  const [postResult, users, topics] = await Promise.all([postsPromise, usersPromise, topicsPromise]);

  return {
    posts: postResult.posts,
    users,
    topics,
    nextCursor: postResult.nextCursor,
    modeUsed: normalizeMode(mode) === 'semantic' ? 'keyword' : normalizeMode(mode),
    semanticReady: false,
  };
}

module.exports = {
  search,
  decodeCursor,
  encodeCursor,
  tokenizeQuery,
};
