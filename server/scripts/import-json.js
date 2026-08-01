/**
 * Bulk-imports content from a JSON export into the local database.
 *
 *   node server/scripts/import-json.js export.json
 *
 * The file is an object keyed by entity name:
 *
 *   {
 *     "Event":         [ { "title_it": "...", "date": "2026-05-01T20:00", ... } ],
 *     "Article":       [ ... ],
 *     "News":          [ ... ],
 *     "Documentation": [ ... ],
 *     "Collaborator":  [ ... ]
 *   }
 *
 * Unknown fields are dropped and ids are regenerated, so an export from any
 * source works as long as the field names match `server/schema.js`. Pass
 * --replace to empty each table before inserting; the default appends.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, migrate } from '../db.js';
import { SCHEMAS, serialize } from '../schema.js';

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: node server/scripts/import-json.js <export.json> [--replace]');
  process.exit(1);
}

const source = path.resolve(file);
if (!fs.existsSync(source)) {
  console.error(`File not found: ${source}`);
  process.exit(1);
}

migrate();

let payload;
try {
  payload = JSON.parse(fs.readFileSync(source, 'utf8'));
} catch (err) {
  console.error(`Could not parse ${source}: ${err.message}`);
  process.exit(1);
}

const unknown = Object.keys(payload).filter((k) => !SCHEMAS[k]);
if (unknown.length) {
  console.warn(`Skipping unknown entities: ${unknown.join(', ')}`);
}

let total = 0;

// One transaction for the whole import: a malformed record halfway through
// leaves the database exactly as it was.
const run = db.transaction(() => {
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const records = payload[name];
    if (!Array.isArray(records) || records.length === 0) continue;

    if (replace) {
      db.prepare(`DELETE FROM "${schema.table}"`).run();
    }

    for (const record of records) {
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        created_date: record.created_date || now,
        updated_date: record.updated_date || now,
        created_by: record.created_by || 'import',
        ...serialize(name, record),
      };
      const columns = Object.keys(row);
      db.prepare(
        `INSERT INTO "${schema.table}" (${columns.map((c) => `"${c}"`).join(', ')})
         VALUES (${columns.map((c) => `@${c}`).join(', ')})`
      ).run(row);
      total += 1;
    }

    console.log(`  ${name}: ${records.length} record(s)`);
  }
});

run();
console.log(`\nImported ${total} record(s)${replace ? ' (tables replaced)' : ''}.`);
