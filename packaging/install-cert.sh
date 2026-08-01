#!/usr/bin/env bash
#
# Greensound — installa un certificato TLS sul deploy già esistente.
#
#   sudo ./install-cert.sh sito.key sito.crt
#   sudo ./install-cert.sh tutto.pem
#   sudo ./install-cert.sh sito.key sito.crt ca-bundle.crt
#
# Puoi passare i file in qualsiasi ordine e in qualsiasi combinazione: lo
# script legge i blocchi PEM e capisce da solo qual è la chiave privata, quale
# il certificato del server e quali gli intermedi della CA. Dominio, cartella
# e porta li rileva dal virtual host installato da deploy.sh.
#
set -euo pipefail

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${OFF}"; }
ok()   { echo "  ${GREEN}✓${OFF} $*"; }
warn() { echo "  ${YELLOW}!${OFF} $*"; }
die()  { echo "  ${RED}✗${OFF} $*" >&2; exit 1; }

DOMAIN_OVERRIDE=""
FILES=()

usage() {
  cat <<'EOF'
Uso: sudo ./install-cert.sh <file...> [--domain <dominio>]

  <file...>           Uno o più file PEM contenenti, in qualunque ordine:
                      la chiave privata, il certificato del server e
                      gli eventuali certificati intermedi della CA.
                      Possono stare tutti nello stesso file o essere separati.

  --domain <dominio>  Forza il dominio invece di rilevarlo dal virtual host.

Esempi:
  sudo ./install-cert.sh sito.key sito.crt
  sudo ./install-cert.sh sito.key sito.crt ca-bundle.crt
  sudo ./install-cert.sh certificato-completo.pem
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN_OVERRIDE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Opzione sconosciuta: $1" >&2; usage; exit 1 ;;
    *) FILES+=("$1"); shift ;;
  esac
done

# ---------------------------------------------------------------------------
#  Controlli preliminari
# ---------------------------------------------------------------------------
step "Controlli preliminari"

[[ $EUID -eq 0 ]] || die "Esegui con sudo:  sudo ./install-cert.sh <file...>"
[[ ${#FILES[@]} -gt 0 ]] || { usage; die "Nessun file indicato"; }
for f in "${FILES[@]}"; do [[ -f "$f" ]] || die "file non trovato: $f"; done

command -v openssl >/dev/null 2>&1 || die "openssl non installato:  sudo apt install openssl  /  sudo dnf install openssl"

. /etc/os-release 2>/dev/null || die "distribuzione non riconosciuta"
case "${ID}${ID_LIKE:-}" in
  *debian*|*ubuntu*) APACHE_SVC="apache2"; VHOST="/etc/apache2/sites-available/greensound.conf" ;;
  *rhel*|*fedora*|*amzn*) APACHE_SVC="httpd"; VHOST="/etc/httpd/conf.d/greensound.conf" ;;
  *) die "distribuzione non supportata: ${PRETTY_NAME:-$ID}" ;;
esac

[[ -f "$VHOST" ]] || die "virtual host non trovato: $VHOST
  Esegui prima deploy.sh — questo script aggiunge HTTPS a un sito già installato."
ok "deploy trovato: $VHOST"

# Il vhost esistente è la fonte di verità per dominio, cartella e porta.
# Ogni estrazione termina con `|| true`: con set -o pipefail un grep che non
# trova nulla farebbe fallire l'assegnazione e set -e chiuderebbe lo script
# senza stampare niente.
DOMAIN="${DOMAIN_OVERRIDE:-$(grep -m1 -E '^\s*ServerName' "$VHOST" | awk '{print $2}' || true)}"
APP_DIST="$(grep -m1 -E '^\s*DocumentRoot' "$VHOST" | awk '{print $2}' || true)"
PORT="$(grep -m1 -oE 'http://127\.0\.0\.1:[0-9]+' "$VHOST" | head -1 | sed 's/.*://' || true)"
ALIAS_LINE="$(grep -m1 -E '^\s*ServerAlias' "$VHOST" || true)"
ERROR_LOG="$(grep -m1 -E '^\s*ErrorLog' "$VHOST" | awk '{print $2}' || true)"
LOG_DIR="$(dirname "${ERROR_LOG:-/var/log/apache2/greensound-error.log}")"

