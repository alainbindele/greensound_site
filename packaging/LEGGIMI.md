# Greensound — pacchetto di installazione

Contiene il sito già compilato e il server. Sul server non serve né compilare
né avere il codice sorgente del frontend.

## Installazione

Copia questa cartella sull'istanza EC2 e lancia lo script:

```bash
scp -i chiave.pem -r greensound-deploy ec2-user@IP:~/
ssh -i chiave.pem ec2-user@IP
cd ~/greensound-deploy
chmod +x deploy.sh
sudo ./deploy.sh --domain greensoundproject.com --ssl tua@email.it
```

Su Ubuntu l'utente è `ubuntu` invece di `ec2-user`.

Lo script installa Node, Apache, il servizio systemd e il virtual host, poi
chiede email e password del primo amministratore. Alla fine stampa gli
indirizzi e i comandi utili.

**Prima di eseguirlo:** nel Security Group dell'istanza devono essere aperte
le porte **80** e **443**. Il firewall interno lo gestisce lo script, ma il
Security Group AWS no — quello si apre dalla console.

**Se usi `--ssl`,** il dominio deve già puntare all'IP dell'istanza: certbot
verifica il dominio via HTTP prima di emettere il certificato.

## Senza dominio

Puoi installare usando l'IP pubblico:

```bash
sudo ./deploy.sh --domain 13.48.7.22 --no-www
```

Il sito pubblico si vedrà, ma **il CMS non funzionerà**: il cookie di
sessione è marcato `Secure` in produzione e senza HTTPS il browser lo scarta.
Per un certificato serve un dominio.

## Opzioni

```
--domain <dominio>    obbligatorio
--dir <percorso>      dove installare (default /var/www/greensound)
--port <numero>       porta interna dell'API (default 3001)
--no-www              non aggiungere l'alias www.
--no-firewall         non toccare ufw/firewalld
--ssl <email>         ottiene il certificato HTTPS con certbot
```

## Installare un certificato che hai già

Se non usi `--ssl` perché il certificato l'hai comprato tu:

```bash
sudo ./install-cert.sh chiave.key certificato.crt ca-bundle.crt
```

Passa i file in qualsiasi ordine: lo script legge i blocchi PEM e capisce da
solo qual è la chiave privata, quale il certificato del server e quali gli
intermedi. Vanno bene anche tutti in un file unico. Nome ed estensione non
contano, conta il contenuto.

Serve **sia** la chiave **sia** il certificato: con la sola chiave privata
HTTPS non può funzionare, e lo script te lo dice subito.

Rileva dominio, cartella e porta dal virtual host già installato, verifica che
chiave e certificato corrispondano, fa il backup della configurazione e se
Apache non riparte torna indietro da solo.

## Aggiornare il sito

Ricopia la cartella aggiornata e riesegui lo stesso comando. Lo script è
idempotente: sostituisce sito e server, **lascia intatti database, allegati e
account**.

```bash
sudo ./deploy.sh --domain greensoundproject.com
```

## Dopo l'installazione

| | |
|---|---|
| Sito | `https://<dominio>` |
| CMS | link **Area riservata** in fondo alla pagina, oppure `/Login` |
| Dati | `/var/www/greensound/data` — database e allegati |
| Stato | `sudo systemctl status greensound` |
| Log | `sudo journalctl -u greensound -f` |

### Backup

Tutto il contenuto del sito sta in una cartella:

```bash
sudo tar czf ~/greensound-$(date +%F).tar.gz -C /var/www/greensound data
```

Per il ripristino rimetti `data/` al suo posto e riavvia il servizio.

## Contenuto del pacchetto

```
deploy.sh                        script di installazione e aggiornamento
app/dist/                        sito compilato (HTML, JS, CSS, immagini)
app/server/                      backend Node: API, autenticazione, upload
app/package.json                 5 dipendenze runtime, installate dallo script
config/apache-vhost.conf.template
config/greensound.service.template
```

## Se qualcosa non va

| Sintomo | Causa quasi sempre |
|---|---|
| `deploy.sh: /bin/bash^M: bad interpreter` | file copiato da Windows: `sed -i 's/\r$//' deploy.sh` |
| Il sito non si apre dall'esterno | Security Group AWS: porte 80/443 chiuse |
| 503 Service Unavailable | Node non parte: `sudo journalctl -u greensound -n 50` |
| Login che torna sempre al form | manca HTTPS |
| `SQLITE_CANTOPEN` | permessi su `data/`: `sudo chown -R www-data:www-data /var/www/greensound/data` |

Lo script si ferma al primo errore e mostra il log dell'applicazione se
l'API non risponde.
