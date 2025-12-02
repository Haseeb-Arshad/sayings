const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = "h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    console.error('Invalid token:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
