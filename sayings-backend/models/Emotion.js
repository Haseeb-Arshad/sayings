// models/Emotion.js

const mongoose = require('mongoose');

const EmotionDetailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
});

const EmotionSegmentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  begin: { type: Number, required: true },
  end: { type: Number, required: true },
  confidence: { type: Number },
  emotions: [EmotionDetailSchema],
});

module.exports = EmotionSegmentSchema;
