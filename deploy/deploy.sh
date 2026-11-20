#!/usr/bin/env bash
#
# Greensound — deploy da eseguire SUL SERVER, dalla home, con sudo.
#
#   cd ~
#   curl -fsSLO https://raw.githubusercontent.com/alainbindele/greensound_site/main/deploy/deploy.sh
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# Installa o aggiorna il sito in /var/www/greensound partendo da git. Va bene
# su un server vuoto, su un'installazione fatta col pacchetto e su un checkout
# già esistente: database, allegati e account (data/) non vengono mai toccati.
#
# Rispetto a deploy/update.sh, questo script vive fuori dal sito e prepara
# quello che update.sh dà per scontato: Node 22 di sistema, il checkout git,
# il servizio systemd. Poi passa la mano a update.sh per compilare e riavviare.
#
# Opzioni:
#   --dir <percorso>    cartella del sito (default /var/www/greensound)
#   --repo <url>        repository (default il repo pubblico su GitHub)
#   --branch <nome>     branch da installare (default main)
#
set -euo pipefail

APP_DIR="/var/www/greensound"
REPO="https://github.com/alainbindele/greensound_site.git"
BRANCH="main"
NODE_MAJOR=22

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)    APP_DIR="${2:?manca il percorso dopo --dir}"; shift 2 ;;
    --repo)   REPO="${2:?manca il repository dopo --repo}"; shift 2 ;;
    --branch) BRANCH="${2:?manca il nome dopo --branch}"; shift 2 ;;
    -h|--help)
      sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Opzione sconosciuta: $1  (vedi --help)" >&2; exit 1 ;;
  esac
