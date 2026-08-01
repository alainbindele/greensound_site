import express from 'express';
import {
  findUserByEmail,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  publicUser,
  loginThrottle,
  clearThrottle,
  requireAuth,
} from '../auth.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const key = `${String(email).toLowerCase()}|${req.ip}`;
  const throttle = loginThrottle(key);
  if (throttle.blocked) {
    return res.status(429).json({
      error: 'Too many attempts. Try again later.',
      retry_in_seconds: throttle.retryInSec,
    });
  }

  const user = findUserByEmail(email);
  // Same response and roughly the same timing whether the account exists or
  // not, so this endpoint cannot be used to enumerate accounts.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  clearThrottle(key);
  const { token, expires } = createSession(user.id);
  setSessionCookie(res, token, expires);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  destroySession(readSessionCookie(req));
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});
