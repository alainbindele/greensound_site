# Installazione su Ubuntu con Apache

Guida completa da server vuoto a sito online. Testata come procedura su
Ubuntu 22.04 e 24.04 LTS.

**Come si incastrano i pezzi:** Apache non esegue Node — riceve le richieste
dal mondo, serve i file statici del sito dal disco e inoltra solo `/api` e
`/uploads` al processo Node in ascolto su `127.0.0.1:3001`. Node non è mai
esposto direttamente su internet.

Sostituisci `greensoundproject.com` con il tuo dominio in tutti i comandi.
Prima di iniziare, il dominio deve già puntare all'IP del server (record A).

---

## 1. Node.js 22

Ubuntu di serie ha una versione troppo vecchia. Usa il repository ufficiale
NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # deve stampare v22.x o superiore
```

Il database usa `better-sqlite3`, che su Ubuntu x86-64 scarica un binario
già compilato. Se durante `npm ci` vedi errori di compilazione, mancano gli
strumenti di build:

```bash
sudo apt install -y build-essential python3
```

## 2. Apache e moduli

```bash
sudo apt install -y apache2
sudo a2enmod proxy proxy_http headers rewrite expires ssl
sudo systemctl restart apache2
```

`proxy` e `proxy_http` fanno da ponte verso Node, `headers` serve a passare
l'IP reale del visitatore, `expires` gestisce la cache dei file statici.

## 3. Codice

```bash
sudo mkdir -p /var/www/greensound
sudo chown $USER:$USER /var/www/greensound
git clone <url-del-tuo-repo> /var/www/greensound
cd /var/www/greensound
```

Se non usi git, copia la cartella dal tuo computer — **escludendo
`node_modules`**, che va reinstallato sul server:

```bash
rsync -av --exclude node_modules --exclude dist --exclude data \
  ./ utente@server:/var/www/greensound/
```

## 4. Dipendenze e build

```bash
cd /var/www/greensound
npm ci
npm run build          # genera dist/
```

## 5. Cartella dati e permessi

Qui vivono database e allegati. Deve poterci scrivere l'utente che esegue il
servizio (`www-data`):

```bash
sudo mkdir -p /var/www/greensound/data
sudo chown -R www-data:www-data /var/www/greensound/data
```

Il resto del progetto può restare di sola lettura per `www-data`:

```bash
sudo chown -R root:www-data /var/www/greensound
sudo chmod -R g+rX /var/www/greensound
sudo chown -R www-data:www-data /var/www/greensound/data
```

## 6. Account amministratore

Eseguilo **come `www-data`**, altrimenti il file del database nasce di
proprietà di root e poi il servizio non riesce a scriverci:

```bash
cd /var/www/greensound
sudo -u www-data env HOME=/tmp npm run admin
```

Chiede email e password a prompt (minimo 10 caratteri). Non passarle come
argomenti: finirebbero nella cronologia della shell.

## 7. Servizio systemd

```bash
sudo cp deploy/greensound.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now greensound
sudo systemctl status greensound
```

Verifica che l'API risponda in locale prima di procedere:

```bash
curl http://127.0.0.1:3001/api/health
# {"status":"ok","database":"/var/www/greensound/data/greensound.db"}
```

Se non risponde, guarda i log: `journalctl -u greensound -n 50`

## 8. Virtual host Apache

```bash
sudo cp deploy/apache/greensound.conf /etc/apache2/sites-available/
sudo nano /etc/apache2/sites-available/greensound.conf   # metti il tuo dominio
sudo a2dissite 000-default
sudo a2ensite greensound
sudo apache2ctl configtest     # deve dire "Syntax OK"
sudo systemctl reload apache2
```

## 9. HTTPS

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d greensoundproject.com -d www.greensoundproject.com
```

Certbot inserisce i certificati nel virtual host e configura il rinnovo
automatico. Verificalo con `sudo certbot renew --dry-run`.

**Questo passaggio non è opzionale:** il cookie di sessione è marcato
`Secure` quando `NODE_ENV=production`, quindi senza HTTPS il browser non lo
conserva e il login non funziona.

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

La porta 3001 non va **mai** aperta: Node ascolta solo su loopback e ci
arriva solo Apache.

## 11. Verifica

```bash
curl -I https://greensoundproject.com/                      # 200, text/html
curl    https://greensoundproject.com/api/health            # {"status":"ok",...}
curl -I https://greensoundproject.com/Events                # 200 (rotta SPA)
```

Poi dal browser: apri il sito, vai su **Area riservata** in fondo alla
pagina, accedi e crea un contenuto di prova.

---

## Aggiornare il sito

```bash
cd /var/www/greensound
git pull
npm ci
npm run build
sudo systemctl restart greensound
```

Apache non va toccato: serve `dist/` dal disco, che è appena stato
rigenerato. Il riavvio serve solo se è cambiato il codice del server.

## Backup

Tutto il contenuto del sito è in una sola cartella:

```bash
sudo systemctl stop greensound
sudo tar czf ~/greensound-$(date +%F).tar.gz -C /var/www/greensound data
sudo systemctl start greensound
```

Fermare il servizio garantisce che SQLite non stia scrivendo a metà. Per un
backup a caldo, senza fermare nulla:

```bash
sudo -u www-data sqlite3 /var/www/greensound/data/greensound.db \
  ".backup '/tmp/greensound-backup.db'"
```

(richiede `sudo apt install sqlite3`)

Per il ripristino basta rimettere la cartella `data/` al suo posto e
riavviare il servizio.

## Se qualcosa non va

| Sintomo | Causa quasi sempre |
|---|---|
| 503 Service Unavailable | Node non è in esecuzione: `systemctl status greensound` |
| Il sito si vede ma le pagine sono vuote | `/api` non è proxato: controlla l'ordine delle `ProxyPass`, devono venire prima delle regole statiche |
| Login che non "prende" (torna al form) | Manca HTTPS, oppure `NODE_ENV=production` senza certificato: il cookie `Secure` viene scartato |
| `SQLITE_CANTOPEN` nei log | Permessi su `data/`: deve appartenere a `www-data` |
| 404 su `/Events` ricaricando la pagina | Manca `FallbackResource /index.html` nel blocco `<Directory>` |
| 413 caricando un'immagine | `LimitRequestBody` troppo basso nel virtual host |

Log utili:

```bash
journalctl -u greensound -f                       # applicazione
sudo tail -f /var/log/apache2/greensound-error.log # Apache
```

---

## Variante: Apache inoltra tutto a Node

Se preferisci una configurazione più semplice, `deploy/apache/greensound-proxy-all.conf`
manda ogni richiesta a Node, che serve anche i file statici. Salti la parte
`DocumentRoot` e i permessi di lettura, ma Apache non fa più da cache per gli
asset. Su un sito con questo traffico la differenza è trascurabile: scegli in
base a quanto vuoi tenere semplice il file di configurazione.

## Se il tuo hosting non esegue Node

Su hosting condiviso in cui puoi caricare solo file (tipico Apache + PHP,
senza accesso SSH a processi persistenti) **questa applicazione non può
funzionare**: serve un processo Node sempre attivo. Le alternative sono un VPS
economico (bastano 1 GB di RAM), oppure riscrivere il backend in PHP
mantenendo lo stesso contratto API descritto nel README.
