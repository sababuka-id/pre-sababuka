# Blueprint Teknis Awal

Status: rancangan awal, belum menjadi keputusan teknologi final.

## 1. Tujuan

Menyediakan satu platform data Kabupaten Kapuas yang konsisten, dapat ditelusuri, aman, dan dapat digunakan untuk analisis lintas OPD oleh pengguna sesuai kewenangannya.

## 2. Komponen logis

### Akuisisi data

- Satu konektor atau scraper untuk setiap sumber.
- Mendukung tabel HTML, API resmi, Excel, CSV, dan PDF.
- Mengutamakan API atau unduhan resmi jika tersedia; scraping halaman menjadi pilihan berikutnya.
- Menyimpan waktu pengambilan, URL, checksum, status, dan pesan kegagalan.
- Tidak melewati autentikasi, CAPTCHA, larangan akses, atau kontrol anti-bot tanpa izin tertulis.

### Penyimpanan berlapis

- **Raw**: salinan hasil pengambilan untuk bukti dan pemrosesan ulang.
- **Staging**: hasil parsing sebelum disahkan.
- **Canonical**: data terstandar yang dipakai aplikasi.
- **Audit**: histori perubahan, pelaksana/proses, waktu, dan alasan perubahan.

### Normalisasi

Setiap nilai indikator minimal membawa:

- identitas indikator dan definisi versi;
- nilai, satuan, periode, dan tanggal referensi;
- wilayah dan tingkat granularitas;
- OPD pemilik serta sumber publikasi;
- status validasi dan kualitas;
- waktu pengambilan serta versi data;
- klasifikasi akses.

### Backend API

- Menjadi satu-satunya akses aplikasi ke data canonical.
- Memvalidasi input dan menerapkan RBAC pada setiap permintaan.
- Menyediakan pagination, filter periode/wilayah, dan versi API.
- Menghasilkan log audit tanpa menyimpan rahasia atau data pribadi secara berlebihan.

### Dashboard DIES

- Mobile-responsive dan dapat digunakan pada koneksi terbatas.
- Memisahkan dashboard umum, OPD, dan eksekutif.
- Setiap visualisasi menampilkan sumber, periode, satuan, dan waktu pembaruan.
- Proyeksi dan early warning harus menjelaskan metode serta batas ketidakpastian.

### WhatsApp Bot

- Akses terbatas untuk nomor yang disetujui.
- Mengambil fakta melalui API, bukan menjawab dari ingatan model.
- Jawaban ringkas, formal, menyebut periode dan sumber.
- Pertanyaan dan jawaban sensitif memiliki kebijakan retensi dan audit.

### Android

- Dibangun setelah dashboard stabil.
- Pendekatan awal adalah PWA atau WebView wrapper.
- Tidak menyimpan token atau data sensitif secara terbuka pada perangkat.

## 3. Kebutuhan lintas komponen

- Konfigurasi dipisahkan dari kode; rahasia tidak masuk Git.
- Lingkungan development, staging, dan production dipisahkan.
- Backup, restore, monitoring, alert, dan rotasi log harus diuji.
- Seluruh waktu disimpan konsisten dan ditampilkan dalam konteks Asia/Jakarta.
- Migrasi database memiliki versi dan dapat dilacak.
- Data contoh tidak boleh tertukar dengan data resmi.

## 4. Strategi kualitas data

Setiap dataset dinilai sekurang-kurangnya dari kelengkapan, validitas tipe/rentang, keunikan, konsistensi antarperiode, ketepatan waktu, dan keterlacakan sumber. Data gagal validasi tidak langsung menggantikan data canonical; data tersebut masuk antrean pemeriksaan.

## 5. Strategi keamanan awal

- Prinsip least privilege dan deny-by-default.
- TLS untuk komunikasi jaringan.
- Hash kata sandi menggunakan algoritme standar yang kuat apabila autentikasi lokal dipilih.
- Rate limiting, validasi input, pembatasan ukuran unggahan, dan proteksi endpoint administratif.
- Audit keamanan dimulai bersama backend dan diulang sebelum produksi.
- Pengumpulan data pribadi dibatasi sesuai tujuan dan dasar pemrosesan.

## 6. Batas blueprint awal

Dokumen ini belum menetapkan framework, penyedia cloud, server, layanan WhatsApp, model AI, SLA, atau desain visual. Keputusan tersebut dibuat setelah kondisi infrastruktur, kemampuan pengelola, anggaran, dan akses resmi diketahui.
