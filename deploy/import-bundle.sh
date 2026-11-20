#!/usr/bin/env bash
#
# Greensound — importa un pacchetto di contenuti (eventi, team, news…) nel
# sito in produzione. Da eseguire SUL SERVER, con sudo, da qualsiasi cartella.
#
#   sudo ./import-bundle.sh <url-o-file-del-pacchetto>
#
# Il pacchetto è un .tar.gz con uno o più file JSON nel formato di
# server/scripts/import-json.js (es. { "Event": [ ... ] }) e una cartella
# uploads/ con le immagini a cui i JSON fanno riferimento.
#
# Lo script scarica il pacchetto, sposta le immagini in data/uploads e importa
# i JSON come utente del servizio, così il database resta scrivibile dal sito.
# Prima di importare controlla che nessun contenuto esista già (stesso titolo
# o nome): rilanciarlo per sbaglio non crea doppioni.
#
# Opzioni:
#   --dir <percorso>   cartella del sito (default /var/www/greensound)
#   --force            importa anche se trova contenuti già presenti
#
set -euo pipefail

APP_DIR="/var/www/greensound"
FORCE=0
SOURCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)   APP_DIR="${2:?manca il percorso dopo --dir}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Opzione sconosciuta: $1  (vedi --help)" >&2; exit 1 ;;
    *)  SOURCE="$1"; shift ;;
  esac
done

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${OFF}"; }
ok()   { echo "  ${GREEN}✓${OFF} $*"; }
warn() { echo "  ${YELLOW}!${OFF} $*"; }
die()  { echo "  ${RED}✗${OFF} $*" >&2; exit 1; }

[[ -n "$SOURCE" ]] || die "indica il pacchetto:  sudo $0 https://…/pacchetto.tar.gz"
# GS_TEST permette di provarlo in locale senza root, con SVC_USER = sé stessi.
[[ $EUID -eq 0 || -n "${GS_TEST:-}" ]] || die "Esegui con sudo:  sudo $0 $SOURCE"
[[ -f "$APP_DIR/server/scripts/import-json.js" ]] || die "$APP_DIR non sembra il sito Greensound (manca server/scripts/import-json.js)"
[[ -d "$APP_DIR/node_modules/better-sqlite3" ]] || die "dipendenze mancanti in $APP_DIR: esegui prima deploy/update.sh"

if [[ -z "${SVC_USER:-}" ]]; then
  SVC_USER="$(stat -c %U "$APP_DIR/data" 2>/dev/null || true)"
  [[ -n "$SVC_USER" && "$SVC_USER" != root ]] || SVC_USER="www-data"
fi
id "$SVC_USER" >/dev/null 2>&1 || die "l'utente del servizio \"$SVC_USER\" non esiste"

