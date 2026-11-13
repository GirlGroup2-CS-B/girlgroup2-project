/**
 * =============================================================================
 * CampusFind - JWT Authentication Middleware
 * =============================================================================
 * 
 * This middleware intercepts incoming requests and verifies the JSON Web Token
 * (JWT) provided in the Authorization header. If the token is valid, the
 * decoded user payload (user_id, email, role) is attached to req.user so
 * downstream controllers can identify the authenticated user.
 * 
 * Usage:
 *   router.get('/protected', authenticate, controller.handler);
 * 
 * Expected header format:
 *   Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

/**
 * authenticate - Verifies the JWT token from the Authorization header.
 * 
 * @param {Object} req  - Express request object
 * @param {Object} res  - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  let decoded;
  try {
    // 1. Extract the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Check if the header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided or invalid format.',
        hint: 'Include a valid JWT in the Authorization header as: Bearer <token>'
      });
    }

    // 3. Extract the token (everything after 'Bearer ')
    const token = authHeader.split(' ')[1];

    // 4. Verify the token using the JWT secret
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Handle specific JWT errors for better debugging
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    return res.status(500).json({ error: 'Authentication failed.' });
  }

  try {
    const user = await UserModel.findById(decoded.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account is unavailable. Please sign in again.' });
    }

    req.user = {
      ...decoded,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'user'
    };
    return next();
  } catch (err) {
    console.error('Authentication account lookup failed:', err.message);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * authorizeAdmin - Middleware that checks if the authenticated user has admin role.
 * Must be used AFTER the authenticate middleware.
 * 
 * @param {Object} req  - Express request object (must have req.user set)
 * @param {Object} res  - Express response object
 * @param {Function} next - Express next middleware function
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden. Admin privileges required for this action.'
    });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin };
