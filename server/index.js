import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { migrate, pruneSessions, DB_PATH } from './db.js';
import { attachUser } from './auth.js';
import { entitiesRouter } from './routes/entities.js';
import { authRouter } from './routes/auth.js';
import { uploadRouter, UPLOAD_DIR } from './routes/upload.js';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

migrate();
pruneSessions();
setInterval(pruneSessions, 3600_000).unref();

const app = express();

// Behind nginx/Caddy this makes req.ip the real client address, which the
// login throttle depends on.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

// API responses are never cacheable. Without this the browser applies
// heuristic caching to plain 200s, and a list re-fetched right after a write
// comes back stale — the CMS looked like it had saved nothing.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', database: DB_PATH })
);

// Uploaded files. `dotfiles: 'deny'` and no directory listing; SVGs are served
// as downloads rather than rendered, since an SVG can carry script.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    dotfiles: 'deny',
    index: false,
    maxAge: '30d',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (path.extname(filePath).toLowerCase() === '.svg') {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// In production the same process serves the built frontend, so there is one
// thing to run and no CORS. In development Vite serves it and proxies here.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  // Client-side routing: anything not matched above is handed to index.html.
  // A bare `app.use` rather than `app.get('*')` — Express 5 no longer accepts
  // a lone '*' as a path pattern.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[greensound] API on http://localhost:${PORT}`);
  console.log(`[greensound] database: ${DB_PATH}`);
  console.log(`[greensound] uploads:  ${UPLOAD_DIR}`);
  if (!fs.existsSync(DIST_DIR)) {
    console.log('[greensound] no dist/ yet — run "npm run build" to serve the site from here');
  }
});
