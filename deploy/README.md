# Deployment VPS SABABUKA

Fondasi produksi menggunakan Nginx untuk frontend dan reverse proxy API,
service systemd `sababuka-api`, serta PostgreSQL/PostGIS lokal. Aplikasi dipasang di
`/srv/sababuka/releases/<timestamp>` dan symlink `/srv/sababuka/current`
menunjuk ke rilis aktif.

## Akses

- Administrasi darurat: `root`, autentikasi key saja.
- Deployment aplikasi: `sababuka`, key khusus tanpa hak `sudo`.
- PostgreSQL hanya mendengarkan koneksi lokal dan tidak dibuka oleh firewall.

## Jalur publik

- HTTP dan HTTPS melalui Nginx.
- Konfigurasi `nginx-sababuka.conf` dipakai untuk bootstrap HTTP, lalu
  `nginx-sababuka-https.conf` dipakai setelah sertifikat Let's Encrypt tersedia.
- Domain development memakai `nginx-sababuka-dev-bootstrap.conf` sebelum
  sertifikat tersedia dan `nginx-sababuka-dev-https.conf` setelah HTTPS aktif.
- API hanya mendengarkan `127.0.0.1:3001` dan diteruskan melalui `/api/`.
- Konfigurasi rahasia berada di `/etc/sababuka/sababuka.env` dengan mode `600`.
- Bukti dukung disimpan persisten di `/var/lib/sababuka/evidence`, bukan di
  direktori rilis.

## Rollback frontend

Ubah `/srv/sababuka/current` ke direktori rilis sebelumnya, lalu jalankan
`systemctl restart sababuka-api && nginx -t && systemctl reload nginx` sebagai
administrator sistem. Migrasi database harus tetap kompatibel mundur; pulihkan
dump pra-rilis hanya jika rollback juga memerlukan rollback data.

## Backup

Timer `sababuka-backup.timer` membuat dump PostgreSQL setiap hari sekitar
02.15 WIB dan menyimpan 14 hari salinan lokal di
`/var/backups/sababuka/postgresql`. Sebelum produksi, salinan terenkripsi ke
penyimpanan di luar VPS tetap wajib ditambahkan agar kegagalan VPS tidak ikut
menghilangkan backup.

## Pemeriksaan setelah rilis

- `systemctl is-active sababuka-api nginx postgresql`
- `curl -fsS http://127.0.0.1:3001/api/v1/health`
- `curl -fsS https://<domain>/api/v1/health`
- login dengan akun uji, lalu periksa menu sesuai role dan satu alur mutasi
  menggunakan data demo.

Kredensial database, master key enkripsi, token BPS, dan kata sandi akun tidak
boleh dimasukkan ke repository atau arsip rilis.
