/**
 * =============================================================================
 * CampusFind - Authentication Controller
 * =============================================================================
 * 
 * Handles user registration and login logic.
 * 
 * - register: Validates input, hashes the password with bcryptjs, creates the
 *   user in the database, and returns the new user data.
 * - login: Verifies email and password, then returns a signed JWT access token
 *   along with the user's role for client-side routing.
 * 
 * The JWT payload contains: { user_id, email, role }
 * Token expiration: 24 hours
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

/**
 * Register a new user account.
 * 
 * Expected request body:
 *   { full_name, email, student_id, password }
 * 
 * Validations:
 *   - All required fields must be present
 *   - Email must be in valid format
 *   - Password must be at least 8 characters
 *   - Email must not already be registered
 */
const register = async (req, res) => {
  try {
    const { full_name, email, student_id, password } = req.body;
    const normalizedEmail = typeof email === 'string'
      ? email.trim().toLowerCase()
      : '';

    // --- Input Validation ---

    // Check that all required fields are provided
    if (!full_name || !normalizedEmail || !student_id || !password) {
      return res.status(400).json({
        error: 'All fields are required: full_name, email, student_id, password'
      });
    }

    // Validate email format using a simple regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password minimum length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.'
      });
    }

    // Check if a user with this email already exists
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // --- Create User ---

    // Hash the password with bcrypt (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert the new user into the database
    const newUser = await UserModel.createUser({
      full_name,
      email: normalizedEmail,
      student_id,
      password_hash,
      role: 'student'
    });

    // Return success response with the new user data (no password hash)
    return res.status(201).json({
      message: 'User registered successfully.',
      user: newUser
    });

  } catch (err) {
    console.error('Registration error:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error during registration.', detail: err.message });
  }
};

/**
 * Log in an existing user.
 * 
 * Expected request body:
 *   { email, password }
 * 
 * Returns:
 *   { access_token, role } where role matches the user's database record
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string'
      ? email.trim().toLowerCase()
      : '';

    // --- Input Validation ---
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // --- Find User ---
    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if the user account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    // --- Verify Password ---
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // --- Generate JWT ---
    const role = user.role;
    if (!process.env.JWT_SECRET) {
      console.error('Login failed: JWT_SECRET is not configured.');
      return res.status(500).json({
        error: 'Sign-in is unavailable because the server authentication secret is not configured.'
      });
    }

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role
    };

    const access_token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // Return the token and role
    return res.status(200).json({
      message: 'Login successful.',
      access_token,
      role
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

module.exports = { register, login };
