# Greensound Project

Sito e CMS del progetto bio-musicale Greensound. Applicazione autonoma:
frontend React + backend Node, database SQLite su file, nessun servizio esterno.

## Requisiti

- Node.js 22 o superiore

## Avvio in locale

```bash
npm install
npm run admin          # crea l'account amministratore (chiede email e password)
npm run dev            # avvia API su :3001 e sito su :5173
```

Apri http://localhost:5173. Per entrare nel CMS usa il link **Area riservata**
in fondo alla pagina, oppure vai direttamente su `/Login`. Una volta dentro,
il pulsante **Admin** nella barra in alto porta ai pannelli e l'icona accanto
esegue il logout.

I pannelli sono `/AdminEvents`, `/AdminArticles`, `/AdminNews`,
`/AdminDocumentation`, `/AdminCollaborators`.

`npm run dev` avvia due processi insieme: l'API Express e Vite. Vite inoltra
`/api` e `/uploads` all'API, così il browser vede una sola origine e il cookie
di sessione si comporta esattamente come in produzione.

## Messa in produzione

```bash
npm ci
npm run build          # genera dist/
npm run admin          # solo la prima volta
NODE_ENV=production npm start
```

`npm start` avvia un unico processo che serve sia l'API sia il sito compilato
sulla porta `PORT` (default 3001). Davanti va un web server che gestisce HTTPS.

**Guida completa per Ubuntu + Apache: [deploy/UBUNTU.md](deploy/UBUNTU.md)** —
dal server vuoto al sito online, con systemd, certificati e backup.

File pronti in [deploy/](deploy):

| File | A cosa serve |
|---|---|
| `apache/greensound.conf` | virtual host: Apache serve `dist/`, inoltra `/api` e `/uploads` a Node |
| `apache/greensound-proxy-all.conf` | variante più semplice: Apache inoltra tutto a Node |
| `greensound.service` | unità systemd, riavvia il servizio al boot e dopo un crash |

Con nginx o Caddy la logica è la stessa: file statici da `dist/`, proxy di
`/api` e `/uploads` su `127.0.0.1:3001`, e l'header `X-Forwarded-For` inoltrato
perché il rate limiting del login veda l'IP reale.

## Aggiornare il sito già online

Una volta che il server è un checkout git, aggiornare è un comando solo — non
serve rigenerare nessun pacchetto:

```bash
sudo /var/www/greensound/deploy/update.sh
```

[update.sh](deploy/update.sh) scarica le modifiche, reinstalla le dipendenze,
ricompila `dist/` e riavvia il servizio. Se l'API non risponde dopo il riavvio
si ferma e mostra i log, indicando il comando per tornare indietro. `data/` non
viene mai toccata: è esclusa da git.

**Prima volta**, per convertire un'installazione fatta col pacchetto in un
checkout git (i dati vengono copiati al sicuro prima di procedere):

```bash
sudo ./update.sh --repo git@github.com:tuo-utente/greensound.git
```

Con [.github/workflows/deploy.yml](.github/workflows/deploy.yml) il passaggio
diventa automatico: ogni push su `main` esegue lint e build, e solo se passano
lancia `update.sh` sul server via SSH.

Il pacchetto in [packaging/](packaging) resta utile per la **prima**
installazione su una macchina nuova, o se preferisci non avere git sul server.

## Configurazione

Tutte le variabili sono opzionali e documentate in [.env.example](.env.example).
Le due che contano davvero in produzione:

| Variabile | Perché |
|---|---|
| `NODE_ENV=production` | rende il cookie di sessione `Secure` (solo HTTPS) |
| `DATABASE_PATH` / `UPLOAD_DIR` | puntali su un volume persistente |

## Dati

Tutto il contenuto del sito vive in due posti:

- `data/greensound.db` — database SQLite
- `data/uploads/` — immagini e allegati caricati dal CMS

**Il backup del sito è la copia di questa cartella.** Entrambi sono esclusi da
git.

Per importare contenuti da un export JSON:

```bash
npm run import -- contenuti.json
```

Il formato atteso è documentato in
[server/scripts/import-json.js](server/scripts/import-json.js). Aggiungi
`--replace` per svuotare le tabelle prima di inserire.

## Struttura

```
server/
  index.js            avvio Express, serve API + dist/ + uploads
  schema.js           modello dei contenuti — la fonte di verità
  db.js               connessione SQLite e migrazioni
  auth.js             password, sessioni, middleware di autorizzazione
  routes/             auth, entities (CRUD generico), upload
  scripts/            set-admin, import-json
src/
  api/                client HTTP: entities.js, integrations.js, client.js
  components/kit/     primitive UI condivise
  components/visuals/ canvas bio-segnale e sintetizzatore WebAudio
  pages/              pagine pubbliche e pannelli admin
```

Per aggiungere un campo a un tipo di contenuto basta modificarlo in
`server/schema.js`: tabella, validazione e rotte REST si adeguano da sole.

## API

Le rotte sono le stesse per ogni tipo di contenuto (`Event`, `Article`, `News`,
`Documentation`, `Collaborator`):

```
GET    /api/entities/:entity?filter={...}&sort=-created_date
GET    /api/entities/:entity/:id
POST   /api/entities/:entity            admin
PATCH  /api/entities/:entity/:id        admin
DELETE /api/entities/:entity/:id        admin

POST   /api/auth/login                  { email, password }
POST   /api/auth/logout
GET    /api/auth/me

POST   /api/upload                      admin, multipart "file"
GET    /api/health
```

Le letture sono pubbliche perché il sito è pubblico. Gli articoli non
pubblicati restano invisibili a chi non è amministratore: il filtro è imposto
dal server, non dal client.

## Sicurezza

- Password con hash bcrypt (12 round)
- Sessioni in cookie `HttpOnly` + `SameSite=Lax`, token salvato hashato nel
  database
- Rate limiting sul login (8 tentativi per email+IP ogni 15 minuti)
- Upload: solo tipi noti, massimo 10 MB, nome file generato dal server
- Gli SVG caricati vengono serviti come download, non renderizzati

## Licenza

Progetto open source — https://github.com/alainbindele/greensound
