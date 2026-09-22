# Catatan Keputusan Arsitektur

Dokumen ini mencegah keputusan penting hilang di percakapan. Setiap keputusan mencatat konteks, pilihan, konsekuensi, tanggal, dan pihak yang menyetujui.

## ADR-000 - Proses pengambilan keputusan

**Status:** diterima sementara  
**Tanggal:** 2026-08-26

**Keputusan:** pekerjaan dilakukan bertahap. Sebelum perubahan material, pilihan dijelaskan bersama fungsi, kelebihan, kekurangan, biaya, dan risiko. Implementasi dilanjutkan setelah persetujuan pengguna.

**Konsekuensi positif:** keputusan dapat ditelusuri dan risiko salah arah menurun.

**Konsekuensi negatif:** beberapa tahap membutuhkan jeda persetujuan.

## ADR-001 - Satu backend API untuk seluruh kanal

**Status:** diusulkan kuat berdasarkan dokumen rancang bangun.

**Keputusan yang diusulkan:** Dashboard, WhatsApp Bot, dan Android memakai backend API serta aturan otorisasi yang sama.

**Alasan:** konsistensi data, keamanan terpusat, dan biaya pemeliharaan lebih rendah.

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
