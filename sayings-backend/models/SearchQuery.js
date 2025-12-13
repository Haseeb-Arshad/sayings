const mongoose = require('mongoose');

const SearchQuerySchema = new mongoose.Schema(
  {
    q: { type: String, required: true, trim: true },
    sort: { type: String, default: 'relevance' },
    mode: { type: String, default: 'keyword' },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultsCount: { type: Number, default: 0 },
    typeahead: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

SearchQuerySchema.index({ createdAt: -1 });
SearchQuerySchema.index({ q: 1, createdAt: -1 });

module.exports = mongoose.model('SearchQuery', SearchQuerySchema);
