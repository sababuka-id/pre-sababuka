#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL wajib diatur." >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
migration_dir="${script_dir}/migrations"

for migration in "${migration_dir}"/*.sql; do
  filename="$(basename -- "${migration}")"
  version="${filename%%_*}"

  if [[ "${version}" != "001" ]]; then
    applied="$(psql "${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -tAqc \
      "SELECT 1 FROM sababuka.schema_migrations WHERE version = '${version}'")"
    if [[ "${applied}" == "1" ]]; then
      echo "Lewati ${filename} (sudah diterapkan)."
      continue
    fi
  else
    ledger_exists="$(psql "${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -tAqc \
      "SELECT to_regclass('sababuka.schema_migrations') IS NOT NULL")"
    if [[ "${ledger_exists}" == "t" ]]; then
      applied="$(psql "${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -tAqc \
        "SELECT 1 FROM sababuka.schema_migrations WHERE version = '001'")"
      if [[ "${applied}" == "1" ]]; then
        echo "Lewati ${filename} (sudah diterapkan)."
        continue
      fi
    fi
  fi

  echo "Terapkan ${filename}..."
  psql "${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -f "${migration}"
done

echo "Seluruh migration selesai."
