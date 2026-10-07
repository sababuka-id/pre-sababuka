# Database SABABUKA

Migration PostgreSQL/PostGIS untuk baseline MVP v1.

## Prasyarat

- PostgreSQL 18 atau versi kompatibel yang disetujui.
- Ekstensi `pgcrypto`, `citext`, dan `postgis` sudah dibuat oleh administrator database. Pembuatan `postgis` memerlukan superuser pada PostgreSQL 18.
- Akun migrasi memiliki hak membuat schema, tabel, fungsi, dan trigger, tetapi tidak perlu menjadi superuser.

## Urutan migration

| Versi | Isi |
|---|---|
| 001 | Ekstensi, schema, dan ledger migration |
| 002 | Organisasi, pengguna, RBAC, menu, dan konfigurasi |
| 003 | Fokus, kategori, indikator, periode, wilayah, dan target |
| 004 | Dataset, metadata, resource, batch, observasi, dan validasi |
| 005 | Workflow, publikasi, notifikasi, Asisten AI, dan audit |
| 006 | Seed role, permission, menu, organisasi induk, dan feature flag |
| 007 | Session autentikasi, MFA, undangan, dan pemulihan kata sandi |
| 008 | Perlindungan replay kode TOTP |
| 009 | Metadata tambahan dan data pilot 5 kategori, 15 indikator, OPD, serta target 2025–2029 |
| 010 | Periode pelaporan pada batch dan dataset sistem untuk input capaian manual OPD |
| 011 | Metadata bukti dukung privat, checksum, relasi indikator, dan soft delete |
| 012 | Menu dashboard operasional bagi role workflow data |

Semua migration menggunakan transaksi. Jangan mengubah file migration yang sudah diterapkan pada lingkungan bersama; buat migration baru.

## Menjalankan

Linux/server:

```bash
export DATABASE_URL='postgresql:///sababuka'
./apply-migrations.sh
```

Rahasia database tidak boleh ditulis di repository. Gunakan peer authentication, `.pgpass` dengan permission yang benar, atau secret manager.

## Validasi setelah migration

```sql
SELECT version, description, applied_at
FROM sababuka.schema_migrations
ORDER BY version;

SELECT code, name
FROM sababuka.roles
ORDER BY code;

SELECT count(*) AS permission_count
FROM sababuka.permissions;
```

Migration pertama harus diuji pada database sementara, lalu staging, sebelum diterapkan pada database produksi.
