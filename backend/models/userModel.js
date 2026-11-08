/**
 * =============================================================================
 * CampusFind - User Model
 * =============================================================================
 * 
 * This model encapsulates all database queries related to the users table
 * in the "user" schema. It provides methods for finding users by email or ID,
 * and for creating new user records.
 * 
 * Table: "user".users
 * Columns: user_id, full_name, email, student_id, password_hash,
 *          authentication_provider, role, notification_preferences,
 *          is_active, created_at, updated_at, deleted_at
 */

const pool = require('../config/db');

const UserModel = {

  /**
   * Find a user by their email address.
   * Used during login to retrieve the user record for password verification.
   * 
   * @param {string} email - The user's email address
   * @returns {Object|null} The user row if found, or null
   */
  findByEmail: async (email) => {
    const query = `
      SELECT * FROM "user".users
      WHERE lower(email) = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  },

  /**
   * Find a user by their user_id (primary key).
   * Used to retrieve user profile data after authentication.
   * 
   * @param {number} userId - The user's unique ID
   * @returns {Object|null} The user row if found, or null
   */
  findById: async (userId) => {
    const query = `
      SELECT user_id, full_name, email, student_id, authentication_provider,
             role, notification_preferences, is_active, created_at, updated_at
      FROM "user".users
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  },

  getAllUsers: async () => {
    const query = `
      SELECT user_id, full_name, email, student_id, role,
             authentication_provider, is_active, created_at
      FROM "user".users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC, user_id DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  getAccountStatistics: async () => {
    const result = await pool.query(
      'SELECT * FROM "user".campusfind_account_statistics()'
    );
    return result.rows[0];
  },

  setUserActiveStatus: async (userId, isActive) => {
    const updateQuery = `
      UPDATE "user".users
      SET is_active = $2
      WHERE user_id = $1 AND deleted_at IS NULL AND role <> 'admin'
      RETURNING user_id, full_name, email, student_id, role,
                authentication_provider, is_active, created_at
    `;
    const updated = await pool.query(updateQuery, [userId, isActive]);
    if (updated.rows[0]) {
      return updated.rows[0];
    }

    const existing = await pool.query(`
      SELECT user_id, full_name, email, student_id, role,
             authentication_provider, is_active, created_at
      FROM "user".users
      WHERE user_id = $1 AND deleted_at IS NULL
    `, [userId]);
    return existing.rows[0] || null;
  },

  /**
   * Create a new user in the database.
   * Inserts a record with the provided details and returns the created user.
   * 
   * @param {Object} userData - The new user's data
   * @param {string} userData.full_name - Full name of the user
   * @param {string} userData.email - Email address (must be unique)
   * @param {string} userData.student_id - Student ID number
   * @param {string} userData.password_hash - Bcrypt-hashed password
   * @param {string} [userData.authentication_provider='local'] - Auth provider
   * @param {string} [userData.role='student'] - User role (student/admin)
   * @returns {Object} The newly created user record
   */
  createUser: async ({ full_name, email, student_id, password_hash, authentication_provider = 'email', role = 'student' }) => {
    const query = `
      INSERT INTO "user".users 
        (full_name, email, student_id, password_hash, authentication_provider, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, full_name, email, student_id, role, created_at
    `;
    const values = [full_name, email, student_id, password_hash, authentication_provider, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
};

module.exports = UserModel;
