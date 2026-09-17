/**
 * db.js — Smart Database Adapter
 *
 * Tries PostgreSQL first. If connection fails, automatically
 * falls back to SQLite (taskmanager.db in backend folder).
 *
 * Provides a unified `query(sql, params)` interface so all
 * routes work unchanged with either database.
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

// ── Translate PostgreSQL $1,$2,... placeholders → SQLite ? ──
function pgToSqlite(sql) {
  return sql.replace(/\$\d+/g, '?');
}

// ── SQLite Adapter (mirrors pg Pool interface) ──
function createSqliteAdapter() {
  const Database = require('better-sqlite3');
  const dbPath   = path.join(__dirname, 'taskmanager.db');
  const db       = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Load and run schema
  const schemaPath = path.join(__dirname, 'schema-sqlite.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('[DB] SQLite schema applied ✓');
  }

  console.log(`[DB] Using SQLite → ${dbPath}`);

  return {
    isSQLite: true,
    async query(sql, params = []) {
      const translated = pgToSqlite(sql);
      const stmt = db.prepare(translated);

      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
        const rows = stmt.all(...params);
        // Parse JSON fields (assignees stored as JSON string in SQLite)
        return { rows };
      } else if (trimmed.startsWith('INSERT') && /RETURNING/i.test(sql)) {
        const info = stmt.run(...params);
        const tableName = sql.match(/INSERT INTO (\w+)/i)?.[1];
        if (tableName && info.lastInsertRowid) {
          const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(info.lastInsertRowid);
          return { rows: row ? [row] : [] };
        }
        return { rows: [] };
      } else if (trimmed.startsWith('UPDATE') && /RETURNING/i.test(sql)) {
        stmt.run(...params);
        // For UPDATE...RETURNING, extract the WHERE id condition
        const idMatch = sql.match(/WHERE\s+(?:t\.|tasks\.|users\.|projects\.)?id\s*=\s*\$\d+/i);
        const tableName = sql.match(/UPDATE\s+(\w+)/i)?.[1];
        if (tableName && idMatch) {
          const idParamIndex = parseInt(sql.match(/WHERE\s+(?:\w+\.)?id\s*=\s*\$(\d+)/i)?.[1]) - 1;
          const id = params[idParamIndex];
          const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
          return { rows: row ? [row] : [] };
        }
        return { rows: [] };
      } else {
        stmt.run(...params);
        return { rows: [] };
      }
    },
  };
}

// ── PostgreSQL Adapter ──
function createPgAdapter() {
  const { Pool } = require('pg');

  const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      })
    : new Pool({
        host:                    process.env.DB_HOST     || 'localhost',
        port:                    parseInt(process.env.DB_PORT || '5432'),
        database:                process.env.DB_NAME     || 'taskmanager',
        user:                    process.env.DB_USER     || 'postgres',
        password:                process.env.DB_PASSWORD || '',
        connectionTimeoutMillis: 5000,
      });

  pool.isSQLite = false;
  return pool;
}

// ── Main: Try PostgreSQL, fall back to SQLite ──
let adapter = null;

async function getAdapter() {
  if (adapter) return adapter;

  // Try PostgreSQL
  try {
    const pg = createPgAdapter();
    await pg.query('SELECT 1'); // Test connection
    console.log('[DB] Connected to PostgreSQL ✓');
    adapter = pg;
    return adapter;
  } catch (err) {
    console.warn('[DB] PostgreSQL unavailable:', err.message);
    console.warn('[DB] Falling back to SQLite...');
  }

  // Fall back to SQLite
  try {
    adapter = createSqliteAdapter();
    console.log('[DB] Connected to SQLite ✓');
    return adapter;
  } catch (err) {
    console.error('[DB] SQLite also failed:', err.message);
    throw new Error('No database available');
  }
}

// ── Proxy object — routes call db.query() directly ──
// This initialises the adapter on first use
const db = {
  isSQLite: false,
  async query(sql, params) {
    const a = await getAdapter();
    db.isSQLite = a.isSQLite;
    return a.query(sql, params);
  },
};

// Eagerly initialise on startup
getAdapter().catch(err => console.error('[DB] Init error:', err.message));

module.exports = db;
