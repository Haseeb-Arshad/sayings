// models/Post.js

const mongoose = require('mongoose');

// Define the schema for individual emotions
const OverallEmotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
}, { _id: false });

// Import EmotionSegmentSchema for detailed emotions
const EmotionSegmentSchema = require('./Emotion'); // Adjust the path as necessary

// Define the Post schema
const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  audioURL: { type: String, required: true },
  audioPinataURL: { type: String, required: true },
  ipfsHash: { type: String },

  title: { type: String },
  description: { type: String },
  transcript: { type: String },
  summary: { type: String },

  // Embeddings-ready: optional vector for future semantic search.
  embedding: { type: [Number], default: undefined },

  topics: [{
    topic: { type: String, required: true },
    confidence: { type: Number, required: true },
  }],
  sentiment_analysis_results: [{
    sentiment: { type: String, required: true },
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    confidence: { type: Number, required: true },
  }],
  entities: [{
    entity_type: { type: String, required: true },
    text: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  }],
  iab_categories_result: {
    summary: [{
      category: { type: String, required: true },
      confidence: { type: Number, required: true },
    }],
    results: [{
      category: { type: String, required: true },
      confidence: { type: Number, required: true },
    }],
  },
  auto_highlights_result: {
    status: { type: String },
    results: [{ type: mongoose.Schema.Types.Mixed }],
  },
  utterances: [{
    channel: { type: String, required: true },
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    confidence: { type: Number, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    words: [{ type: mongoose.Schema.Types.Mixed }],
  }],
  words: [{
    text: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    confidence: { type: Number, required: true },
    speaker: { type: String, required: true },
    channel: { type: String, required: true },
  }],
  language_code: { type: String },
  language_confidence: { type: Number },

  // Emotions
  emotions: { type: [OverallEmotionSchema], default: [] }, // Aggregated emotions
  overallEmotions: { type: [OverallEmotionSchema], default: [] }, // Aggregated emotions
  detailedEmotions: { type: [EmotionSegmentSchema], default: [] }, // Per-segment emotions

  // General Sentiment of the Post
  generalSentiment: { type: String, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'], default: 'NEUTRAL' },

  // Personality Scores derived from this post
  personalityScores: {
    Openness: { type: Number, default: 0 },
    Conscientiousness: { type: Number, default: 0 },
    Extraversion: { type: Number, default: 0 },
    Agreeableness: { type: Number, default: 0 },
    Neuroticism: { type: Number, default: 0 },
  },

  timestamp: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shared: { type: Number, default: 0 },
  views: { type: Number, default: 0 },

  // Fields for tracking likes
  likedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likedByIPs: [{ type: String }],
}, { 
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

PostSchema.index(
  {
    title: 'text',
    description: 'text',
    transcript: 'text',
    summary: 'text',
    'topics.topic': 'text',
  },
  {
    name: 'post_full_text_search',
    weights: {
      title: 10,
      transcript: 8,
      'topics.topic': 6,
      description: 5,
      summary: 4,
    },
  }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ timestamp: -1 });
PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ 'topics.topic': 1 });
PostSchema.index({ generalSentiment: 1 });

module.exports = mongoose.model('Post', PostSchema);
