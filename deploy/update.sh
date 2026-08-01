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

step "Dipendenze"
# npm ci rispetta il lockfile: stessa cosa che gira in locale, bit per bit.
npm ci --no-audit --no-fund --loglevel=error
ok "installate"

step "Compilazione del sito"
npm run build --silent
[[ -f "$APP_DIR/dist/index.html" ]] || die "build non riuscita: dist/index.html non è stato generato"
ok "dist/ rigenerato"

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
