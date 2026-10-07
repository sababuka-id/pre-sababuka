#!/usr/bin/env bash
set -euo pipefail

if ! runuser -u postgres -- psql -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname = 'sababuka_app'" | grep -q 1; then
  runuser -u postgres -- createuser --no-login sababuka_app
fi

if ! runuser -u postgres -- psql -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'sababuka'" | grep -q 1; then
  runuser -u postgres -- createdb --owner=sababuka_app sababuka
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d sababuka \
  -c 'CREATE EXTENSION IF NOT EXISTS postgis' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto'

install -m 750 /tmp/backup-postgres.sh \
  /usr/local/sbin/sababuka-backup-postgres
install -m 644 /tmp/sababuka-backup.service \
  /etc/systemd/system/sababuka-backup.service
install -m 644 /tmp/sababuka-backup.timer \
  /etc/systemd/system/sababuka-backup.timer
install -d -m 700 -o postgres -g postgres \
  /var/backups/sababuka/postgresql

systemctl daemon-reload
systemctl enable --now sababuka-backup.timer
systemctl start sababuka-backup.service

systemctl is-active sababuka-backup.timer
systemctl list-timers sababuka-backup.timer --no-pager
runuser -u postgres -- psql -d sababuka -tAc \
  'SELECT current_database(), postgis_full_version()'
find /var/backups/sababuka/postgresql -maxdepth 1 -type f \
  -printf '%f %s bytes\n'
