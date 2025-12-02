// models/Topic.js

const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  popularity: {
    type: Number,
    default: 0, // Represents how popular the topic is
  },
  // New field to track when the topic was last updated
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Topic', TopicSchema);
