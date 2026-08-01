#!/usr/bin/env bash
#
# Greensound — aggiornamento del sito da git, da eseguire SUL SERVER.
#
#   sudo /var/www/greensound/deploy/update.sh
#
# Scarica le modifiche, ricompila il sito e riavvia il servizio. Database,
# allegati e account non vengono mai toccati: stanno in data/, che è escluso
# da git.
#
# Alla prima esecuzione converte l'installazione fatta col pacchetto in un
# checkout git, conservando i dati:
#
#   sudo ./update.sh --repo git@github.com:tuo-utente/greensound.git
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/greensound}"
BRANCH="${BRANCH:-main}"
REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)   REPO="${2:-}"; shift 2 ;;
    --dir)    APP_DIR="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,15p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *) echo "Opzione sconosciuta: $1" >&2; exit 1 ;;
  esac
done

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${OFF}"; }
ok()   { echo "  ${GREEN}✓${OFF} $*"; }
warn() { echo "  ${YELLOW}!${OFF} $*"; }
die()  { echo "  ${RED}✗${OFF} $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Esegui con sudo"
command -v git >/dev/null 2>&1 || die "git non installato:  sudo apt install -y git"

. /etc/os-release 2>/dev/null || true
case "${ID}${ID_LIKE:-}" in
  *debian*|*ubuntu*) SVC_USER="www-data" ;;
  *) SVC_USER="apache" ;;
esac

# ---------------------------------------------------------------------------
#  Prima esecuzione: da installazione a pacchetto a checkout git
# ---------------------------------------------------------------------------
if [[ ! -d "$APP_DIR/.git" ]]; then
  step "Conversione in checkout git"
  [[ -n "$REPO" ]] || die "questa cartella non è un checkout git.
  Indica il repository una volta sola:
      sudo $0 --repo git@github.com:tuo-utente/greensound.git"

  # I dati del sito vengono messi al sicuro prima di toccare qualsiasi cosa.
  STASH="/var/backups/greensound-data-$(date +%Y%m%d-%H%M%S)"
  if [[ -d "$APP_DIR/data" ]]; then
    mkdir -p /var/backups
    cp -a "$APP_DIR/data" "$STASH"
    ok "dati messi al sicuro in $STASH"
  fi

  TMP_CLONE="$(mktemp -d)"
  git clone --branch "$BRANCH" "$REPO" "$TMP_CLONE/repo" \
    || die "clone fallito. Se il repo è privato serve una deploy key sul server:
      sudo -u root ssh-keygen -t ed25519 -f /root/.ssh/greensound_deploy -N ''
    e poi aggiungi /root/.ssh/greensound_deploy.pub tra le Deploy keys del repo."

  # Il vecchio contenuto viene rimosso a parte data/, che torna al suo posto.
  find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
  cp -a "$TMP_CLONE/repo/." "$APP_DIR/"
  rm -rf "$TMP_CLONE"
  [[ -d "$APP_DIR/data" ]] || { mkdir -p "$APP_DIR/data/uploads"; [[ -d "$STASH" ]] && cp -a "$STASH/." "$APP_DIR/data/"; }
  ok "checkout creato da $REPO ($BRANCH)"
fi

# ---------------------------------------------------------------------------
#  Aggiornamento
# ---------------------------------------------------------------------------
cd "$APP_DIR"

step "Scarico le modifiche"
BEFORE="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
git fetch --quiet origin "$BRANCH"
# reset --hard invece di pull: la cartella sul server non deve mai avere
# modifiche locali, e un merge a metà lascerebbe il sito in uno stato ibrido.
git reset --hard --quiet "origin/$BRANCH"
AFTER="$(git rev-parse --short HEAD)"

if [[ "$BEFORE" == "$AFTER" ]]; then
  ok "già aggiornato ($AFTER) — ricompilo comunque"
else
  ok "$BEFORE → $AFTER"
  git --no-pager log --oneline "$BEFORE..$AFTER" 2>/dev/null | head -10 | sed 's/^/     /' || true
fi

step "Strumenti di compilazione"
# better-sqlite3 include i binari già compilati, ma porta anche un binding.gyp:
# npm ci lo ricompila comunque da sorgente e senza toolchain fallisce con
# "not found: make". Verificato: `npm install` usa il prebuild, `npm ci` no.
if command -v make >/dev/null 2>&1 && command -v g++ >/dev/null 2>&1; then
  ok "già presenti"
else
  warn "mancanti — li installo (servono a npm ci per better-sqlite3)"
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq && apt-get install -y -qq build-essential python3 >/dev/null
  else
    dnf groupinstall -y -q "Development Tools" >/dev/null 2>&1 || true
    dnf install -y -q python3 >/dev/null 2>&1 || true
  fi
  command -v make >/dev/null 2>&1 || die "installazione degli strumenti di compilazione fallita"
  ok "installati"
fi

step "Spazio su disco"
# Servono ~400 MB di node_modules più il lavoro di compilazione. Finire lo
# spazio a metà di npm ci lascia node_modules monco e il sito senza dist/:
# meglio accorgersene adesso e liberare spazio prima di toccare qualcosa.
NEEDED_MB=1500
FREE_MB="$(df -Pm "$APP_DIR" | awk 'NR==2 {print $4}')"
if [[ "$FREE_MB" -lt "$NEEDED_MB" ]]; then
  warn "solo ${FREE_MB} MB liberi (ne servono ~${NEEDED_MB}) — provo a fare pulizia"
  npm cache clean --force >/dev/null 2>&1 || true
  command -v apt-get >/dev/null 2>&1 && apt-get clean >/dev/null 2>&1 || true
  journalctl --vacuum-size=100M >/dev/null 2>&1 || true
  FREE_MB="$(df -Pm "$APP_DIR" | awk 'NR==2 {print $4}')"
  ok "dopo la pulizia: ${FREE_MB} MB liberi"
