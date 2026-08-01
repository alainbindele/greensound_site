/**
 * Stampa quanti account amministratore esistono.
 *
 *   node server/scripts/count-admins.js   ->  "0" | "1" | ...
 *
 * Usato da deploy.sh per decidere se chiedere di creare il primo account.
 * Non fallisce mai: se il database non esiste ancora, la risposta è 0.
 */
import { db, migrate } from '../db.js';

try {
  migrate();
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`).get();
  console.log(c);
} catch {
  console.log(0);
}
