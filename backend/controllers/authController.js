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
 *   { access_token, role }
 *   - role is 'user' for students, 'admin' for admins
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
    // Map 'student' role to 'user' for the client, keep 'admin' as-is
    const clientRole = user.role === 'admin' ? 'admin' : 'user';
    if (!process.env.JWT_SECRET) {
      console.error('Login failed: JWT_SECRET is not configured.');
      return res.status(500).json({
        error: 'Sign-in is unavailable because the server authentication secret is not configured.'
      });
    }

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: clientRole
    };

    const access_token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // Return the token and role
    return res.status(200).json({
      message: 'Login successful.',
      access_token,
      role: clientRole
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

/**
 * Sign in or register using Google credentials/profile.
 * 
 * Expected request body:
 *   { email, full_name?, student_id?, credential? }
 */
const googleAuth = async (req, res) => {
  try {
    let { email, full_name, student_id, credential } = req.body;

    // Decode Google ID Token (credential) if sent from Google Identity Services
    if (credential && !email) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          email = payload.email;
          full_name = payload.name || full_name;
        }
      } catch (decodeErr) {
        console.warn('Could not decode Google credential token:', decodeErr.message);
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'A valid email is required for Google authentication.' });
    }

    email = email.trim().toLowerCase();

    // Check if user already exists
    let user = await UserModel.findByEmail(email);

    if (!user) {
      const defaultStudentId = student_id || `G-${Date.now().toString().slice(-6)}`;
      const defaultName = full_name || email.split('@')[0];

      user = await UserModel.createUser({
        full_name: defaultName,
        email,
        student_id: defaultStudentId,
        password_hash: null,
        authentication_provider: 'google',
        role: 'student'
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    const clientRole = user.role === 'admin' ? 'admin' : 'user';

    if (!process.env.JWT_SECRET) {
      console.error('Google authentication failed: JWT_SECRET is not configured.');
      return res.status(500).json({
        error: 'Sign-in is unavailable because the server authentication secret is not configured.'
      });
    }

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: clientRole
    };

    const access_token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    return res.status(200).json({
      message: 'Google authentication successful.',
      access_token,
      role: clientRole,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: clientRole
      }
    });

  } catch (err) {
    console.error('Google auth error:', err.message, err.stack);
    return res.status(500).json({
      error: 'Internal server error during Google authentication.',
      detail: err.message
    });
  }
};

module.exports = { register, login, googleAuth };
