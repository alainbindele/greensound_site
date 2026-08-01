#!/usr/bin/env bash
#
# Greensound — installazione e aggiornamento su EC2.
#
#   sudo ./deploy.sh --domain greensoundproject.com
#
# Rieseguilo quando vuoi: è idempotente. Alla prima esecuzione installa tutto,
# alle successive aggiorna solo il codice del sito lasciando intatti database,
# upload e account.
#
set -euo pipefail

# ---------------------------------------------------------------------------
#  Parametri
# ---------------------------------------------------------------------------
DOMAIN=""
WWW_ALIAS="yes"
APP_DIR="/var/www/greensound"
PORT="3001"
DO_FIREWALL="yes"
DO_SSL="no"
SSL_EMAIL=""
CERT_SRC=""
KEY_SRC=""
CHAIN_SRC=""

usage() {
  cat <<'EOF'
Uso: sudo ./deploy.sh --domain <dominio> [opzioni]

  --domain <dominio>    Dominio del sito (obbligatorio).
                        Usa l'IP pubblico dell'istanza se non hai un dominio.
  --dir <percorso>      Dove installare. Default: /var/www/greensound
  --port <numero>       Porta interna dell'API. Default: 3001
  --no-www              Non aggiungere www.<dominio> come alias.
  --no-firewall         Non toccare le regole del firewall.

 HTTPS — scegli UNA delle due strade:

  --ssl <email>         Ottiene un certificato gratuito con certbot.
                        Richiede che il dominio punti già a questo server.

  --cert <file>         Usa un certificato che hai già.
  --key <file>          Chiave privata corrispondente (obbligatoria con --cert).
  --chain <file>        Certificati intermedi della CA (se forniti a parte).

  -h, --help            Questo messaggio.

Esempi:
  sudo ./deploy.sh --domain greensoundproject.com
  sudo ./deploy.sh --domain greensoundproject.com --ssl io@example.com
  sudo ./deploy.sh --domain greensoundproject.com \
       --cert certs/sito.crt --key certs/sito.key --chain certs/ca-bundle.crt
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)       DOMAIN="${2:-}"; shift 2 ;;
    --dir)          APP_DIR="${2:-}"; shift 2 ;;
    --port)         PORT="${2:-}"; shift 2 ;;
    --no-www)       WWW_ALIAS="no"; shift ;;
    --no-firewall)  DO_FIREWALL="no"; shift ;;
    --ssl)          DO_SSL="yes"; SSL_EMAIL="${2:-}"; shift 2 ;;
    --cert)         CERT_SRC="${2:-}"; shift 2 ;;
    --key)          KEY_SRC="${2:-}"; shift 2 ;;
    --chain)        CHAIN_SRC="${2:-}"; shift 2 ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Opzione sconosciuta: $1" >&2; usage; exit 1 ;;
  esac
done

USE_OWN_CERT="no"
[[ -n "$CERT_SRC" ]] && USE_OWN_CERT="yes"

# ---------------------------------------------------------------------------
#  Utilità
# ---------------------------------------------------------------------------
BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
step()  { echo; echo "${BOLD}==> $*${OFF}"; }
ok()    { echo "  ${GREEN}✓${OFF} $*"; }
warn()  { echo "  ${YELLOW}!${OFF} $*"; }
die()   { echo "  ${RED}✗${OFF} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
#  Controlli preliminari
# ---------------------------------------------------------------------------
step "Controlli preliminari"

[[ $EUID -eq 0 ]] || die "Esegui con sudo:  sudo ./deploy.sh --domain <dominio>"
[[ -n "$DOMAIN" ]] || { usage; die "Manca --domain"; }
[[ -d "$SCRIPT_DIR/app" ]] || die "Cartella 'app/' non trovata accanto a deploy.sh"
[[ -f "$SCRIPT_DIR/app/server/index.js" ]] || die "Pacchetto incompleto: manca app/server/index.js"
[[ -f "$SCRIPT_DIR/app/dist/index.html" ]] || die "Pacchetto incompleto: manca app/dist/index.html"

if [[ "$USE_OWN_CERT" == "yes" ]]; then
  [[ "$DO_SSL" == "no" ]] || die "--cert e --ssl sono alternativi: certbot sovrascriverebbe il tuo certificato"
  [[ -n "$KEY_SRC" ]] || die "--cert richiede anche --key"
  [[ -f "$CERT_SRC" ]] || die "certificato non trovato: $CERT_SRC"
  [[ -f "$KEY_SRC"  ]] || die "chiave non trovata: $KEY_SRC"
  [[ -z "$CHAIN_SRC" || -f "$CHAIN_SRC" ]] || die "catena non trovata: $CHAIN_SRC"
fi

# Distribuzione e nomi dei pacchetti: Ubuntu/Debian usa apache2 e www-data,
# Amazon Linux/RHEL usa httpd e apache. Cambiano anche i percorsi dei config.
if [[ -f /etc/os-release ]]; then . /etc/os-release; else die "Distribuzione non riconosciuta"; fi

case "${ID}${ID_LIKE:-}" in
  *debian*|*ubuntu*)
    PKG="apt"; APACHE_SVC="apache2"; APACHE_USER="www-data"
    VHOST_DIR="/etc/apache2/sites-available"; LOG_DIR="/var/log/apache2"
    ;;
  *rhel*|*fedora*|*amzn*)
    PKG="dnf"; APACHE_SVC="httpd"; APACHE_USER="apache"
    VHOST_DIR="/etc/httpd/conf.d"; LOG_DIR="/var/log/httpd"
    ;;
  *) die "Distribuzione non supportata: ${PRETTY_NAME:-$ID}. Supportate: Ubuntu/Debian, Amazon Linux/RHEL." ;;
