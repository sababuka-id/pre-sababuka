# Deployment VPS SABABUKA

Fondasi produksi saat ini menggunakan Nginx untuk frontend statis dan
PostgreSQL/PostGIS sebagai basis data lokal. Aplikasi dipasang di
`/srv/sababuka/releases/<timestamp>` dan symlink `/srv/sababuka/current`
menunjuk ke rilis aktif.

## Akses

- Administrasi darurat: `root`, autentikasi key saja.
- Deployment aplikasi: `sababuka`, key khusus tanpa hak `sudo`.
- PostgreSQL hanya mendengarkan koneksi lokal dan tidak dibuka oleh firewall.

## Jalur publik

- HTTP: port 80 melalui Nginx.
- HTTPS: port 443 telah disiapkan di firewall, tetapi sertifikat dan nama
  domain dipasang setelah DNS Cloudflare/subdomain produksi ditentukan.

## Rollback frontend

Ubah `/srv/sababuka/current` ke direktori rilis sebelumnya, lalu jalankan
`nginx -t && systemctl reload nginx` sebagai administrator sistem.

## Backup

Timer `sababuka-backup.timer` membuat dump PostgreSQL setiap hari sekitar
02.15 WIB dan menyimpan 14 hari salinan lokal di
`/var/backups/sababuka/postgresql`. Sebelum produksi, salinan terenkripsi ke
penyimpanan di luar VPS tetap wajib ditambahkan agar kegagalan VPS tidak ikut
menghilangkan backup.

## Batas tahap ini

Frontend masih merupakan paket demonstrasi dengan data dummy. Database dan
PostGIS telah tersedia tetapi belum berisi skema/data produksi. Kredensial
database, token BPS, serta data OPD tidak boleh dimasukkan ke repository.
