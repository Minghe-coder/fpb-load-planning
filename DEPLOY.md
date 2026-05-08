# Deploy FPB Load Planning — Guida completa

Stack: **Hetzner VPS** + **Docker Compose** + **Caddy** (HTTPS automatico) + **SQLite**

---

## 1. Crea il VPS su Hetzner

1. Vai su [hetzner.com/cloud](https://www.hetzner.com/cloud) → crea account
2. **Nuovo server:**
   - Location: Falkenstein o Helsinki (più vicino all'Italia)
   - Image: **Ubuntu 22.04**
   - Tipo: **CX22** (2 vCPU, 4 GB RAM) → €4,51/mese
   - SSH Key: aggiungi la tua chiave pubblica (o usa password)
   - Nome: `fpb-load-planning`
3. Prendi nota dell'**IP pubblico** (es. `65.21.100.200`)

---

## 2. Punta il dominio al VPS

Nel pannello DNS del tuo registrar (Aruba, Namecheap, ecc.):

```
A    @        65.21.100.200    (root del dominio)
A    www      65.21.100.200    (opzionale)
```

Attendi la propagazione DNS (5-60 minuti). Verifica con:
```bash
nslookup tuo-dominio.com
```

---

## 3. Configura il server

Connettiti via SSH:
```bash
ssh root@65.21.100.200
```

### Installa Docker
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

### Crea la cartella app
```bash
mkdir -p /opt/fpb
cd /opt/fpb
```

---

## 4. Carica il codice sul server

**Opzione A — da Git (consigliata):**
```bash
# Sul server
apt install git -y
git clone https://github.com/TUO-UTENTE/fpb-load-planning.git /opt/fpb
cd /opt/fpb
```

**Opzione B — copia diretta da Windows:**
```powershell
# Da PowerShell sul tuo PC
scp -r "C:\Users\Elia\Desktop\Load Planning\*" root@65.21.100.200:/opt/fpb/
```

---

## 5. Crea il file .env di produzione

Sul server:
```bash
cd /opt/fpb

# Genera un AUTH_SECRET sicuro
openssl rand -hex 32

# Crea il file .env
nano .env
```

Contenuto del `.env`:
```env
AUTH_SECRET=<incolla qui l'output di openssl>
NEXTAUTH_URL=https://tuo-dominio.com
```

---

## 6. Configura il dominio in Caddyfile

```bash
nano /opt/fpb/Caddyfile
```

Sostituisci `tuo-dominio.com` con il dominio reale:
```
app.miodominio.it {
    reverse_proxy app:3000
    encode gzip
}
```

---

## 7. Avvia l'app

```bash
cd /opt/fpb
docker compose up -d --build
```

Il primo avvio scarica le immagini e compila il codice (~5-10 minuti). Monitora con:
```bash
docker compose logs -f
```

Quando vedi `✓ Ready` l'app è online. Apri `https://tuo-dominio.com`.

---

## 8. Crea l'utente admin

```bash
docker exec fpb-app npx tsx src/lib/seed-admin.ts
```

Per un utente personalizzato:
```bash
docker exec -e EMAIL=mario@azienda.it -e PASSWORD=MiaPassword -e NAME="Mario Rossi" \
  fpb-app npx tsx src/lib/seed-admin.ts
```

---

## 9. Configura il backup automatico

```bash
chmod +x /opt/fpb/scripts/backup.sh

# Test manuale
/opt/fpb/scripts/backup.sh

# Aggiungi al crontab (backup ogni giorno alle 02:00)
crontab -e
```

Aggiungi questa riga:
```
0 2 * * * /opt/fpb/scripts/backup.sh >> /var/log/fpb-backup.log 2>&1
```

I backup vengono salvati in `~/fpb-backups/` e mantenuti per 30 giorni.

---

## 10. Aggiornamenti futuri

Quando rilasci una nuova versione:

```bash
cd /opt/fpb

# Se usi Git:
git pull

# Se carichi manualmente, ricopia i file con scp

# Ricostruisci e riavvia (zero downtime ~30s)
docker compose up -d --build
```

Le migrazioni DB vengono applicate automaticamente all'avvio tramite `prisma migrate deploy`.

---

## Comandi utili

```bash
# Vedi i log in tempo reale
docker compose logs -f app

# Riavvia solo l'app (senza rebuild)
docker compose restart app

# Entra nel container
docker exec -it fpb-app sh

# Backup manuale immediato
/opt/fpb/scripts/backup.sh

# Ripristino da backup
docker cp ~/fpb-backups/fpb_20260101_020000.db fpb-app:/data/fpb.db
docker compose restart app

# Stop completo
docker compose down
```

---

## Costi mensili stimati

| Voce | Costo |
|------|-------|
| Hetzner CX22 | €4,51/mese |
| Dominio (annuale) | ~€1/mese |
| **Totale** | **~€5-6/mese** |