esac
ok "${PRETTY_NAME:-$ID}  (gestore: $PKG, web server: $APACHE_SVC, utente: $APACHE_USER)"

FIRST_RUN="yes"
[[ -d "$APP_DIR/data" ]] && FIRST_RUN="no"
[[ "$FIRST_RUN" == "yes" ]] && ok "Prima installazione" || ok "Installazione esistente: aggiornamento"

# ---------------------------------------------------------------------------
#  Node.js
# ---------------------------------------------------------------------------
step "Node.js"

need_node="yes"
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$major" -ge 22 ]]; then need_node="no"; ok "già presente: $(node -v)"
  else warn "presente $(node -v), troppo vecchio: installo la 22"; fi
fi

if [[ "$need_node" == "yes" ]]; then
  if [[ "$PKG" == "apt" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq curl ca-certificates >/dev/null
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    apt-get install -y -qq nodejs >/dev/null
  else
    dnf install -y -q nodejs22 npm >/dev/null 2>&1 || dnf install -y -q nodejs npm >/dev/null
    # Amazon Linux installa il binario come node22 quando affianca più versioni.
    if ! command -v node >/dev/null 2>&1 && command -v node22 >/dev/null 2>&1; then
      ln -sf "$(command -v node22)" /usr/bin/node
    fi
  fi
  command -v node >/dev/null 2>&1 || die "installazione di Node fallita"
  ok "installato: $(node -v)"
fi

# better-sqlite3 scarica un binario precompilato; se manca per questa
# combinazione di arch/versione, deve poterlo compilare.
if [[ "$PKG" == "apt" ]]; then
  apt-get install -y -qq build-essential python3 >/dev/null 2>&1 || true
else
  dnf groupinstall -y -q "Development Tools" >/dev/null 2>&1 || true
  dnf install -y -q python3 >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
#  Apache
# ---------------------------------------------------------------------------
step "Apache"

if ! command -v "$APACHE_SVC" >/dev/null 2>&1 && ! systemctl list-unit-files | grep -q "^${APACHE_SVC}.service"; then
  if [[ "$PKG" == "apt" ]]; then apt-get install -y -qq apache2 >/dev/null
  else dnf install -y -q httpd mod_ssl >/dev/null; fi
  ok "installato"
else
  ok "già presente"
fi

if [[ "$PKG" == "apt" ]]; then
  a2enmod proxy proxy_http headers rewrite expires ssl >/dev/null
  a2dissite 000-default >/dev/null 2>&1 || true
  ok "moduli abilitati"
else
  # Su RHEL i moduli sono già caricati da /etc/httpd/conf.modules.d/
  ok "moduli caricati di serie"
fi

# ---------------------------------------------------------------------------
#  Copia del codice
# ---------------------------------------------------------------------------
step "Codice in $APP_DIR"

mkdir -p "$APP_DIR"

# dist/ e server/ vengono sostituiti per intero; data/ non viene mai toccata.
rm -rf "$APP_DIR/dist" "$APP_DIR/server"
cp -r "$SCRIPT_DIR/app/dist"    "$APP_DIR/dist"
cp -r "$SCRIPT_DIR/app/server"  "$APP_DIR/server"
cp    "$SCRIPT_DIR/app/package.json" "$APP_DIR/package.json"
[[ -f "$SCRIPT_DIR/LEGGIMI.md" ]] && cp "$SCRIPT_DIR/LEGGIMI.md" "$APP_DIR/LEGGIMI.md"
ok "sito e server copiati"

step "Dipendenze del server"
cd "$APP_DIR"
npm install --omit=dev --no-audit --no-fund --loglevel=error
ok "dipendenze runtime installate"

# ---------------------------------------------------------------------------
#  Dati e permessi
# ---------------------------------------------------------------------------
step "Dati e permessi"

mkdir -p "$APP_DIR/data/uploads"

# Il progetto è di sola lettura per il servizio; solo data/ è scrivibile.
chown -R root:"$APACHE_USER" "$APP_DIR"
chmod -R g+rX "$APP_DIR"
chown -R "$APACHE_USER":"$APACHE_USER" "$APP_DIR/data"
chmod -R u+rwX "$APP_DIR/data"
ok "data/ scrivibile da $APACHE_USER, resto in sola lettura"

# Apache deve poter attraversare le cartelle superiori per servire dist/.
chmod o+x /var/www 2>/dev/null || true

# ---------------------------------------------------------------------------
#  Servizio systemd
# ---------------------------------------------------------------------------
step "Servizio systemd"

sed -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__PORT__|$PORT|g" \
    -e "s|__USER__|$APACHE_USER|g" \
    -e "s|__GROUP__|$APACHE_USER|g" \
    "$SCRIPT_DIR/config/greensound.service.template" > /etc/systemd/system/greensound.service

systemctl daemon-reload
systemctl enable greensound >/dev/null 2>&1
ok "unità installata"

# ---------------------------------------------------------------------------
#  Virtual host
# ---------------------------------------------------------------------------
step "Virtual host Apache"

alias_line=""
# Un indirizzo IP non può avere un alias www.
if [[ "$WWW_ALIAS" == "yes" && ! "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  alias_line="    ServerAlias www.$DOMAIN"
fi

template="$SCRIPT_DIR/config/apache-vhost.conf.template"
cert_file=""; key_file=""; chain_line=""

# ---------------------------------------------------------------------------
#  Certificato fornito dall'utente
# ---------------------------------------------------------------------------
if [[ "$USE_OWN_CERT" == "yes" ]]; then
  command -v openssl >/dev/null 2>&1 || {
    if [[ "$PKG" == "apt" ]]; then apt-get install -y -qq openssl >/dev/null
    else dnf install -y -q openssl >/dev/null; fi
  }

  # Una chiave protetta da passphrase bloccherebbe Apache all'avvio in attesa
  # che qualcuno la digiti: meglio dirlo adesso.
  if grep -qE 'ENCRYPTED|Proc-Type: 4,ENCRYPTED' "$KEY_SRC"; then
    die "la chiave è protetta da passphrase. Rimuovila con:
      openssl rsa -in $KEY_SRC -out chiave-senza-passphrase.key
    e ripassa quel file a --key"
  fi

  # Il controllo che salva più tempo: certificato e chiave devono
  # corrispondere. Confrontare le chiavi pubbliche funziona sia per RSA
  # sia per le curve ellittiche.
  cert_pub="$(openssl x509 -in "$CERT_SRC" -noout -pubkey 2>/dev/null || true)"
  key_pub="$(openssl pkey -in "$KEY_SRC" -pubout 2>/dev/null || true)"
  [[ -n "$cert_pub" ]] || die "$CERT_SRC non è un certificato PEM valido (se è un .pfx vedi LEGGIMI.md)"
  [[ -n "$key_pub"  ]] || die "$KEY_SRC non è una chiave PEM valida"
  [[ "$cert_pub" == "$key_pub" ]] || die "il certificato e la chiave non corrispondono"
  ok "certificato e chiave corrispondono"

  # Avvisi non bloccanti: il sito parte comunque, ma è bene saperlo.
  cert_cn="$(openssl x509 -in "$CERT_SRC" -noout -subject 2>/dev/null | sed 's/.*CN *= *//;s/,.*//')"
  cert_san="$(openssl x509 -in "$CERT_SRC" -noout -ext subjectAltName 2>/dev/null | tr -d ' ' | tr ',' '\n' | sed -n 's/^DNS://p' | paste -sd' ' -)"
  ok "emesso per: ${cert_cn:-?}${cert_san:+  (SAN: $cert_san)}"
  if ! { [[ "$cert_cn" == "$DOMAIN" ]] || [[ " $cert_san " == *" $DOMAIN "* ]] || [[ "$cert_cn" == "*."* && "$DOMAIN" == *".${cert_cn#\*.}" ]]; }; then
    warn "il certificato non sembra coprire $DOMAIN — il browser mostrerà un avviso"
  fi

  if ! openssl x509 -in "$CERT_SRC" -noout -checkend 0 >/dev/null 2>&1; then
    warn "il certificato è SCADUTO"
  else
    ok "scadenza: $(openssl x509 -in "$CERT_SRC" -noout -enddate | cut -d= -f2)"
    openssl x509 -in "$CERT_SRC" -noout -checkend 2592000 >/dev/null 2>&1 || \
      warn "scade entro 30 giorni"
  fi

  # Installazione: la chiave privata è leggibile solo da root — Apache la
  # legge all'avvio, quando è ancora root, prima di degradare i privilegi.
  ssl_dir="/etc/ssl/greensound"
  mkdir -p "$ssl_dir"
  chmod 700 "$ssl_dir"
  cert_file="$ssl_dir/${DOMAIN}.crt"
  key_file="$ssl_dir/${DOMAIN}.key"
  install -m 644 -o root -g root "$CERT_SRC" "$cert_file"
  install -m 600 -o root -g root "$KEY_SRC"  "$key_file"

  if [[ -n "$CHAIN_SRC" ]]; then
    chain_file="$ssl_dir/${DOMAIN}-chain.crt"
    install -m 644 -o root -g root "$CHAIN_SRC" "$chain_file"
    chain_line="    SSLCertificateChainFile $chain_file"
  fi
  ok "installato in $ssl_dir (chiave 600, solo root)"

  template="$SCRIPT_DIR/config/apache-vhost-ssl.conf.template"
fi

sed -e "s|__DOMAIN__|$DOMAIN|g" \
    -e "s|__SERVER_ALIAS__|$alias_line|g" \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__PORT__|$PORT|g" \
    -e "s|__ERROR_LOG__|$LOG_DIR/greensound-error.log|g" \
    -e "s|__ACCESS_LOG__|$LOG_DIR/greensound-access.log|g" \
    -e "s|__CERT_FILE__|$cert_file|g" \
    -e "s|__KEY_FILE__|$key_file|g" \
    -e "s|__CHAIN_LINE__|$chain_line|g" \
    "$template" > "$VHOST_DIR/greensound.conf"

if [[ "$PKG" == "apt" ]]; then a2ensite greensound >/dev/null; fi

if ! apachectl configtest >/dev/null 2>&1; then
  apachectl configtest || true
  die "configurazione Apache non valida (vedi sopra)"
fi
ok "configurazione valida"

# ---------------------------------------------------------------------------
#  Avvio
# ---------------------------------------------------------------------------
step "Avvio dei servizi"

systemctl restart greensound
systemctl enable "$APACHE_SVC" >/dev/null 2>&1 || true
systemctl restart "$APACHE_SVC"

# L'API impiega un attimo ad aprire la porta.
health=""
for _ in $(seq 1 15); do
  if health="$(curl -fsS "http://127.0.0.1:$PORT/api/health" 2>/dev/null)"; then break; fi
  sleep 1
done
[[ -n "$health" ]] || {
  echo
  journalctl -u greensound -n 30 --no-pager || true
  die "l'API non risponde su 127.0.0.1:$PORT (log qui sopra)"
}
ok "API attiva: $health"

if curl -fsS -o /dev/null "http://127.0.0.1/" -H "Host: $DOMAIN"; then
  ok "Apache serve il sito"
else
  warn "Apache non risponde ancora come atteso: controlla $LOG_DIR/greensound-error.log"
fi

# ---------------------------------------------------------------------------
#  Firewall
# ---------------------------------------------------------------------------
if [[ "$DO_FIREWALL" == "yes" ]]; then
  step "Firewall"
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    ok "ufw: aperte 80 e 443"
  elif command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http  >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    ok "firewalld: aperti http e https"
  else
    warn "nessun firewall locale attivo — su EC2 conta il Security Group: apri 80 e 443 dalla console AWS"
  fi
fi

# ---------------------------------------------------------------------------
#  Account amministratore
# ---------------------------------------------------------------------------
step "Account amministratore"

cd "$APP_DIR"

# node diretto invece di npm: www-data ha spesso una home non scrivibile e
# npm fallirebbe provando a creare la sua cache.
run_as_service() {
  sudo -u "$APACHE_USER" \
    env HOME=/tmp \
        DATABASE_PATH="$APP_DIR/data/greensound.db" \
        UPLOAD_DIR="$APP_DIR/data/uploads" \
        node "$@"
}

admin_count="$(run_as_service server/scripts/count-admins.js 2>/dev/null | tail -1 || echo 0)"
[[ "$admin_count" =~ ^[0-9]+$ ]] || admin_count=0

if [[ "$admin_count" -gt 0 ]]; then
  ok "già presente ($admin_count account) — invariato"
else
  echo "  Nessun amministratore. Creane uno adesso (password: minimo 10 caratteri)."
  echo
  run_as_service server/scripts/set-admin.js
  # Il file appena creato deve restare del servizio.
  chown -R "$APACHE_USER":"$APACHE_USER" "$APP_DIR/data"
fi

# ---------------------------------------------------------------------------
#  HTTPS
# ---------------------------------------------------------------------------
if [[ "$DO_SSL" == "yes" ]]; then
  step "Certificato HTTPS"
  if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
    warn "impossibile emettere un certificato per un indirizzo IP: serve un dominio"
  else
    if [[ "$PKG" == "apt" ]]; then apt-get install -y -qq certbot python3-certbot-apache >/dev/null
    else dnf install -y -q certbot python3-certbot-apache >/dev/null; fi

    domains=(-d "$DOMAIN")
    [[ -n "$alias_line" ]] && domains+=(-d "www.$DOMAIN")

    if certbot --apache --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect "${domains[@]}"; then
      # Sul vhost 443 il protocollo originale è https: senza questo Node
      # crederebbe di essere dietro HTTP e il cookie Secure non tornerebbe.
      ssl_conf="$VHOST_DIR/greensound-le-ssl.conf"
      [[ -f "$ssl_conf" ]] && ! grep -q 'X-Forwarded-Proto' "$ssl_conf" && \
        sed -i 's|</VirtualHost>|    RequestHeader set X-Forwarded-Proto "https"\n</VirtualHost>|' "$ssl_conf"
      systemctl reload "$APACHE_SVC"
      ok "HTTPS attivo con rinnovo automatico"
    else
      warn "certbot non è riuscito: il sito resta in HTTP. Riprova con:"
      echo "      sudo certbot --apache -d $DOMAIN"
    fi
  fi
fi

# ---------------------------------------------------------------------------
#  Riepilogo
# ---------------------------------------------------------------------------
scheme="http"
{ [[ "$DO_SSL" == "yes" ]] || [[ "$USE_OWN_CERT" == "yes" ]]; } && scheme="https"

cat <<EOF

${BOLD}${GREEN}Fatto.${OFF}

  Sito         ${scheme}://${DOMAIN}
  CMS          ${scheme}://${DOMAIN}/Login   (link "Area riservata" in fondo alla pagina)
  Cartella     ${APP_DIR}
  Dati         ${APP_DIR}/data   ← database e allegati: è questo che va nei backup

  Stato        sudo systemctl status greensound
  Log app      sudo journalctl -u greensound -f
  Log Apache   sudo tail -f ${LOG_DIR}/greensound-error.log

EOF

if [[ "$scheme" == "https" ]]; then
  cat <<EOF
  Verifica il certificato dall'esterno:
      curl -I https://${DOMAIN}/
      openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} </dev/null 2>/dev/null | head -12

EOF
fi

if [[ "$scheme" == "http" ]] && [[ ! "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  cat <<EOF
  ${YELLOW}Il sito è in HTTP.${OFF} Il cookie di sessione è marcato Secure in produzione,
  quindi ${BOLD}il login non funzionerà finché non attivi HTTPS${OFF}. Due strade:

      # certificato gratuito automatico
      sudo ./deploy.sh --domain ${DOMAIN} --ssl tua@email.it

      # certificato che hai già
      sudo ./deploy.sh --domain ${DOMAIN} --cert sito.crt --key sito.key --chain ca-bundle.crt

EOF
fi

if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  cat <<EOF
  ${YELLOW}Stai usando un indirizzo IP.${OFF} Non è possibile ottenere un certificato,
  quindi il login non funzionerà. Per usare il CMS ti serve un dominio che
  punti a questa istanza.

EOF
fi

echo "  Per aggiornare in futuro: ricopia la cartella e riesegui questo script."
echo