[[ -n "$DOMAIN"    ]] || die "impossibile rilevare il dominio: passalo con --domain"
[[ -n "$APP_DIST"  ]] || die "impossibile rilevare DocumentRoot dal virtual host"
[[ -n "$PORT"      ]] || PORT="3001"
ok "dominio: $DOMAIN   sito: $APP_DIST   API: 127.0.0.1:$PORT"

# ---------------------------------------------------------------------------
#  Lettura dei file PEM
# ---------------------------------------------------------------------------
step "Lettura dei file"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
chmod 700 "$TMP"

# I file .cer e .der sono spesso in formato binario DER invece che PEM: li
# convertiamo prima, altrimenti la lettura dei blocchi non troverebbe nulla.
PREPARED=()
for f in "${FILES[@]}"; do
  if grep -q -- '-----BEGIN' "$f" 2>/dev/null; then
    PREPARED+=("$f")
    continue
  fi
  conv="$TMP/converted-$(basename "$f").pem"
  if openssl x509 -inform DER -in "$f" -outform PEM -out "$conv" 2>/dev/null; then
    ok "$(basename "$f"): convertito da DER a PEM"
    PREPARED+=("$conv")
  elif openssl pkey -inform DER -in "$f" -outform PEM -out "$conv" 2>/dev/null; then
    ok "$(basename "$f"): chiave convertita da DER a PEM"
    PREPARED+=("$conv")
  else
    die "$(basename "$f") non è né PEM né DER.
  Se è un archivio .pfx/.p12 estrai prima le parti:
      openssl pkcs12 -in file.pfx -nocerts -nodes  -out sito.key
      openssl pkcs12 -in file.pfx -clcerts -nokeys -out sito.crt
      openssl pkcs12 -in file.pfx -cacerts -nokeys -out ca-bundle.crt"
  fi
done
FILES=("${PREPARED[@]}")

# Ogni certificato finisce in un file separato; la chiave in uno solo.
# L'indice del file di partenza fa parte del nome: awk riparte da capo a ogni
# invocazione, e senza quel prefisso il certificato del secondo file
# sovrascriverebbe quello del primo.
file_index=0
for f in "${FILES[@]}"; do
  file_index=$((file_index + 1))
  awk -v dir="$TMP" -v fi="$file_index" '
    /-----BEGIN CERTIFICATE-----/ { n++; file=sprintf("%s/cert-%03d-%03d.pem", dir, fi, n); inb=1 }
    inb { print > file }
    /-----END CERTIFICATE-----/   { inb=0; close(file) }
  ' "$f"
  awk -v out="$TMP/key.pem" '
    /-----BEGIN .*PRIVATE KEY-----/ { inb=1 }
    inb { print > out }
    /-----END .*PRIVATE KEY-----/   { inb=0 }
  ' "$f"
done

shopt -s nullglob
CERTS=("$TMP"/cert-*.pem)
shopt -u nullglob

[[ -s "$TMP/key.pem" ]] || die "nessuna chiave privata trovata nei file indicati.
  Se hai un file .pfx/.p12, estraila prima:
      openssl pkcs12 -in certificato.pfx -nocerts -nodes -out sito.key
      openssl pkcs12 -in certificato.pfx -clcerts -nokeys -out sito.crt"
