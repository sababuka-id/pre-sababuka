# Catatan Keputusan Arsitektur

Dokumen ini mencegah keputusan penting hilang di percakapan. Setiap keputusan mencatat konteks, pilihan, konsekuensi, tanggal, dan pihak yang menyetujui.

## ADR-000 - Proses pengambilan keputusan

**Status:** diterima sementara  
**Tanggal:** 2026-08-26

**Keputusan:** pekerjaan dilakukan bertahap. Sebelum perubahan material, pilihan dijelaskan bersama fungsi, kelebihan, kekurangan, biaya, dan risiko. Implementasi dilanjutkan setelah persetujuan pengguna.

**Konsekuensi positif:** keputusan dapat ditelusuri dan risiko salah arah menurun.

**Konsekuensi negatif:** beberapa tahap membutuhkan jeda persetujuan.

## ADR-001 - Satu backend API untuk seluruh ruang pengguna

**Status:** diusulkan kuat berdasarkan dokumen rancang bangun.

**Keputusan yang diusulkan:** Ringkasan Pimpinan, ruang kurasi BAPPERIDA, ruang integrasi Diskominfosantik, Kotak Konfirmasi Data OPD, dan Asisten Data memakai backend API, data canonical, metadata, serta aturan otorisasi yang sama. WhatsApp, Android, atau kanal lain hanya ditambahkan setelah sistem inti stabil dan tetap menggunakan kontrol yang sama.

**Alasan:** konsistensi data, keamanan terpusat, dan biaya pemeliharaan lebih rendah.

## ADR-004 - Tidak ada input ulang untuk data yang sudah terhubung

**Status:** diusulkan.

**Keputusan yang diusulkan:** OPD tidak mengunggah ulang data ke SABABUKA jika data dapat dibaca dari Satu Data, BPS, SIPD, atau sistem resmi OPD. Ruang OPD berfungsi untuk konfirmasi, koreksi, catatan, dan riwayat. Unggah manual hanya jalur sementara dengan bukti sumber dan rencana migrasi.

**Alasan:** mencegah beban ganda, duplikasi, dan perbedaan versi.

## ADR-005 - Sumber ditetapkan per indikator

**Status:** diusulkan.

**Keputusan yang diusulkan:** setiap indikator memiliki sumber primer, sumber pembanding, kanal, frekuensi, level wilayah, dan batas penggunaan. Satu Data diprioritaskan sebagai kanal jika dataset sumber primer tersedia, bukan otomatis menjadi sumber substansi semua indikator.

**Alasan:** kewenangan sumber berbeda menurut jenis indikator dan data yang terbit di portal dapat merupakan salinan dari produsen lain.

## ADR-006 - BAPPERIDA menetapkan kelayakan tayang, bukan mengambil alih substansi

**Status:** diusulkan.

**Keputusan yang diusulkan:** OPD bertanggung jawab atas substansi data sektoral; BPS berperan sesuai kewenangan statistik; Diskominfosantik mengelola wali data dan integrasi; BAPPERIDA mengoordinasikan rekonsiliasi serta menentukan kelayakan penyajian untuk konteks pimpinan.

**Alasan:** menjaga akuntabilitas, menghindari tumpang tindih, dan mengurangi gesekan lintas OPD.

## ADR-002 - Penyimpanan data berlapis

**Status:** diusulkan.

**Keputusan yang diusulkan:** pisahkan raw, staging, canonical, dan audit secara logis.

**Alasan:** data pemerintah harus dapat dilacak, diperiksa ulang, dan diproses kembali ketika aturan normalisasi berubah.

**Biaya:** membutuhkan ruang penyimpanan dan prosedur retensi tambahan.

## ADR-003 - Fondasi teknologi aplikasi

**Status:** belum diputuskan.

Pilihan akan dibandingkan pada langkah berikutnya berdasarkan:

- kemampuan tim;
- dukungan server Pemkab;
- kecepatan pengembangan;
- biaya operasional;
- kebutuhan scraper dan analitik;
- keamanan serta kemudahan serah terima;
- dukungan jangka panjang dan ketergantungan vendor.

## Template keputusan baru

```text
## ADR-NNN - Judul
Status:
Tanggal:
Konteks:
Pilihan yang dipertimbangkan:
Keputusan:
Alasan:
Konsekuensi positif:
Konsekuensi negatif:
Biaya/risiko:
Pihak yang menyetujui:
```