fi
if [[ "$FREE_MB" -lt "$NEEDED_MB" ]]; then
  echo
  df -h "$APP_DIR" | sed 's/^/    /'
  echo
  echo "    Cosa occupa più spazio:"
  du -xh --max-depth=1 / 2>/dev/null | sort -rh | head -8 | sed 's/^/      /'
  echo
  die "spazio insufficiente: ${FREE_MB} MB liberi, ne servono almeno ${NEEDED_MB}.
  Libera spazio, oppure allarga il volume EBS dalla console AWS e poi:
      sudo growpart /dev/nvme0n1 1 && sudo resize2fs /dev/nvme0n1p1
  In alternativa usa il pacchetto (packaging/): il server non compila nulla
  e gli servono 80 dipendenze invece di 400 MB."
fi
ok "${FREE_MB} MB liberi"

step "Dipendenze"
# npm ci rispetta il lockfile: stessa cosa che gira in locale, bit per bit.
# L'output va su file e viene mostrato solo se qualcosa va storto: un errore
# che lascia in mano al lettore soltanto il percorso di un log non serve.
NPM_LOG="$APP_DIR/.update-npm.log"
if ! npm ci --no-audit --no-fund > "$NPM_LOG" 2>&1; then
  echo
  echo "  ${BOLD}Ultime righe di npm:${OFF}"
  grep -iE 'npm error|gyp ERR!|ENOSPC|ENOMEM|EACCES|killed' "$NPM_LOG" | tail -25 | sed 's/^/    /'
  echo
  echo "  ${BOLD}Contesto:${OFF}"
  printf '    node %s   npm %s\n' "$(node -v)" "$(npm -v)"
  printf '    disco:  %s\n' "$(df -h "$APP_DIR" | awk 'NR==2 {print $4" liberi su "$2}')"
  printf '    memoria:%s\n' "$(free -h | awk 'NR==2 {print " "$7" disponibili di "$2}')"
  echo
  die "installazione delle dipendenze fallita. Log completo: $NPM_LOG"
fi
ok "installate"

step "Compilazione del sito"
if ! npm run build > "$NPM_LOG" 2>&1; then
  echo
  tail -25 "$NPM_LOG" | sed 's/^/    /'
  echo
  die "compilazione fallita. Log completo: $NPM_LOG"
fi
[[ -f "$APP_DIR/dist/index.html" ]] || die "build non riuscita: dist/index.html non è stato generato"
ok "dist/ rigenerato"

step "Pulizia"
# Vite, React, ESLint e compagnia servono solo a compilare: una volta che
# dist/ esiste, in produzione girano cinque pacchetti. Rimuoverli fa scendere
# node_modules da ~400 MB a ~80 MB fra un aggiornamento e l'altro.
BEFORE_MB="$(du -sm "$APP_DIR/node_modules" 2>/dev/null | cut -f1 || echo 0)"
npm prune --omit=dev --no-audit --no-fund >/dev/null 2>&1 || warn "prune non riuscito (non è grave)"
AFTER_MB="$(du -sm "$APP_DIR/node_modules" 2>/dev/null | cut -f1 || echo 0)"
ok "node_modules: ${BEFORE_MB} MB → ${AFTER_MB} MB"

rm -f "$NPM_LOG"

# La cache di npm è l'unica cosa che cresce davvero a ogni aggiornamento.
# Sopra il mezzo giga la si svuota: costa qualche secondo in più al prossimo
# update, ma su un disco piccolo è spazio che serve altrove.
CACHE_MB="$(du -sm "$(npm config get cache)" 2>/dev/null | cut -f1 || echo 0)"
if [[ "$CACHE_MB" -gt 500 ]]; then
  npm cache clean --force >/dev/null 2>&1 || true
  ok "cache npm svuotata (era ${CACHE_MB} MB)"
else
  ok "cache npm: ${CACHE_MB} MB"
fi

step "Permessi"
mkdir -p "$APP_DIR/data/uploads"
chown -R root:"$SVC_USER" "$APP_DIR"
chmod -R g+rX "$APP_DIR"
chown -R "$SVC_USER":"$SVC_USER" "$APP_DIR/data"
ok "data/ scrivibile da $SVC_USER, resto in sola lettura"

step "Riavvio"
systemctl restart greensound

health=""
for _ in $(seq 1 15); do
  health="$(curl -fsS http://127.0.0.1:3001/api/health 2>/dev/null || true)"
  [[ -n "$health" ]] && break
  sleep 1
done

if [[ -z "$health" ]]; then
  echo
  journalctl -u greensound -n 30 --no-pager || true
  die "l'API non risponde dopo il riavvio (log qui sopra).
  Per tornare alla versione precedente:
      cd $APP_DIR && sudo git reset --hard $BEFORE && sudo $0"
fi
ok "API attiva: $health"

DOMAIN="$(grep -m1 -E '^\s*ServerName' /etc/apache2/sites-available/greensound.conf 2>/dev/null | awk '{print $2}' || true)"
cat <<EOF

${BOLD}${GREEN}Aggiornato alla revisione $AFTER.${OFF}
${DOMAIN:+
  Sito   https://$DOMAIN}
  Log    sudo journalctl -u greensound -f

EOF
