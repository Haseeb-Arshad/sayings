// backend/scripts/seedPosts.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('../models/Posts');

dotenv.config();

const dummyPosts = [
  {
    audioURL: 'https://soundcloud.com/user-869451758/call-of-duty-zombies-round-change-sound-effect?in=user-276538827/sets/random-audio-clips&si=a0bfb80ef1434ff9a2b8b5ea4ab18cc3&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing',
    transcript: 'Hello, this is a test voice note.',
    topics: [
      { topic: 'Technology', confidence: 0.95 },
      { topic: 'Testing', confidence: 0.90 },
    ],
    timestamp: new Date('2024-04-01T12:00:00Z'),
    likes: 10,
    comments: 2,
  },
  {
    audioURL: 'https://example.com/audio2.wav',
    transcript: 'Another insightful voice message.',
    topics: [
      { topic: 'Health', confidence: 0.88 },
      { topic: 'Wellness', confidence: 0.85 },
    ],
    timestamp: new Date('2024-04-02T15:30:00Z'),
    likes: 5,
    comments: 1,
  },
  // Add more dummy posts as needed
];

mongoose
  .connect("mongodb+srv://test:Haseeb987@cluster0.mjov9vl.mongodb.net/Sayings?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB for seeding.');
    await Post.deleteMany({});
    await Post.insertMany(dummyPosts);
    console.log('Dummy posts seeded successfully.');
    mongoose.connection.close();
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });
