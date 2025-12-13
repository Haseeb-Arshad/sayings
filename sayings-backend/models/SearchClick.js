const mongoose = require('mongoose');

const SearchClickSchema = new mongoose.Schema(
  {
    queryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SearchQuery',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['post', 'user', 'topic'],
    },
    targetId: { type: String, required: true },
    position: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

SearchClickSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SearchClick', SearchClickSchema);