# Comandi che toccano il database girano come utente del servizio: un file
# creato da root (es. il -wal di SQLite) bloccherebbe poi il sito.
as_svc() {
  if [[ "$SVC_USER" == "$(id -un)" ]]; then env HOME=/tmp "$@"
  else sudo -u "$SVC_USER" env HOME=/tmp "$@"; fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------------------
step "Pacchetto"
# ---------------------------------------------------------------------------
if [[ -f "$SOURCE" ]]; then
  cp "$SOURCE" "$WORK/bundle.tar.gz"
  ok "file locale: $SOURCE"
else
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 -o "$WORK/bundle.tar.gz" "$SOURCE" || die "download fallito: $SOURCE (link scaduto?)"
  else
    wget -q -O "$WORK/bundle.tar.gz" "$SOURCE" || die "download fallito: $SOURCE (link scaduto?)"
  fi
  ok "scaricato: $(du -h "$WORK/bundle.tar.gz" | cut -f1)"
fi

mkdir -p "$WORK/x"
tar -xzf "$WORK/bundle.tar.gz" -C "$WORK/x" 2>/dev/null \
  || die "il file non è un .tar.gz valido (se arriva da un link, forse è una pagina web e non il file)"
# I file ._* sono metadati macOS finiti nell'archivio: non sono contenuti.
find "$WORK/x" -name '._*' -delete

shopt -s nullglob
JSONS=("$WORK"/x/*.json)
IMAGES=("$WORK"/x/uploads/*)
shopt -u nullglob
(( ${#JSONS[@]} )) || die "nel pacchetto non c'è nessun file .json"
ok "${#JSONS[@]} file di dati, ${#IMAGES[@]} immagini"

# L'utente del servizio deve poter leggere i JSON nella cartella temporanea.
chmod 755 "$WORK" "$WORK/x"
chmod 644 "${JSONS[@]}"

# ---------------------------------------------------------------------------
step "Controllo doppioni"
# ---------------------------------------------------------------------------
# Un contenuto è "già presente" se esiste un record dello stesso tipo con lo
# stesso nome (team) o titolo italiano (eventi, articoli, news, documenti).
CHECK_JS='
const { SCHEMAS } = await import(process.cwd() + "/server/schema.js");
const Database = (await import("better-sqlite3")).default;
const fs = await import("node:fs");
const dbPath = process.env.DATABASE_PATH || process.cwd() + "/data/greensound.db";
const db = fs.existsSync(dbPath) ? new Database(dbPath, { readonly: true }) : null;
let total = 0, dupes = 0;
for (const file of process.argv.slice(1)) {
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [entity, records] of Object.entries(payload)) {
    const schema = SCHEMAS[entity];
    if (!schema || !Array.isArray(records)) { console.log(`  ! tipo sconosciuto ignorato: ${entity}`); continue; }
    const key = "name" in schema.fields ? "name" : "title_it";
    const exists = (() => {
      if (!db) return () => false;
      try { const q = db.prepare(`SELECT 1 FROM "${schema.table}" WHERE "${key}" = ? LIMIT 1`); return (v) => !!q.get(v); }
      catch { return () => false; }  // tabella non ancora creata
    })();
    for (const r of records) {
      total++;
      if (exists(r[key])) { dupes++; console.log(`  già presente  ${entity}: ${r[key]}`); }
      else console.log(`  nuovo         ${entity}: ${r[key]}`);
    }
  }
}
console.log(`__RESULT__ ${total} ${dupes}`);
'
CHECK_OUT="$(cd "$APP_DIR" && as_svc node --input-type=module -e "$CHECK_JS" "${JSONS[@]}")" \
  || die "controllo non riuscito:
$CHECK_OUT"
grep -v '^__RESULT__' <<<"$CHECK_OUT"
read -r _ TOTAL DUPES < <(grep '^__RESULT__' <<<"$CHECK_OUT")

if (( DUPES > 0 && FORCE == 0 )); then
  die "$DUPES contenuti su $TOTAL sono già nel sito: non importo nulla per non creare doppioni.
  Se vuoi davvero aggiungerli di nuovo:  sudo $0 --force $SOURCE"
fi
(( DUPES > 0 )) && warn "--force: importo anche i $DUPES già presenti"
ok "$TOTAL contenuti da importare"

# ---------------------------------------------------------------------------
step "Immagini"
# ---------------------------------------------------------------------------
UPLOADS="$APP_DIR/data/uploads"
mkdir -p "$UPLOADS"
moved=0; kept=0
for img in "${IMAGES[@]}"; do
  name="$(basename "$img")"
  if [[ -e "$UPLOADS/$name" ]]; then kept=$((kept + 1)); continue; fi
  mv "$img" "$UPLOADS/$name"
  chown "$SVC_USER":"$SVC_USER" "$UPLOADS/$name" 2>/dev/null || true
  chmod 644 "$UPLOADS/$name"
  moved=$((moved + 1))
done
msg="$moved spostate in $UPLOADS"
(( kept )) && msg+=", $kept già presenti"
ok "$msg"

# ---------------------------------------------------------------------------
step "Import"
# ---------------------------------------------------------------------------
for json in "${JSONS[@]}"; do
  (cd "$APP_DIR" && as_svc node server/scripts/import-json.js "$json") | sed 's/^/  /'
done

DOMAIN="$(grep -m1 -E '^\s*ServerName' /etc/apache2/sites-available/greensound.conf 2>/dev/null | awk '{print $2}' || true)"
echo
echo "${BOLD}${GREEN}Fatto.${OFF} I contenuti sono già visibili sul sito, non serve riavviare.${DOMAIN:+
  https://$DOMAIN}"
echo
