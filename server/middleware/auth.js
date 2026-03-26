const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'kjfawgefawgefgwuet7wefweyu7ew7fte7tf';

// Simple JWT auth middleware for protected routes
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Debug: log token presence (do not reveal full token in logs in prod)
  if (token) {
    const snippet = token.length > 10 ? token.substring(0, 10) + '...' : token;
    console.log('JWT token detected (snippet):', snippet);
  } else {
    console.log('No JWT token provided in Authorization header');
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = { JWT_SECRET, protect };