done
APP_DIR="${APP_DIR%/}"

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${OFF}"; }
ok()   { echo "  ${GREEN}✓${OFF} $*"; }
warn() { echo "  ${YELLOW}!${OFF} $*"; }
die()  { echo "  ${RED}✗${OFF} $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Esegui con sudo:  sudo $0"
[[ "$APP_DIR" == /* ]] || die "--dir vuole un percorso assoluto, non \"$APP_DIR\""

# Lanciato con sudo dalla home la cartella corrente è quella dell'utente:
# niente di quello che segue deve dipenderne, quindi si lavora da /.
cd /

if command -v apt-get >/dev/null 2>&1; then PKG=apt; SVC_USER=www-data
elif command -v dnf >/dev/null 2>&1;   then PKG=dnf; SVC_USER=apache
else die "serve una distribuzione con apt (Ubuntu/Debian) o dnf (Amazon Linux/RHEL)"
fi

pkg_install() {
  if [[ $PKG == apt ]]; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null
  else
    dnf install -y -q "$@" >/dev/null
  fi
}

# ---------------------------------------------------------------------------
step "Strumenti di base"
# ---------------------------------------------------------------------------
missing=()
for cmd in git curl; do command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd"); done
if (( ${#missing[@]} )); then
  [[ $PKG == apt ]] && apt-get update -qq
  pkg_install "${missing[@]}"
  ok "installati: ${missing[*]}"
else
  ok "git e curl presenti"
fi

# ---------------------------------------------------------------------------
step "Node.js $NODE_MAJOR"
# ---------------------------------------------------------------------------
# Il servizio systemd lancia /usr/bin/node con ProtectHome=true: un Node
# installato con nvm nella home non lo vede né sudo né il servizio. Conta solo
# quello di sistema.
node_major() { /usr/bin/node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

if (( $(node_major) >= NODE_MAJOR )); then
  ok "presente: $(/usr/bin/node -v)"
else
  if (( $(node_major) > 0 )); then
    warn "trovato $(/usr/bin/node -v), troppo vecchio — installo Node $NODE_MAJOR"
  else
    warn "Node di sistema assente — installo Node $NODE_MAJOR (NodeSource)"
  fi
  if [[ $PKG == apt ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  else
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  fi
  pkg_install nodejs
  (( $(node_major) >= NODE_MAJOR )) || die "installazione di Node $NODE_MAJOR non riuscita"
  ok "installato: $(/usr/bin/node -v)"
fi
export PATH="/usr/bin:$PATH"

# ---------------------------------------------------------------------------
step "Codice"
# ---------------------------------------------------------------------------
# Il repo si scarica comunque in una cartella temporanea: da lì vengono
# l'unità systemd e, alla prima installazione, update.sh stesso.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$WORK/repo" \
  || die "clone di $REPO ($BRANCH) fallito.
  Se il repository è privato, usa una deploy key e passa l'indirizzo SSH:
      sudo $0 --repo git@github.com:alainbindele/greensound_site.git"
ok "$REPO ($BRANCH) @ $(git -C "$WORK/repo" rev-parse --short HEAD)"

if [[ -d "$APP_DIR/.git" ]]; then
  # Un checkout clonato a mano dall'utente appartiene a lui, non a root:
  # senza questa eccezione git rifiuta di lavorarci ("dubious ownership").
  if ! git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$APP_DIR"; then
    git config --global --add safe.directory "$APP_DIR"
  fi
  current="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ -n "$current" && "$current" != "$REPO" ]]; then
    warn "il checkout punta a $current — lo allineo a $REPO"
    git -C "$APP_DIR" remote set-url origin "$REPO"
  fi
  # Si usa l'update.sh appena scaricato, non quello già sul server: il vecchio
  # verrebbe riscritto da git mentre è in esecuzione.
  UPDATE=("$WORK/repo/deploy/update.sh" --dir "$APP_DIR" --branch "$BRANCH")
  ok "aggiorno il checkout esistente in $APP_DIR"
else
  mkdir -p "$APP_DIR"
  if [[ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
    ok "$APP_DIR non è un checkout git: lo converto (data/ viene salvata prima)"
  else
    ok "prima installazione in $APP_DIR"
  fi
  # update.sh con --repo crea il checkout e mette al sicuro data/.
  UPDATE=("$WORK/repo/deploy/update.sh" --repo "$REPO" --dir "$APP_DIR" --branch "$BRANCH")
fi

# ---------------------------------------------------------------------------
step "Servizio systemd"
# ---------------------------------------------------------------------------
UNIT=/etc/systemd/system/greensound.service
if [[ -f "$UNIT" ]]; then
  ok "già installato"
else
  # L'unità del repo è scritta per /var/www/greensound e www-data: si
  # adattano cartella e utente se diversi.
  sed -e "s#/var/www/greensound#$APP_DIR#g" \
      -e "s#^User=www-data#User=$SVC_USER#" \
      -e "s#^Group=www-data#Group=$SVC_USER#" \
      "$WORK/repo/deploy/greensound.service" > "$UNIT"
  systemctl daemon-reload
  systemctl enable greensound >/dev/null 2>&1
  ok "installato e abilitato all'avvio"
fi

# ---------------------------------------------------------------------------
#  Compilazione e riavvio: il resto lo fa update.sh
# ---------------------------------------------------------------------------
bash "${UPDATE[@]}"

# ---------------------------------------------------------------------------
#  Promemoria per la prima installazione
# ---------------------------------------------------------------------------
notes=()
admins="$(cd "$APP_DIR" && /usr/bin/node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.argv[1], { readonly: true, fileMustExist: true });
  process.stdout.write(String(db.prepare("SELECT COUNT(*) AS n FROM users").get().n));
' "$APP_DIR/data/greensound.db" 2>/dev/null || echo 0)"
if [[ "$admins" == "0" ]]; then
  notes+=("Crea l'account amministratore:
      cd $APP_DIR && sudo -u $SVC_USER env HOME=/tmp npm run admin")
fi
if [[ $PKG == apt && ! -f /etc/apache2/sites-enabled/greensound.conf ]] \
   || [[ $PKG == dnf && ! -f /etc/httpd/conf.d/greensound.conf ]]; then
  notes+=("Il virtual host Apache non è configurato: il sito gira su 127.0.0.1:3001
    ma non è raggiungibile da fuori. Segui i passi 8-9 di $APP_DIR/deploy/UBUNTU.md")
fi
if (( ${#notes[@]} )); then
  echo "${BOLD}Da fare a mano:${OFF}"
  for n in "${notes[@]}"; do echo "  - $n"; done
  echo
fi
