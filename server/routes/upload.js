import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../auth.js';

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'data', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg'],
  ['application/pdf', '.pdf'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // The client's filename never touches the filesystem: it is the classic
    // path-traversal vector, and it leaks nothing useful anyway.
    const ext = ALLOWED.get(file.mimetype) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

export const uploadRouter = express.Router();

uploadRouter.post('/', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        error: tooBig ? 'File is larger than 10 MB' : err.message,
      });
    }
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    // Relative URL so the same database works behind any hostname.
    res.status(201).json({ file_url: `/uploads/${req.file.filename}` });
  });
});
