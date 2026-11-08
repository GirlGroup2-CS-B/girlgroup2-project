/**
 * =============================================================================
 * CampusFind - Database Connection Test Script
 * =============================================================================
 * 
 * A simple standalone script to verify that the PostgreSQL database connection
 * is working correctly. Run this script to test connectivity before starting
 * the main application.
 * 
 * Usage:
 *   node test_db.js
 * 
 * It will:
 *   1. Attempt to connect to the PostgreSQL database using .env configuration
 *   2. Execute a simple SELECT query to verify the connection
 *   3. Check if the "user" schema and required tables exist
 *   4. Report the results and exit
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a pool with the same config as the main app
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Run the database connection test.
 */
const testConnection = async () => {
  console.log('===========================================');
  console.log('  CampusFind - Database Connection Test');
  console.log('===========================================\n');

  console.log('Configuration:');
  console.log(`  Host:     ${process.env.DB_HOST}`);
  console.log(`  Port:     ${process.env.DB_PORT}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  User:     ${process.env.DB_USER}`);
  console.log('');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('  ✅ Connection successful!\n');

    // Test 2: Simple query
    console.log('Test 2: Running test query (SELECT NOW())...');
    const timeResult = await client.query('SELECT NOW() AS current_time');
    console.log(`  ✅ Server time: ${timeResult.rows[0].current_time}\n`);

    // Test 3: Check if "user" schema exists
    console.log('Test 3: Checking for "user" schema...');
    const schemaResult = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name = 'user'
    `);
    if (schemaResult.rows.length > 0) {
      console.log('  ✅ "user" schema exists.\n');
    } else {
      console.log('  ⚠️  "user" schema not found. Make sure to run the database initialization script.\n');
    }

    // Test 4: Check for required tables
    console.log('Test 4: Checking for required tables...');
    const tables = ['users', 'item_reports', 'claims', 'notifications'];
    for (const table of tables) {
      const tableResult = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'user' AND table_name = $1
      `, [table]);
      if (tableResult.rows.length > 0) {
        console.log(`  ✅ Table "user".${table} exists.`);
      } else {
        console.log(`  ⚠️  Table "user".${table} not found.`);
      }
    }

    // Release the client back to the pool
    client.release();
    console.log('\n===========================================');
    console.log('  All tests completed!');
    console.log('===========================================');

  } catch (err) {
    console.error('  ❌ Connection failed:', err.message);
    console.error('\nPlease verify your database configuration in the .env file.');
  } finally {
    // Close the pool and exit
    await pool.end();
    process.exit(0);
  }
};

// Run the test
testConnection();
