// server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();

// Set 'trust proxy' to trust the first proxy
app.set('trust proxy', 1);


const allowedOrigins = [
  'https://sayings.me',
  'https://www.sayings.me',
  'http://www.sayings.me',
  'http://www.sayings.me',
  'http://localhost:3000',
];
// Define allowed origins
// Middleware
app.use(express.json());

// Security Middlewares
app.use(helmet());

// Cookie Parser Middleware
app.use(cookieParser());

// CORS Configuration with Detailed Logging
const corsOptions = {
  origin: function (origin, callback) {
    // Log the incoming origin for debugging
    console.log(`Incoming request from origin: ${origin}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`CORS rejection for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
};

// Apply CORS middleware **once** and **before** routes
app.use(cors(corsOptions));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Remove useFindAndModify and useCreateIndex as they are no longer supported in newer Mongoose versions
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });


  // In your backend routes
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    origin: req.get('origin')
  });
  next();
});

// Rate Limiting Middleware
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit for general routes
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400, // Limit for auth routes
  message: 'Too many requests from this IP, please try again later.',
});

// Routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postsRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');
const searchRoutes = require('./routes/searchRoutes');
const topicRoutes = require('./routes/topicsRoutes');
const audioRoutes = require('./routes/audioRoutes');
const usersRoutes = require('./routes/usersRoutes');

// Apply rate limiter to auth and transcription routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transcribe', authLimiter, transcriptionRoutes);

// Apply general rate limiter to other routes
app.use(generalLimiter);

// Apply other routes
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/users', usersRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS Error: Not allowed by CORS' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
