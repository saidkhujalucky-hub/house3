-- Run once on the D1 database bound as DB. Safe to run again.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS cf_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  passwordHash TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER','ADMIN')),
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS cf_sessions (
  tokenHash TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES cf_users(id) ON DELETE CASCADE,
  expiresAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cf_sessions_expiry ON cf_sessions(expiresAt);
CREATE TABLE IF NOT EXISTS cf_auth_limits (
  key TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cf_auth_limits_window ON cf_auth_limits(window);
