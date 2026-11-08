/**
 * =============================================================================
 * CampusFind - Database Configuration
 * =============================================================================
 * 
 * This module sets up a PostgreSQL connection pool using the 'pg' library.
 * It reads database credentials from environment variables (.env file) and
 * exports a reusable pool instance for executing SQL queries throughout
 * the application.
 * 
 * The connection pool efficiently manages multiple database connections,
 * reusing them across requests to avoid the overhead of creating a new
 * connection for every query.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a new PostgreSQL connection pool with configuration from env vars
const pool = new Pool({
  user: process.env.DB_USER,       // Database username (default: postgres)
  host: process.env.DB_HOST,       // Database host (default: localhost)
  database: process.env.DB_NAME,   // Database name (campusfind_db)
  password: process.env.DB_PASSWORD, // Database password
  port: process.env.DB_PORT,       // Database port (default: 5432)
});

/**
 * Test the database connection on startup.
 * Logs a success message if the connection is established,
 * or an error message if it fails.
 */
pool.connect()
  .then((client) => {
    console.log('✅ PostgreSQL connected successfully to:', process.env.DB_NAME);
    client.release(); // Release the client back to the pool
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err.message);
  });

module.exports = pool;
