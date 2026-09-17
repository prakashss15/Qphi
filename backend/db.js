require('dotenv').config();
const { Pool } = require('pg');

// Supports both:
//   DATABASE_URL (Supabase / Heroku style connection string)
//   Individual DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD fields
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for Supabase
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'taskmanager',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message);
});

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('[DB] Database connection verified ✓');
}).catch(err => {
  console.warn('[DB] Could not connect to database:', err.message);
  console.warn('[DB] Check your DATABASE_URL or DB_* environment variables in .env');
});

module.exports = pool;
