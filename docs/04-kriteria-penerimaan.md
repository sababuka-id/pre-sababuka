# Kriteria Penerimaan

## Definition of Done umum

Pekerjaan dapat dinyatakan selesai hanya jika:

- kebutuhan dan pihak penerima tercatat;
- implementasi telah direview;
- pengujian yang relevan lulus;
- keamanan dan privasi diperiksa sesuai risiko;
- dokumentasi pengguna dan operasional diperbarui;
- tidak ada rahasia di repository;
- bukti hasil dapat ditelusuri;
- kekurangan yang diterima dicatat sebagai risiko residual.

## Data dan scraper

- Sumber, pemilik, URL, periode, dan waktu pengambilan tercatat.
- Hasil dibandingkan dengan sampel sumber asli.
- Duplikasi, nilai kosong, tipe, satuan, wilayah, dan periode divalidasi.
- Kegagalan tidak merusak data valid sebelumnya.
- Retry dibatasi dan tidak membebani situs OPD.
- Perubahan struktur sumber menghasilkan alert yang dapat ditindaklanjuti.

## API

- Akses tanpa izin ditolak secara default.
- Filter, pagination, validasi input, dan pesan error konsisten.
- Kontrak API terdokumentasi dan diuji.
- Endpoint penting memiliki pengujian otorisasi lintas role.
- Log tidak membocorkan token, kata sandi, atau data pribadi yang tidak perlu.

## Dashboard

- Data, satuan, periode, sumber, dan waktu pembaruan terlihat.
- Tampilan bekerja pada desktop dan ukuran ponsel yang disepakati.
- Kondisi kosong, lambat, gagal, dan data belum diperbarui ditampilkan dengan jelas.
- Hak akses diuji untuk setiap role.
- Grafik tidak menyesatkan dan dapat dibaca tanpa bergantung pada warna saja.

## Analitik

- Metode, input, periode pelatihan, metrik evaluasi, dan keterbatasan tercatat.
- Proyeksi dibedakan secara visual dari data aktual.
- Early warning memiliki definisi ambang, pemilik tindak lanjut, dan mekanisme evaluasi false positive/negative.
- Model tidak dipakai untuk keputusan berisiko tinggi tanpa validasi manusia.

## WhatsApp Bot

- Hanya nomor/identitas yang disetujui dapat mengakses.
- Jawaban faktual berasal dari API dan mencantumkan periode/sumber.
- Bot menolak atau mengeskalasi pertanyaan di luar data yang tersedia.
- Pengujian mencakup prompt injection, data leakage, nomor tidak dikenal, dan layanan eksternal gagal.
- Kebijakan retensi percakapan disetujui.

## Android

- Tidak memuat kredensial statis di paket aplikasi.
- Login, logout, kedaluwarsa sesi, tautan, unduhan, dan tombol kembali bekerja.
- Perilaku saat offline atau server gagal jelas.
- Build dapat direproduksi dan ditandatangani melalui prosedur resmi.

## Operasional

- Monitoring kesehatan, kegagalan scraper, kapasitas, dan keamanan aktif.
- Backup berhasil dibuat dan restore pernah diuji.
- Rollback rilis pernah disimulasikan.
- PIC, jalur eskalasi, SLA, RPO, dan RTO terdokumentasi.
