/**
 * Content model.
 *
 * One descriptor per content type drives everything: table creation, request
 * validation, JSON (de)serialisation and the REST routes. Adding a field means
 * editing one line here, not four files.
 *
 * Field types:
 *   text   - TEXT column, stored as-is
 *   int    - INTEGER column
 *   bool   - INTEGER 0/1, exposed to the client as a real boolean
 *   json   - TEXT column holding JSON, exposed as an array/object
 *   date   - TEXT column holding an ISO-8601 string
 */

export const SCHEMAS = {
  Event: {
    table: 'events',
    defaultSort: '-date',
    fields: {
      title_it: 'text',
      title_en: 'text',
      description_it: 'text',
      description_en: 'text',
      date: 'date',
      location: 'text',
      images: 'json',
      image_url: 'text',
      external_link: 'text',
      featured: 'bool',
    },
  },

  Article: {
    table: 'articles',
    defaultSort: '-created_date',
    fields: {
      title_it: 'text',
      title_en: 'text',
      content_it: 'text',
      content_en: 'text',
      excerpt_it: 'text',
      excerpt_en: 'text',
      images: 'json',
      image_url: 'text',
      tags: 'json',
      published: 'bool',
      featured: 'bool',
    },
    // Drafts must never leak to anonymous visitors, whatever query they send.
    publicScope: { published: true },
  },

  News: {
    table: 'news',
    defaultSort: '-created_date',
    fields: {
      title_it: 'text',
      title_en: 'text',
      content_it: 'text',
      content_en: 'text',
      images: 'json',
      image_url: 'text',
      external_link: 'text',
      urgent: 'bool',
    },
  },

  Documentation: {
    table: 'documentation',
    defaultSort: 'order',
    fields: {
      title_it: 'text',
      title_en: 'text',
      content_it: 'text',
      content_en: 'text',
      category: 'text',
      order: 'int',
      file_url: 'text',
    },
  },

  Collaborator: {
    table: 'collaborators',
    defaultSort: 'order',
    fields: {
      name: 'text',
      role_it: 'text',
      role_en: 'text',
      description_it: 'text',
      description_en: 'text',
      image_url: 'text',
      website: 'text',
      instagram: 'text',
      linkedin: 'text',
      twitter: 'text',
      order: 'int',
      is_active: 'bool',
      is_creator: 'bool',
    },
  },
};

/** Columns every record carries, managed by the server rather than the client. */
export const SYSTEM_FIELDS = {
  id: 'text',
  created_date: 'date',
  updated_date: 'date',
  created_by: 'text',
};

const SQL_TYPE = {
  text: 'TEXT',
  int: 'INTEGER',
  bool: 'INTEGER',
  json: 'TEXT',
  date: 'TEXT',
};

export function createTableSql(name) {
  const schema = SCHEMAS[name];
  const columns = [
    'id TEXT PRIMARY KEY',
    'created_date TEXT NOT NULL',
    'updated_date TEXT NOT NULL',
    'created_by TEXT',
    ...Object.entries(schema.fields).map(
      // `order` is a reserved word — quote every identifier rather than
      // special-casing it.
      ([field, type]) => `"${field}" ${SQL_TYPE[type]}`
    ),
  ];
  return `CREATE TABLE IF NOT EXISTS "${schema.table}" (${columns.join(', ')})`;
}

/** DB row -> API record. */
export function deserialize(name, row) {
  if (!row) return null;
  const { fields } = SCHEMAS[name];
  const out = { ...row };
  for (const [field, type] of Object.entries(fields)) {
    if (type === 'bool') {
      out[field] = row[field] === 1;
    } else if (type === 'json') {
      try {
        out[field] = row[field] ? JSON.parse(row[field]) : [];
      } catch {
        out[field] = [];
      }
    }
  }
  return out;
}

/**
 * API payload -> DB values. Unknown keys are dropped, which is what stops a
 * client from writing `id`, `created_by` or any other column it should not own.
 */
export function serialize(name, payload) {
  const { fields } = SCHEMAS[name];
  const out = {};
  for (const [field, type] of Object.entries(fields)) {
    if (!(field in payload)) continue;
    const value = payload[field];
    if (type === 'bool') {
      out[field] = value ? 1 : 0;
    } else if (type === 'json') {
      out[field] = JSON.stringify(value ?? []);
    } else if (type === 'int') {
      const n = Number(value);
      out[field] = Number.isFinite(n) ? Math.trunc(n) : 0;
    } else {
      out[field] = value === undefined || value === null ? null : String(value);
    }
  }
  return out;
}

/** "-created_date" -> ORDER BY "created_date" DESC, validated against the schema. */
export function orderByClause(name, sort) {
  const schema = SCHEMAS[name];
  const raw = sort || schema.defaultSort;
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  const allowed = field in schema.fields || field in SYSTEM_FIELDS;
  if (!allowed) return `ORDER BY "created_date" DESC`;
  return `ORDER BY "${field}" ${desc ? 'DESC' : 'ASC'}`;
}
