# Mockup Portal DIES - SABABUKA BERSINAR

Folder ini berisi **prototipe v1** Portal Web DIES dengan data karangan, dibuat untuk paparan internal kepada Team Leader. Isinya bukan bagian dari aplikasi produksi dan tidak boleh digunakan sebagai acuan angka, desain database, kebijakan, atau hasil analisis Kabupaten Kapuas.

## Posisi v1 ini

Tujuan utama sistem: **pimpinan bisa melihat data dari seluruh OPD dalam satu dashboard**. Rencana ke depan: portal ini dibungkus menjadi aplikasi Android dan terhubung dengan WhatsApp Bot.

v1 sengaja tidak membangun semua menu secara penuh. Yang dibuat lengkap hanya tiga menu yang langsung menjawab tujuan utama; sisanya jadi halaman rencana pengembangan agar tidak semua fitur "disikat" di versi pertama. Implementasi lengkap untuk menu lain masuk sebagai item pekerjaan terpisah.

| Menu | Status di v1 |
|---|---|
| Beranda Eksekutif | Penuh - dashboard ringkasan utama |
| Data Lintas Sektor | Penuh - 10 kategori data OPD |
| Analisis Kecamatan | Penuh - 17 kecamatan |
| WhatsApp Bot | Ilustrasi preview (arah pengembangan berikutnya) |
| Pusat Data | Halaman rencana pengembangan |
| Monitoring OPD | Halaman rencana pengembangan |
| Pusat Laporan | Halaman rencana pengembangan |
| Administrasi | Halaman rencana pengembangan |

## Cara membuka

Tidak diperlukan instalasi, server, npm, build tool, atau koneksi internet.

1. Buka `index.html` dengan browser (cukup klik dua kali).
2. Gunakan sidebar di sisi kiri untuk berpindah antar menu.
3. Halaman WhatsApp Bot menampilkan ilustrasi percakapan langsung di dalam portal (embed `wa-bot-preview.html`); halaman tersebut juga bisa dibuka tersendiri.

## Struktur berkas

- `index.html` - kerangka portal (banner, sidebar, topbar, kontainer konten).
- `styles.css` - gaya visual portal: mode mobile, fokus keyboard, `prefers-reduced-motion`.
- `app.js` - data dummy terpusat di bagian atas file, lalu utilitas, chart canvas, dan satu fungsi render per halaman.
- `wa-bot-preview.html` - ilustrasi percakapan WhatsApp Bot dengan pertanyaan cepat interaktif; bisa dibuka sendiri maupun di-embed.
- `README.md` - berkas ini.

## Fitur interaktif yang berhasil dibuat

- Navigasi sidebar 8 menu dengan indikator menu aktif, mode collapse (desktop) dan mode overlay (mobile) beserta backdrop.
- Filter periode global, filter sektor + pencarian indikator, pemilihan kecamatan + pilihan indikator grid.
- Grid placeholder 17 kecamatan yang bisa diklik, warna berubah sesuai indikator terpilih, sinkron dua arah dengan dropdown kecamatan.
- Grafik tren dan target-vs-realisasi berbasis canvas yang berubah sesuai pilihan periode/sektor/kecamatan, disertai ringkasan teks.
- Modal bantuan dan profil pengguna, toast notifikasi, tombol reset filter, tombol mode layar penuh, tampilan loading singkat saat berganti halaman, fokus keyboard yang terlihat, dukungan `prefers-reduced-motion`.
- Ilustrasi percakapan WhatsApp Bot dengan pertanyaan cepat, indikator sedang mengetik, dan label sumber/periode pada setiap jawaban.

## Fitur yang masih ilustrasi atau rencana pengembangan

