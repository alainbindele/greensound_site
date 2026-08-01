import crypto from 'node:crypto';
import express from 'express';
import { db } from '../db.js';
import {
  SCHEMAS,
  deserialize,
  serialize,
  orderByClause,
} from '../schema.js';
import { requireAdmin } from '../auth.js';

/**
 * One generic CRUD router serving every content type.
 *
 *   GET    /api/entities/:entity        list (public, scoped)
 *   GET    /api/entities/:entity/:id    single record
 *   POST   /api/entities/:entity        create (admin)
 *   PATCH  /api/entities/:entity/:id    update (admin)
 *   DELETE /api/entities/:entity/:id    delete (admin)
 *
 * Reads are public because the site is public. Anything gated — currently
 * unpublished articles — is enforced by `publicScope` in the schema, on the
 * server, regardless of what the client asks for.
 */
export const entitiesRouter = express.Router();

/** Resolves :entity to a schema, 404s on anything not in the model. */
function resolveEntity(req, res, next) {
  const name = req.params.entity;
  if (!Object.prototype.hasOwnProperty.call(SCHEMAS, name)) {
    return res.status(404).json({ error: `Unknown entity: ${name}` });
  }
  req.entityName = name;
  req.schema = SCHEMAS[name];
  next();
}

entitiesRouter.param('entity', (req, res, next) => resolveEntity(req, res, next));

/**
 * Builds a WHERE clause from the query filter, keeping only fields that exist
 * in the schema, then folds in the server-side public scope.
 */
function buildWhere(name, filter, isAdmin) {
  const schema = SCHEMAS[name];
  const clauses = [];
  const params = [];

  const applicable = { ...(filter || {}) };
  if (!isAdmin && schema.publicScope) {
    // Server-imposed scope wins over anything the client sent.
    Object.assign(applicable, schema.publicScope);
  }

  for (const [field, value] of Object.entries(applicable)) {
    const type = schema.fields[field];
    if (!type) continue; // silently ignore unknown fields
    if (type === 'bool') {
      clauses.push(`"${field}" = ?`);
      params.push(value ? 1 : 0);
    } else if (type === 'int') {
      clauses.push(`"${field}" = ?`);
      params.push(Math.trunc(Number(value) || 0));
    } else {
      clauses.push(`"${field}" = ?`);
      params.push(value === null ? null : String(value));
    }
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function parseFilter(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

entitiesRouter.get('/:entity', (req, res) => {
  const name = req.entityName;
  const isAdmin = req.user?.role === 'admin';
  const { sql: where, params } = buildWhere(name, parseFilter(req.query.filter), isAdmin);
  const order = orderByClause(name, req.query.sort);

  const limit = Math.min(Number(req.query.limit) || 500, 500);
  const rows = db
    .prepare(`SELECT * FROM "${req.schema.table}" ${where} ${order} LIMIT ?`)
    .all(...params, limit);

  res.json(rows.map((row) => deserialize(name, row)));
});

entitiesRouter.get('/:entity/:id', (req, res) => {
  const name = req.entityName;
  const row = db
    .prepare(`SELECT * FROM "${req.schema.table}" WHERE id = ?`)
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Not found' });

  // A draft is invisible to anonymous visitors by id, too.
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && req.schema.publicScope) {
    const record = deserialize(name, row);
    for (const [field, value] of Object.entries(req.schema.publicScope)) {
      if (record[field] !== value) return res.status(404).json({ error: 'Not found' });
    }
  }

  res.json(deserialize(name, row));
});

entitiesRouter.post('/:entity', requireAdmin, (req, res) => {
  const name = req.entityName;
  const now = new Date().toISOString();
  const values = serialize(name, req.body || {});

  const record = {
    id: crypto.randomUUID(),
    created_date: now,
    updated_date: now,
    created_by: req.user.email,
    ...values,
  };

  const columns = Object.keys(record);
  db.prepare(
    `INSERT INTO "${req.schema.table}" (${columns.map((c) => `"${c}"`).join(', ')})
     VALUES (${columns.map((c) => `@${c}`).join(', ')})`
  ).run(record);

  const row = db
    .prepare(`SELECT * FROM "${req.schema.table}" WHERE id = ?`)
    .get(record.id);
  res.status(201).json(deserialize(name, row));
});

entitiesRouter.patch('/:entity/:id', requireAdmin, (req, res) => {
  const name = req.entityName;
  const existing = db
    .prepare(`SELECT id FROM "${req.schema.table}" WHERE id = ?`)
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const values = serialize(name, req.body || {});
  values.updated_date = new Date().toISOString();

  const assignments = Object.keys(values)
    .map((column) => `"${column}" = @${column}`)
    .join(', ');

  db.prepare(`UPDATE "${req.schema.table}" SET ${assignments} WHERE id = @id`).run({
    ...values,
    id: req.params.id,
  });

  const row = db
    .prepare(`SELECT * FROM "${req.schema.table}" WHERE id = ?`)
    .get(req.params.id);
  res.json(deserialize(name, row));
});

entitiesRouter.delete('/:entity/:id', requireAdmin, (req, res) => {
  const result = db
    .prepare(`DELETE FROM "${req.schema.table}" WHERE id = ?`)
    .run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});
