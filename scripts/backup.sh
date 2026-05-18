#!/bin/bash
set -e

# Kambelleh PMS Backup Script
# Usage: ./backup.sh [daily|weekly]
# Schedule weekly (e.g., every Sunday at 3am): 0 3 * * 0 /opt/kambelleh/backup.sh weekly

BACKUP_TYPE=${1:-daily}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/kambelleh/backups/postgres"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
BACKUP_FILE="$BACKUP_DIR/kambelleh_${BACKUP_TYPE}_${DATE}.sql.gz"

echo "[$(date)] Starting $BACKUP_TYPE PostgreSQL backup..."

# Extract credentials from .env
ENV_FILE="/opt/kambelleh/.env"
if [ -f "$ENV_FILE" ]; then
  source <(grep -E '^[^#]' "$ENV_FILE" | xargs)
fi

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${PGHOST:-localhost}" \
  -U "${PGUSER:-postgres}" \
  -d kambelleh \
  -f "$BACKUP_FILE.tmp"

gzip -9 "$BACKUP_FILE.tmp" -c > "$BACKUP_FILE"

# Calculate size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"

# Cleanup old backups
find "$BACKUP_DIR" -name "kambelleh_${BACKUP_TYPE}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Old backups cleaned up (retention: ${RETENTION_DAYS} days)"

# Optional: Upload to remote storage (configure S3 or rsync)
# Uncomment and configure for your setup:
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/kambelleh/backups/ --storage-class STANDARD_IA

echo "[$(date)] $BACKUP_TYPE backup completed successfully"
