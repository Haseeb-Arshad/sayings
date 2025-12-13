// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Updated to bcryptjs

// Define the EmotionLogSchema
const EmotionLogSchema = new mongoose.Schema({
  emotions: {
    Openness: { type: Number, default: 0 },
    Conscientiousness: { type: Number, default: 0 },
    Extraversion: { type: Number, default: 0 },
    Agreeableness: { type: Number, default: 0 },
    Neuroticism: { type: Number, default: 0 },
  },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// Define the ProfileReviewLogSchema
const ProfileReviewLogSchema = new mongoose.Schema({
  review: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// Define the UserSchema
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true, // Ensures username is stored in lowercase
    trim: true,
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true, // Ensures email is stored in lowercase
    trim: true,
  },
  password: { 
    type: String, 
    required: true 
  },
  avatar: { type: String },
  bio: { type: String },
  
  // Existing personality field
  personality: {
    Openness: { type: Number, default: 0 },
    Conscientiousness: { type: Number, default: 0 },
    Extraversion: { type: Number, default: 0 },
    Agreeableness: { type: Number, default: 0 },
    Neuroticism: { type: Number, default: 0 },
  },
  
  // General Emotions
  generalEmotions: {
    Openness: { type: Number, default: 0 },
    Conscientiousness: { type: Number, default: 0 },
    Extraversion: { type: Number, default: 0 },
    Agreeableness: { type: Number, default: 0 },
    Neuroticism: { type: Number, default: 0 },
  },
  emotionLogs: [EmotionLogSchema], // Logs of emotion updates
  
  // Profile Reviews
  profileReview: { type: String },
  profileReviewLogs: [ProfileReviewLogSchema], // Logs of profile reviews
  
  isAnonymous: { type: Boolean, default: false }, // Added based on controller usage
}, { 
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

// Virtual Population for Posts
UserSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
  justOne: false, // A user can have multiple posts
});

// Pre-save hook to hash the password before saving
UserSchema.pre('save', async function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the salt
    const hashedPassword = await bcrypt.hash(user.password, salt);
    // Replace the plain text password with the hashed one
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare candidate password with the user's hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index(
  {
    username: 'text',
    bio: 'text',
  },
  {
    name: 'user_full_text_search',
    weights: {
      username: 10,
      bio: 3,
    },
  }
);

module.exports = mongoose.model('User', UserSchema);
