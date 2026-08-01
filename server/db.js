import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMAS, createTableSql } from './schema.js';

/**
 * SQLite lives in a single file on disk. Point DATABASE_PATH at a volume that
 * survives deploys — everything the site knows is in there.
 */
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data', 'greensound.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// WAL lets reads continue while a write is in flight, and is the right default
// for a read-heavy public site with an occasional CMS write.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  for (const name of Object.keys(SCHEMAS)) {
    db.exec(createTableSql(name));
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_date TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_date TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`);

  // Sort indexes for the two lists that are read on every page view.
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_date)`);
}

/** Drops expired sessions. Called at boot and hourly. */
export function pruneSessions() {
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
}

export { DB_PATH };
