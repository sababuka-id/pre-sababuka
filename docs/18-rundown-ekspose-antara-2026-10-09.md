# Rundown Ekspose Antara SABABUKA

Tanggal: Jumat, 9 Oktober 2026  
Status materi: demo MVP lokal dengan data resmi terpilih dan data simulasi berlabel

## Pesan utama

SABABUKA sudah berjalan sebagai aplikasi web MVP yang menghubungkan autentikasi lintas role, master indikator, alur capaian OPD, review BAPPERIDA, publikasi, dashboard pimpinan, Asisten Data, notifikasi, dan audit. Lingkungan yang ditampilkan adalah lingkungan demo/UAT lokal, belum layanan produksi.

## Angka progres yang aman disampaikan

- 5 kategori pilot aktif.
- 15 indikator pilot aktif dengan target 2025–2029.
- 6 capaian indikator telah ditelusuri ke sumber pemerintah dan dipublikasikan sebagai data resmi.
- 9 indikator masih menunggu data atau konfirmasi OPD dan hanya dipakai untuk demonstrasi alur.
- 5 role sudah tersedia: Superadmin, BAPPERIDA, Kominfo, OPD, dan Pimpinan.
- 13 migration database telah diterapkan secara berurutan.
- Production build frontend dan backend lulus; unit/service test backend lulus 6 dari 6 skenario yang dapat berjalan tanpa database integration.

## Status lima kategori

| Kategori | Status paparan | Bukti yang dapat ditampilkan |
|---|---|---|
| Ketahanan pangan dan agro-perikanan | Rilis data resmi terpilih | IKP 2026 dan rasio PDRB pertanian 2025 |
| Investasi dan industri daerah | Rilis data resmi terpilih | Kontribusi industri dan pertumbuhan PDRB per kapita 2025 |
| SDM berkualitas dan sejahtera | Rilis data resmi terpilih | Kemiskinan 2024 dan stunting 2023 |
| Desa dan ekonomi rakyat | Demo alur | Menunggu dataset dan konfirmasi DPMD/OPD terkait |
| Konektivitas dan layanan dasar | Demo alur | Menunggu definisi serta data Dishub/PUPR/OPD terkait |

Istilah **rilis data resmi terpilih** berarti kategori tersebut sudah memiliki minimal satu capaian terverifikasi dalam publikasi aktif. Istilah ini tidak berarti seluruh indikator di dalam kategori sudah lengkap.

## Urutan demo 10–12 menit

1. Login sebagai **Pimpinan** dan buka Ringkasan Pimpinan.
2. Tunjukkan panel **Kesiapan kategori untuk paparan**: 3 dari 5 kategori sudah memuat capaian bersumber resmi.
3. Buka dua kartu sumber resmi dan tunjukkan periode, OPD pemilik, status sumber, serta tautan rujukannya.
4. Tunjukkan kartu berlabel **Data demo** untuk menjelaskan bahwa sistem memisahkan simulasi dari realisasi resmi.
5. Buka Asisten Data dan ajukan pertanyaan tentang IKP, kemiskinan, atau stunting; tunjukkan sitasinya.
6. Login sebagai **BAPPERIDA** untuk memperlihatkan review, kurasi, dan publikasi.
7. Bila waktu cukup, login sebagai **OPD** untuk memperlihatkan pengisian capaian dan bukti dukung sesuai scope.

## Kalimat yang disarankan

> Hari ini kami menampilkan MVP SABABUKA yang sudah berjalan secara end-to-end pada lingkungan demo. Lima kategori dan 15 indikator pilot sudah aktif. Enam capaian pada tiga kategori sudah memiliki sumber resmi yang dapat ditelusuri, sedangkan indikator lain tetap diberi label demo sampai dikonfirmasi OPD. Tahap berikutnya adalah UAT, integrasi sumber, dan deployment development yang aman.

Hindari menyebut aplikasi sudah produksi, seluruh data sudah resmi, atau seluruh OPD sudah terintegrasi.

## Persiapan teknis sebelum acara

1. Nyalakan Docker Desktop dan pastikan WSL Ubuntu berjalan.
2. Dari PowerShell pada folder proyek, jalankan `pwsh -File .\tools\start-demo-jumat.ps1`.
3. Restart normal mempertahankan password akun demo. Gunakan opsi `-ResetDemoUsers` hanya saat akun demo memang perlu diatur ulang; opsi ini akan meminta password demo minimal 16 karakter.
4. Buka `http://127.0.0.1:5173/` dan uji akun Pimpinan serta BAPPERIDA.
5. Siapkan hotspot cadangan. Demo utama tidak membutuhkan internet, kecuali ketika membuka tautan sumber.
6. Simpan tangkapan layar dashboard sebagai cadangan bila laptop bermasalah.

## Catatan domain publik

`dev.sababuka.com` masih mengarah ke prototipe GitHub Pages tanggal 25 September 2026. HTTP dapat dibuka, tetapi HTTPS belum memiliki sertifikat yang cocok dan versi tersebut belum memuat aplikasi full-stack terbaru. Jangan menjadikannya bukti deployment MVP terbaru pada ekspose ini.