[[ ${#CERTS[@]} -gt 0 ]] || die "nessun certificato trovato nei file indicati.
  Hai passato solo la chiave privata: serve anche il certificato rilasciato
  dalla CA (di solito un file .crt, .cer o .pem)."
ok "trovati: 1 chiave privata, ${#CERTS[@]} certificat$([[ ${#CERTS[@]} -eq 1 ]] && echo o || echo i)"

# Una chiave con passphrase bloccherebbe Apache all'avvio in attesa che
# qualcuno la digiti alla console.
if grep -qE 'ENCRYPTED' "$TMP/key.pem"; then
  die "la chiave è protetta da passphrase. Rimuovila e ripassa il file:
      openssl pkey -in <chiave> -out sito-senza-passphrase.key"
fi
openssl pkey -in "$TMP/key.pem" -noout 2>/dev/null || die "la chiave privata non è leggibile o non è in formato PEM"

# ---------------------------------------------------------------------------
#  Quale certificato appartiene alla chiave
# ---------------------------------------------------------------------------
step "Abbinamento chiave e certificato"

# Il certificato del server è quello la cui chiave pubblica coincide con la
# privata. Confrontare le chiavi pubbliche funziona sia per RSA sia per EC.
KEY_PUB="$(openssl pkey -in "$TMP/key.pem" -pubout 2>/dev/null)"
LEAF=""
CHAIN_PARTS=()

for c in "${CERTS[@]}"; do
  cpub="$(openssl x509 -in "$c" -noout -pubkey 2>/dev/null || true)"
  if [[ -n "$cpub" && "$cpub" == "$KEY_PUB" && -z "$LEAF" ]]; then
    LEAF="$c"
  else
    CHAIN_PARTS+=("$c")
  fi
done

[[ -n "$LEAF" ]] || die "nessuno dei certificati corrisponde alla chiave privata.
  Controlla di aver passato il certificato giusto: chiave e certificato
  devono provenire dalla stessa richiesta (CSR)."
ok "certificato del server individuato"

# ---------------------------------------------------------------------------
#  Intermedi mancanti: si recuperano dal certificato stesso
# ---------------------------------------------------------------------------
# Senza catena molti client (Android, curl, client API) rifiutano la
# connessione: i browser desktop spesso rimediano da soli, ma non è garantito.
# L'estensione "Authority Information Access" del certificato contiene l'URL
# da cui scaricare il certificato di chi l'ha emesso, quindi la catena si può
# ricostruire senza chiedere niente alla CA.
if [[ ${#CHAIN_PARTS[@]} -eq 0 ]]; then
  warn "nessun certificato intermedio fornito — provo a scaricarlo"

  current="$LEAF"
  for depth in 1 2 3; do
    # `|| true` obbligatorio: con set -o pipefail un grep che non trova nulla
    # fa fallire l'assegnazione e set -e ucciderebbe lo script in silenzio.
    aia="$(openssl x509 -in "$current" -noout -text 2>/dev/null \
      | grep -A1 'Authority Information Access' \
      | grep -oE 'CA Issuers - URI:\S+' | sed 's/.*URI://' | head -1 || true)"
    [[ -n "$aia" ]] || break

    fetched="$TMP/aia-$depth.bin"
    curl -fsSL --max-time 20 -o "$fetched" "$aia" 2>/dev/null || break

    # Le CA pubblicano l'intermedio in DER, in PEM o dentro un bundle PKCS#7.
    pem="$TMP/chain-$depth.pem"
    openssl x509 -inform DER -in "$fetched" -outform PEM -out "$pem" 2>/dev/null \
      || openssl x509 -in "$fetched" -outform PEM -out "$pem" 2>/dev/null \
      || openssl pkcs7 -inform DER -in "$fetched" -print_certs -out "$pem" 2>/dev/null \
      || openssl pkcs7 -in "$fetched" -print_certs -out "$pem" 2>/dev/null \
      || break
    [[ -s "$pem" ]] || break

    # Un certificato autofirmato è la root e non va servita. Non basta però:
    # molte CA pubblicano all'URL AIA la versione *cross-firmata* della
    # propria root, che autofirmata non è.
    subj="$(openssl x509 -in "$pem" -noout -subject 2>/dev/null || true)"
    issu="$(openssl x509 -in "$pem" -noout -issuer  2>/dev/null || true)"
    [[ -n "$subj" && "$subj" == "$issu" ]] && break

    CHAIN_PARTS+=("$pem")
    ok "scaricato: $(echo "$subj" | sed 's/.*CN *= *//; s/,.*//')"
    current="$pem"

    # Appena la catena basta a validare il certificato ci fermiamo: tutto
    # quello che c'è oltre è già nel trust store dei client, e mandarlo a
    # ogni handshake sarebbe solo banda sprecata.
    cat "${CHAIN_PARTS[@]}" > "$TMP/chain-so-far.pem"
    if openssl verify -untrusted "$TMP/chain-so-far.pem" "$LEAF" >/dev/null 2>&1; then
      ok "catena completa"
      break
    fi
  done

  [[ ${#CHAIN_PARTS[@]} -gt 0 ]] \
    || warn "recupero non riuscito — il sito funzionerà, ma alcuni client potrebbero
    rifiutare la connessione. Chiedi il CA bundle a chi ti ha emesso il certificato."
fi

if [[ ${#CHAIN_PARTS[@]} -gt 0 ]]; then
  ok "catena: ${#CHAIN_PARTS[@]} certificat$([[ ${#CHAIN_PARTS[@]} -eq 1 ]] && echo "o intermedio" || echo "i intermedi")"
fi

# Se la catena è completa, openssl deve saper validare il certificato usando
# gli intermedi più le root di sistema.
if [[ ${#CHAIN_PARTS[@]} -gt 0 ]]; then
  cat "${CHAIN_PARTS[@]}" > "$TMP/chain-check.pem"
  if openssl verify -untrusted "$TMP/chain-check.pem" "$LEAF" >/dev/null 2>&1; then
    ok "catena verificata fino a una CA riconosciuta"
  else
    warn "la catena non risale a una CA riconosciuta da questo server:
    $(openssl verify -untrusted "$TMP/chain-check.pem" "$LEAF" 2>&1 | tail -1)"
  fi
fi

# ---------------------------------------------------------------------------
#  Controlli sul certificato
# ---------------------------------------------------------------------------
step "Verifica del certificato"

# `|| true` anche qui: un certificato senza SAN farebbe fallire openssl -ext
# e, con pipefail, morire lo script.
CN="$(openssl x509 -in "$LEAF" -noout -subject 2>/dev/null | sed 's/.*CN *= *//; s/,.*//' || true)"
SAN="$(openssl x509 -in "$LEAF" -noout -ext subjectAltName 2>/dev/null | tr -d ' ' | tr ',' '\n' | sed -n 's/^DNS://p' | paste -sd' ' - || true)"
ISSUER="$(openssl x509 -in "$LEAF" -noout -issuer 2>/dev/null | sed 's/.*CN *= *//; s/,.*//' || true)"

ok "intestato a: ${CN:-?}${SAN:+   (SAN: $SAN)}"
ok "emesso da:   ${ISSUER:-?}"

covers="no"
[[ "$CN" == "$DOMAIN" ]] && covers="si"
[[ " $SAN " == *" $DOMAIN "* ]] && covers="si"
# Wildcard: *.esempio.com copre www.esempio.com ma non esempio.com
for entry in $CN $SAN; do
  [[ "$entry" == '*.'* && "$DOMAIN" == *".${entry#\*.}" ]] && covers="si"
done
[[ "$covers" == "si" ]] && ok "copre $DOMAIN" \
  || warn "NON sembra coprire $DOMAIN — i browser mostreranno un avviso di sicurezza"

if openssl x509 -in "$LEAF" -noout -checkend 0 >/dev/null 2>&1; then
  ok "valido fino al $(openssl x509 -in "$LEAF" -noout -enddate | cut -d= -f2)"
  openssl x509 -in "$LEAF" -noout -checkend 2592000 >/dev/null 2>&1 || warn "scade entro 30 giorni"
else
  warn "il certificato è SCADUTO"
fi

# ---------------------------------------------------------------------------
#  Installazione dei file
# ---------------------------------------------------------------------------
step "Installazione"

SSL_DIR="/etc/ssl/greensound"
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"

CERT_FILE="$SSL_DIR/$DOMAIN.crt"
KEY_FILE="$SSL_DIR/$DOMAIN.key"
CHAIN_FILE="$SSL_DIR/$DOMAIN-chain.crt"

install -m 644 -o root -g root "$LEAF" "$CERT_FILE"
# La chiave privata la legge solo root: Apache la apre all'avvio, prima di
# abbassare i privilegi.
install -m 600 -o root -g root "$TMP/key.pem" "$KEY_FILE"

CHAIN_LINE=""
if [[ ${#CHAIN_PARTS[@]} -gt 0 ]]; then
  cat "${CHAIN_PARTS[@]}" > "$TMP/chain.pem"
  install -m 644 -o root -g root "$TMP/chain.pem" "$CHAIN_FILE"
  CHAIN_LINE="    SSLCertificateChainFile $CHAIN_FILE"
fi
ok "$SSL_DIR  (chiave 600, solo root)"

# ---------------------------------------------------------------------------
#  Virtual host
# ---------------------------------------------------------------------------
step "Virtual host"

BACKUP="$VHOST.$(date +%Y%m%d-%H%M%S).bak"
cp "$VHOST" "$BACKUP"
ok "backup: $BACKUP"

# Su Debian/Ubuntu mod_ssl va abilitato esplicitamente.
if [[ "$APACHE_SVC" == "apache2" ]]; then
  a2enmod ssl headers >/dev/null 2>&1 || true
fi

cat > "$VHOST" <<VHOSTEOF
# Greensound — generato da install-cert.sh il $(date '+%Y-%m-%d %H:%M:%S')
# Backup della versione precedente: $BACKUP

<VirtualHost *:80>
    ServerName $DOMAIN
$ALIAS_LINE
    # Tutto il traffico in chiaro va su HTTPS.
    RedirectPermanent / https://$DOMAIN/
</VirtualHost>

<VirtualHost *:443>
    ServerName $DOMAIN
$ALIAS_LINE
    DocumentRoot $APP_DIST

    ErrorLog  $LOG_DIR/greensound-error.log
    CustomLog $LOG_DIR/greensound-access.log combined

    SSLEngine on
    SSLCertificateFile    $CERT_FILE
    SSLCertificateKeyFile $KEY_FILE
$CHAIN_LINE

    SSLProtocol         -all +TLSv1.2 +TLSv1.3
    SSLCipherSuite      ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305
    SSLHonorCipherOrder  off
    SSLSessionTickets    off

    # API e upload verso Node. Devono precedere le regole statiche:
    # ProxyPass ha la precedenza sul filesystem, così /api non finisce mai
    # nel fallback su index.html.
    ProxyPreserveHost On
    ProxyTimeout 60
    ProxyPass        /api     http://127.0.0.1:$PORT/api
    ProxyPassReverse /api     http://127.0.0.1:$PORT/api
    ProxyPass        /uploads http://127.0.0.1:$PORT/uploads
    ProxyPassReverse /uploads http://127.0.0.1:$PORT/uploads

    # Senza questo Node crederebbe di stare dietro HTTP e non restituirebbe
    # il cookie di sessione, marcato Secure: il login non funzionerebbe.
    RequestHeader set X-Forwarded-Proto "https"

    LimitRequestBody 12582912

    <Directory $APP_DIST>
        Require all granted
        Options -Indexes +FollowSymLinks
        AllowOverride None

        # Routing lato client: /Events e /AdminNews non sono file su disco.
        FallbackResource /index.html
    </Directory>

    <IfModule mod_expires.c>
        ExpiresActive On
        <LocationMatch "^/assets/">
            ExpiresDefault "access plus 1 year"
            Header set Cache-Control "public, immutable"
        </LocationMatch>
        <LocationMatch "^/(index\.html)?\$">
            ExpiresDefault "access plus 0 seconds"
            Header set Cache-Control "no-cache, must-revalidate"
        </LocationMatch>
    </IfModule>

    <IfModule mod_headers.c>
        Header always set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; media-src 'self'; frame-ancestors 'self'"
    </IfModule>
</VirtualHost>
VHOSTEOF

# Se la configurazione non è valida si torna indietro: meglio un sito in HTTP
# che un Apache che non riparte.
if ! apachectl configtest >/dev/null 2>&1; then
  echo
  apachectl configtest || true
  cp "$BACKUP" "$VHOST"
  die "configurazione non valida — ripristinata la versione precedente, il sito resta in HTTP"
fi
ok "configurazione valida"

# ---------------------------------------------------------------------------
#  Ricarica e verifica
# ---------------------------------------------------------------------------
step "Ricarica di Apache"

if ! systemctl reload "$APACHE_SVC" 2>/dev/null; then
  systemctl restart "$APACHE_SVC" || {
    cp "$BACKUP" "$VHOST"
    systemctl restart "$APACHE_SVC" || true
    die "Apache non riparte — ripristinata la configurazione precedente"
  }
fi
ok "ricaricato"

sleep 1
if curl -fsS -k -o /dev/null -w '' "https://127.0.0.1/" -H "Host: $DOMAIN" 2>/dev/null; then
  ok "HTTPS risponde in locale"
else
  warn "HTTPS non risponde ancora in locale: controlla $LOG_DIR/greensound-error.log"
fi

if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/api/health" 2>/dev/null; then
  ok "API attiva"
else
  warn "l'API non risponde: sudo systemctl status greensound"
fi

cat <<EOF

${BOLD}${GREEN}Certificato installato.${OFF}

  Sito         https://$DOMAIN
  CMS          https://$DOMAIN/Login
  Certificato  $CERT_FILE
  Chiave       $KEY_FILE${CHAIN_LINE:+
  Catena       $CHAIN_FILE}
  Backup       $BACKUP

  Verifica dall'esterno:
      curl -I https://$DOMAIN/
      openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | head -15

  Ora che il sito è in HTTPS il login funziona: il cookie di sessione è
  marcato Secure e il browser lo conserva.

  Per tornare indietro:
      sudo cp $BACKUP $VHOST && sudo systemctl reload $APACHE_SVC

EOF
