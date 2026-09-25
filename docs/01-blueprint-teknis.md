# Blueprint Teknis Awal

Status: rancangan awal, belum menjadi keputusan teknologi final.

## 1. Tujuan

Menyediakan satu platform data Kabupaten Kapuas yang konsisten, dapat ditelusuri, aman, dan dapat digunakan untuk analisis lintas OPD oleh pengguna sesuai kewenangannya.

## 2. Komponen logis

### Akuisisi data

- Kontrak sumber ditetapkan per indikator sebelum konektor dibangun.
- Satu Data digunakan sebagai kanal utama jika dataset dari sumber primer tersedia di sana.
- BPS dan sistem resmi OPD digunakan sesuai kewenangan indikator, bukan sekadar sebagai fallback berurutan.
- Mendukung tabel HTML, API resmi, database view, Excel, CSV, layanan geospasial, dan PDF.
- Mengutamakan API, database view, CKAN, unduhan resmi, dan layanan geospasial.
- Scraping halaman hanya menjadi pilihan terbatas jika akses diizinkan, tidak tersedia kanal terstruktur, dan stabilitas serta kualitas dapat dipantau.
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

### Ruang pengguna SABABUKA

- Mobile-responsive dan dapat digunakan pada koneksi terbatas.
- Memisahkan Ringkasan Pimpinan, ruang kurasi BAPPERIDA, ruang integrasi Diskominfosantik, dan Kotak Konfirmasi Data OPD.
- Kotak OPD digunakan untuk konfirmasi, koreksi, catatan, dan riwayat; bukan untuk menginput ulang data yang sudah tersedia pada sumber resmi.
- Setiap visualisasi menampilkan sumber, periode, satuan, dan waktu pembaruan.
- Proyeksi dan early warning harus menjelaskan metode serta batas ketidakpastian.

### Asisten Data

- Mengambil fakta melalui API canonical dan metadata sesuai hak akses, bukan menjawab dari ingatan model.
- Jawaban ringkas, formal, menyebut periode dan sumber.
- Membedakan fakta, indikasi, hipotesis, pilihan tindak lanjut, dan keputusan resmi.
- Menolak menjawab jika data tidak tersedia, kedaluwarsa, atau tidak dapat diakses pengguna.
- Pertanyaan, jawaban, sumber, dan keputusan sensitif memiliki kebijakan retensi serta audit.

### Kanal tambahan

- Android wrapper, WhatsApp bot, atau kanal lain dibangun hanya setelah web, API, keamanan, dan workflow verifikasi stabil.
- Kanal tambahan tidak boleh melewati RBAC, metadata, audit, atau status kelayakan data.

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
