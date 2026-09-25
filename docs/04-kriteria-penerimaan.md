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

## Data dan integrasi

- Sumber, pemilik, URL, periode, dan waktu pengambilan tercatat.
- Hasil dibandingkan dengan sampel sumber asli.
- Duplikasi, nilai kosong, tipe, satuan, wilayah, dan periode divalidasi.
- Kegagalan tidak merusak data valid sebelumnya.
- Konektor mengutamakan kanal resmi; retry dibatasi dan tidak membebani sistem sumber.
- Perubahan struktur sumber menghasilkan alert yang dapat ditindaklanjuti.
- Data yang sudah tersedia pada sumber resmi tidak perlu diinput ulang oleh OPD.
- Nilai yang berbeda tidak ditimpa dan masuk ke alur rekonsiliasi.
- Status konfirmasi OPD dan kelayakan tayang BAPPERIDA memiliki audit trail.

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
- Insight membedakan fakta, indikasi, hipotesis, pilihan tindak lanjut, dan keputusan resmi.
- Asisten Data menolak jawaban jika sumber tidak tersedia, kedaluwarsa, atau tidak dapat diakses pengguna.

## Kanal tambahan setelah disetujui

WhatsApp Bot, Android, atau kanal lain bukan bagian penerimaan sistem inti. Jika kemudian disetujui:

- kanal memakai API, RBAC, status kelayakan data, dan audit yang sama;
- tidak memuat kredensial statis atau melewati kontrol akses;
- jawaban faktual mencantumkan periode dan sumber;
- kondisi sesi kedaluwarsa, offline, layanan eksternal gagal, dan data tidak tersedia ditangani dengan jelas;
- keamanan, retensi, prompt injection, data leakage, serta build/release diuji sesuai jenis kanal.

## Operasional

- Monitoring kesehatan, kegagalan scraper, kapasitas, dan keamanan aktif.
- Backup berhasil dibuat dan restore pernah diuji.
- Rollback rilis pernah disimulasikan.
- PIC, jalur eskalasi, SLA, RPO, dan RTO terdokumentasi.
