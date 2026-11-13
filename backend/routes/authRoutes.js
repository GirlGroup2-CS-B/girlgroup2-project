/**
 * =============================================================================
 * CampusFind - Authentication Routes
 * =============================================================================
 * 
 * Defines the API endpoints for user authentication:
 * 
 *   POST /api/auth/register  - Create a new user account
 *   POST /api/auth/login     - Authenticate and receive a JWT token
 * 
 * These routes are public (no authentication required).
 */

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — Register a new user
router.post('/register', register);

// POST /api/auth/login — Log in and receive an access token
router.post('/login', login);

module.exports = router;