- Early warning pada Beranda Eksekutif - ditandai sebagai ilustrasi, ambang dan data belum divalidasi.
- Label kualitas data (Terverifikasi ilustrasi/Perlu Pemeriksaan/Belum Tersedia) pada Data Lintas Sektor - contoh mekanisme klasifikasi, bukan status data sesungguhnya.
- WhatsApp Bot - simulasi percakapan lokal di browser, tidak ada pesan yang benar-benar terkirim.
- **Pusat Data, Monitoring OPD, Pusat Laporan, Administrasi** - baru berupa halaman ringkas berisi penjelasan tujuan dan daftar rencana fitur, belum dibangun interaktif penuh (tidak ada tabel, filter, atau modal pada menu-menu ini di v1).

## Yang sengaja belum dibuat

- **Scraper dan integrasi OPD:** menunggu daftar sumber, izin akses, dan validasi teknis.
- **Database dan normalisasi:** menunggu kamus indikator, satuan, periode, granularitas, dan aturan konflik data.
- **Backend API:** belum diperlukan untuk mockup statis dan akan mengikuti rancangan keamanan serta RBAC.
- **Login dan RBAC:** membutuhkan daftar role serta kewenangan yang disetujui.
- **Peta GIS:** membutuhkan data batas wilayah resmi dan integrasi PostGIS; grid 17 wilayah pada Analisis Kecamatan hanya placeholder.
- **Early warning sungguhan:** membutuhkan data historis valid, definisi ambang, pemilik tindak lanjut, dan pengujian.
- **WhatsApp Bot aktif:** membutuhkan akses Node-RED, Fonnte, API data, nomor resmi, dan kebijakan AI.
- **Aplikasi Android:** dibuat setelah dashboard web ini stabil, sebagai pembungkus (wrapper) dari portal yang sama.
- **Keamanan produksi:** penetration testing, audit konfigurasi, backup, monitoring, dan kepatuhan dilakukan bersama pembangunan sistem nyata.

## Catatan data

Nama 17 kecamatan dan nama OPD/dinas yang disebut menggunakan referensi struktur wilayah dan perangkat daerah yang umum pada kabupaten di Indonesia. Seluruh nilai indikator, tren, dan narasi bot adalah **data dummy** yang sengaja dibuat hanya untuk komunikasi visual. Tidak ada nama pegawai nyata, nomor telepon, data pribadi, maupun kredensial pada berkas ini.

## Keterbatasan mockup

- Tidak ada penyimpanan data permanen; seluruh perubahan filter/pilihan hilang saat halaman dimuat ulang.
- Grafik dibuat dengan Canvas API bawaan browser (tanpa library eksternal) sehingga tampilannya sederhana dibanding chart library produksi.
- Tidak ada autentikasi; peran pengguna pada topbar hanya ilustrasi tampilan.
- Empat menu (Pusat Data, Monitoring OPD, Pusat Laporan, Administrasi) sengaja belum interaktif - lihat tabel status di atas.

## Saran pengembangan berikutnya

- Menyusun kamus indikator resmi (definisi, satuan, sumber, metode hitung) sebelum data nyata dipetakan ke struktur ini.
- Membangun Pusat Data, Monitoring OPD, Pusat Laporan, dan Administrasi sebagai item pekerjaan terpisah, setelah kebutuhan dan sumber data OPD lebih jelas.
- Merancang skema database dan proses normalisasi lintas OPD sebagai dasar backend.
- Menentukan daftar role dan hak akses resmi bersama pemilik kebijakan sebelum RBAC sungguhan dibangun.
- Menyiapkan wrapper Android dan integrasi WhatsApp Bot bertahap setelah backend dan keamanan siap.

## Framing saat paparan

Sampaikan bahwa mockup ini adalah ilustrasi konsep tahap awal, dibuat terpisah dari pekerjaan teknis. Beranda Eksekutif, Data Lintas Sektor, dan Analisis Kecamatan menunjukkan arah utama produk: satu dashboard untuk melihat data seluruh OPD. Menu lain sengaja ditampilkan sebagai rencana pengembangan, bukan fitur jadi, agar cakupan penuh portal DIES tetap terlihat tanpa memberi kesan versi ini sudah final.
