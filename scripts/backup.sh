#!/bin/bash
# Backup giornaliero del database SQLite
# Aggiungere a crontab: 0 2 * * * /opt/fpb/scripts/backup.sh >> /var/log/fpb-backup.log 2>&1

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/fpb-backups"
mkdir -p "$BACKUP_DIR"

# Backup atomico via copia del file (SQLite è safe per lettura concorrente)
docker exec fpb-app sh -c "cp /data/fpb.db /tmp/fpb_bak.db"
docker cp fpb-app:/tmp/fpb_bak.db "$BACKUP_DIR/fpb_${DATE}.db"
docker exec fpb-app sh -c "rm -f /tmp/fpb_bak.db"

# Mantieni solo gli ultimi 30 backup
ls -t "$BACKUP_DIR"/fpb_*.db 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup completato: $BACKUP_DIR/fpb_${DATE}.db"
