#!/usr/bin/env bash
set -euo pipefail

backup_dir=/var/backups/sababuka/postgresql
timestamp=$(date +%Y%m%d-%H%M%S)

install -d -m 700 -o postgres -g postgres "$backup_dir"
runuser -u postgres -- pg_dump --format=custom --compress=9 \
  --file="$backup_dir/sababuka-$timestamp.dump" sababuka

find "$backup_dir" -type f -name 'sababuka-*.dump' -mtime +14 -delete
