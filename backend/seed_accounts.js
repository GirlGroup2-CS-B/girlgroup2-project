require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const userHash = await bcrypt.hash('User123!', 10);

    // Upsert admin
    await pool.query(
      `INSERT INTO "user".users (full_name, email, student_id, password_hash, role, authentication_provider)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
      ['System Administrator', 'admin@campusfind.edu', 'ADM-001', adminHash, 'admin', 'email']
    );
    console.log('Admin account ready: admin@campusfind.edu (password: Admin123!)');

    // Upsert student user
    await pool.query(
      `INSERT INTO "user".users (full_name, email, student_id, password_hash, role, authentication_provider)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'student'`,
      ['Student Demo', 'student@campusfind.edu', 'STU-2024-001', userHash, 'student', 'email']
    );
    console.log('Student account ready: student@campusfind.edu (password: User123!)');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

seed();
