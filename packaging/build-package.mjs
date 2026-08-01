/**
 * Costruisce il pacchetto di deploy in dist-package/.
 *
 *   npm run package
 *
 * Presuppone che "npm run build" sia già stato eseguito. Il pacchetto contiene
 * il sito compilato, il codice del server e uno script di installazione: sul
 * server non serve né il sorgente del frontend né compilare nulla.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-package', 'greensound-deploy');

const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/');

function copy(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

/**
 * I file di testo devono avere terminazioni LF: un deploy.sh con CRLF muore
 * su Linux con "bad interpreter", e i \r finirebbero dentro la configurazione
 * di Apache e l'unità systemd generate.
 */
function normaliseLineEndings(dir) {
  const exts = new Set(['.sh', '.template', '.md', '.json', '.js']);
  let fixed = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!exts.has(path.extname(p))) continue;
      const buf = fs.readFileSync(p);
      if (!buf.includes(13)) continue;
      fs.writeFileSync(p, buf.toString('utf8').replaceAll('\r\n', '\n'));
      fixed += 1;
    }
  };
  walk(dir);
  return fixed;
}

// --- verifiche preliminari -------------------------------------------------
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('Manca dist/. Esegui prima:  npm run build');
  process.exit(1);
}

// --- assemblaggio ----------------------------------------------------------
fs.rmSync(path.join(ROOT, 'dist-package'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'app'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'config'), { recursive: true });

copy(path.join(ROOT, 'dist'), path.join(OUT, 'app', 'dist'));
copy(path.join(ROOT, 'server'), path.join(OUT, 'app', 'server'));
copy(path.join(ROOT, 'packaging', 'app-package.json'), path.join(OUT, 'app', 'package.json'));
copy(path.join(ROOT, 'packaging', 'deploy.sh'), path.join(OUT, 'deploy.sh'));
 copy(path.join(ROOT, 'packaging', 'install-cert.sh'), path.join(OUT, 'install-cert.sh'));
copy(path.join(ROOT, 'packaging', 'LEGGIMI.md'), path.join(OUT, 'LEGGIMI.md'));
for (const t of ['apache-vhost.conf.template', 'apache-vhost-ssl.conf.template', 'greensound.service.template']) {
  copy(path.join(ROOT, 'packaging', t), path.join(OUT, 'config', t));
}

// server/dev.js serve solo in sviluppo.
fs.rmSync(path.join(OUT, 'app', 'server', 'dev.js'), { force: true });

const fixed = normaliseLineEndings(OUT);
fs.chmodSync(path.join(OUT, 'deploy.sh'), 0o755);
fs.chmodSync(path.join(OUT, 'install-cert.sh'), 0o755);

// --- archivio --------------------------------------------------------------
let archive = null;
try {
  execFileSync('tar', ['czf', 'greensound-deploy.tar.gz', 'greensound-deploy'], {
    cwd: path.join(ROOT, 'dist-package'),
    stdio: 'ignore',
  });
  archive = path.join(ROOT, 'dist-package', 'greensound-deploy.tar.gz');
} catch {
  // tar assente: la cartella da sola è comunque utilizzabile.
}

// --- riepilogo -------------------------------------------------------------
const count = (dir) => {
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name)); else n += 1;
    }
  };
  walk(dir);
  return n;
};

console.log(`\nPacchetto pronto: ${rel(OUT)}`);
console.log(`  ${count(OUT)} file${fixed ? `, ${fixed} normalizzati a LF` : ''}`);
if (archive) console.log(`  archivio: ${rel(archive)}`);
console.log(`
Copialo sul server ed esegui:
  sudo ./deploy.sh --domain <dominio> --ssl <email>
`);
