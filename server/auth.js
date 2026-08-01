import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SESSION_COOKIE = 'gs_session';
const SESSION_DAYS = 14;
const BCRYPT_ROUNDS = 12;

/** Session tokens are stored hashed, so a database leak cannot be replayed. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export function findUserByEmail(email) {
  return db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(String(email).trim().toLowerCase());
}

export function createUser({ email, passwordHash, fullName = null, role = 'admin' }) {
  const user = {
    id: crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    password_hash: passwordHash,
    full_name: fullName,
    role,
    created_date: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO users (id, email, password_hash, full_name, role, created_date)
     VALUES (@id, @email, @password_hash, @full_name, @role, @created_date)`
  ).run(user);
  return user;
}

export function setUserPassword(email, passwordHash) {
  return db
    .prepare(`UPDATE users SET password_hash = ? WHERE email = ?`)
    .run(passwordHash, String(email).trim().toLowerCase());
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_date, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(hashToken(token), userId, now.toISOString(), expires.toISOString());
  return { token, expires };
}

export function destroySession(token) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
}

export function userForToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(hashToken(token), new Date().toISOString());
  return row || null;
}

/** Everything the client is allowed to know about the signed-in user. */
export const publicUser = (user) =>
  user && {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };

export function setSessionCookie(res, token, expires) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  });
}

export const clearSessionCookie = (res) =>
  res.clearCookie(SESSION_COOKIE, { path: '/' });

export const readSessionCookie = (req) => req.cookies?.[SESSION_COOKIE] || null;

/** Populates req.user when a valid session cookie is present. Never rejects. */
export function attachUser(req, _res, next) {
  req.user = userForToken(readSessionCookie(req));
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

/**
 * Throttles password guessing per email+IP. In-memory is enough for a
 * single-process private server; behind several workers, move this to the DB.
 */
const attempts = new Map();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

export function loginThrottle(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return { blocked: false };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { blocked: true, retryInSec: Math.ceil((entry.first + WINDOW_MS - now) / 1000) };
  }
  return { blocked: false };
}

export const clearThrottle = (key) => attempts.delete(key);

export { SESSION_COOKIE };
