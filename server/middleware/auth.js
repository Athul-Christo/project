const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token. User not found or inactive.' });
    }

    // Add user info to request
    req.user = decoded;
    req.userProfile = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Optional auth middleware (doesn't fail if no token provided)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (user && user.isActive) {
      req.user = decoded;
      req.userProfile = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.userProfile) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // For now, we'll use a simple role system
    // In a more complex app, you might have a separate Role model
    const userRole = req.userProfile.role || 'user';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    next();
  };
};

// Rate limiting middleware for auth endpoints
const authRateLimit = (req, res, next) => {
  // This would typically use a rate limiting library like express-rate-limit
  // For now, we'll implement a simple version
  const clientIP = req.ip;
  const now = Date.now();
  
  // Simple in-memory rate limiting (in production, use Redis)
  if (!req.app.locals.authAttempts) {
    req.app.locals.authAttempts = new Map();
  }
  
  const attempts = req.app.locals.authAttempts.get(clientIP) || [];
  const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000); // 15 minutes
  
  if (recentAttempts.length >= 5) {
    return res.status(429).json({ 
      error: 'Too many authentication attempts. Please try again later.' 
    });
  }
  
  recentAttempts.push(now);
  req.app.locals.authAttempts.set(clientIP, recentAttempts);
  
  next();
};

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  authRateLimit
}; 