// controllers/authController.js

const User = require('../models/User');
const { SignJWT } = require('jose');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = 'h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A'; // Should be stored securely

const encoder = new TextEncoder();
const jwtSecret = encoder.encode(JWT_SECRET);

const JWT_EXPIRES_IN = '7d';

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    let { username, email, password, bio } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Convert username and email to lowercase
    username = username.toLowerCase();
    email = email.toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email already exists.' });
    }

    const user = new User({
      username,
      email,
      password,
      bio,
      isAnonymous: false,
    });

    await user.save();

    // Sign JWT using jose
    const jwt = await new SignJWT({ id: user._id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(jwtSecret);

    res.cookie('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // Ensure cookie is sent for all routes
    });

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body; // 'identifier' can be username or email

    // console.log('Login request:', req.body);

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide both identifier and password.' });
    }

    // Determine if the identifier is an email using regex
    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const query = isEmail 
      ? { email: identifier.toLowerCase() } 
      : { username: identifier.toLowerCase() };

    const user = await User.findOne(query);
    if (!user || user.isAnonymous) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Sign JWT using jose
    const jwt = await new SignJWT({ id: user._id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(jwtSecret);

    res.cookie('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // Ensure cookie is sent for all routes
    });

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Logout user
exports.logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/', // Ensure the cookie is cleared for all routes
  });
  res.status(200).json({ message: 'Logged out successfully.' });
};
