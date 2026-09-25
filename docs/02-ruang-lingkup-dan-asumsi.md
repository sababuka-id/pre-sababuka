# Ruang Lingkup, Batasan, dan Asumsi

## Dalam ruang lingkup

- Inventarisasi sumber dan kesiapan data OPD.
- Validasi teknis dan legal akses sumber.
- Katalog indikator dan kamus data.
- Akuisisi, validasi, normalisasi, serta histori data.
- PostgreSQL/PostGIS atau teknologi setara yang disetujui.
- Backend API dan kontrol akses berbasis peran.
- Dashboard SABABUKA untuk pimpinan, ruang kurasi BAPPERIDA, ruang integrasi Diskominfosantik, dan Kotak Konfirmasi Data OPD.
- Analitik tren, kesenjangan wilayah, peringatan, dan Asisten Data yang hanya membaca data sesuai status serta hak akses.
- Pengujian, keamanan, dokumentasi, deployment, pelatihan, dan serah terima.

## Di luar ruang lingkup sampai disetujui

- Mengubah sistem internal OPD.
- Mengambil data yang tidak memiliki dasar akses.
- Melewati CAPTCHA atau proteksi keamanan situs.
- Membeli server, domain, lisensi, nomor WhatsApp, atau layanan AI.
- Membuat aplikasi Android, wrapper, atau bot WhatsApp sebelum platform web, API, keamanan, dan workflow data stabil.
- Menentukan kebijakan pemerintah atau menyatakan prediksi sebagai keputusan resmi.
- Memigrasikan data pribadi tanpa klasifikasi dan persetujuan.

## Asumsi kerja sementara

| ID | Asumsi | Dampak jika salah | Cara validasi |
|---|---|---|---|
| A-01 | Sekitar 40 OPD menjadi sumber | Beban scraper dan jadwal berubah | Daftar final dari BAPPERIDA |
| A-02 | Wilayah mencakup 17 kecamatan | Referensi spasial berubah | Referensi wilayah resmi |
| A-03 | Sebagian data tersedia publik | Perlu kanal unggah/integrasi lain | Survei OPD dan pemeriksaan URL |
| A-04 | PostgreSQL/PostGIS dapat dioperasikan | Teknologi penyimpanan perlu ditinjau | Audit server Pemkab |
| A-05 | Satu Data, BPS, dan sebagian sistem OPD dapat menyediakan kanal resmi | Integrasi perlu file terjadwal atau jalur sementara | Audit akses dan uji sampel |
| A-06 | OPD tidak perlu menginput ulang data yang sudah terhubung | Beban kerja dan risiko duplikasi meningkat | Uji workflow bersama OPD pilot |
| A-07 | OPD memiliki PIC substansi yang dapat mengonfirmasi data | Data sektoral tidak dapat dikonfirmasi | Penunjukan PIC tiap OPD pilot |

## Keputusan yang belum tersedia

- Pemilik produk dan pihak yang menerima hasil.
- Daftar role serta kewenangan tiap role.
- Indikator prioritas untuk rilis pertama.
- Klasifikasi data dan periode retensinya.
- Infrastruktur development, staging, dan production.
- Target pengguna, beban, SLA, RPO, dan RTO.
- Mekanisme autentikasi dan integrasi identitas pemerintah.
- Anggaran operasional bulanan serta kebijakan penggunaan AI, tingkat keyakinan, dan kewenangan menyetujui insight.

## Prinsip pengendalian perubahan

Permintaan baru dicatat bersama tujuan, urgensi, biaya, risiko, dan dampaknya terhadap jadwal. Perubahan yang memengaruhi keamanan, data pribadi, biaya berulang, atau arsitektur harus disetujui sebelum diterapkan.
