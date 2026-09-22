# Backlog Fase 0-11

Backlog ini menerjemahkan dokumen rancang bangun menjadi pekerjaan yang dapat diverifikasi. Urutan dapat disesuaikan, tetapi dependensi tidak boleh diabaikan.

## Fase 0 - Survei dan validasi lapangan

**Input minimum:** daftar OPD dan PIC survei.

**Pekerjaan:** finalisasi kuesioner, distribusi, rekap, klasifikasi kesiapan, inventarisasi pemilik data dan kontak teknis.

**Output:** register OPD, hasil survei, daftar dataset, dan status kesiapan.

## Fase 1 - Validasi kelayakan sumber

**Input minimum:** URL atau mekanisme akses setiap dataset.

**Pekerjaan:** cek format, akses, frekuensi pembaruan, robots.txt/ketentuan, stabilitas, kualitas, dan kebutuhan kredensial.

**Output:** register sumber dan prioritas implementasi.

## Fase 2 - Normalisasi dan kamus data

**Input minimum:** indikator prioritas dan sampel data.

**Pekerjaan:** definisi indikator, satuan, periode, wilayah, sumber berwenang, aturan konflik, klasifikasi akses, dan skema canonical.

**Output:** kamus data berversi dan skema normalisasi tervalidasi.

## Fase 3 - Basis data dan RBAC

**Input minimum:** skema normalisasi yang disetujui.

**Pekerjaan:** model raw/staging/canonical/audit, referensi wilayah, histori, migrasi, indeks, matriks role-permission, backup dan restore awal.

**Output:** skema basis data serta rancangan RBAC yang teruji.

## Fase 4 - Konektor dan scraper

**Input minimum:** register sumber prioritas dan contoh hasil yang benar.

**Pekerjaan:** template konektor, implementasi per sumber, validasi, retry, rate limit, observability, dan uji pembanding dengan sumber asli.

**Output:** konektor aktif dan laporan kualitas per sumber.

## Fase 5 - Backend API

**Input minimum:** database dan RBAC dasar.

**Pekerjaan:** autentikasi, endpoint indikator/wilayah/periode, scheduler, audit log, dokumentasi API, pengujian unit/integrasi, dan kontrol keamanan.

**Output:** API berversi yang dapat digunakan seluruh kanal.

## Fase 6 - Dashboard DIES

**Input minimum:** API stabil dan kebutuhan pengguna prioritas.

**Pekerjaan:** desain informasi, dashboard per role, visualisasi, metadata sumber, responsivitas, aksesibilitas, performa, dan pengujian pengguna.

**Output:** dashboard web yang memenuhi kriteria penerimaan.

## Fase 7 - WhatsApp Bot

**Input minimum:** API stabil, daftar nomor resmi, akses layanan, dan kebijakan AI.

**Pekerjaan:** autentikasi nomor, tool/API retrieval, prompt, batas pertanyaan, audit, fallback, serta pengujian jawaban dan keamanan.

**Output:** bot terbatas yang memberikan jawaban berbasis data terverifikasi.

## Fase 8 - Android wrapper

**Input minimum:** dashboard mobile stabil.

**Pekerjaan:** wrapper, pengelolaan sesi, navigasi, ikon/splash, penanganan offline/error, build dan uji perangkat.

**Output:** APK/AAB yang dapat dipasang dan diuji.

## Fase 9 - Pengujian dan audit keamanan

Fase ini dimulai sejak Fase 5, lalu ditutup dengan uji terpadu, pengujian otorisasi, dependency scan, pemeriksaan konfigurasi, penanganan temuan, dan persetujuan risiko residual.

**Output:** laporan uji, daftar temuan, bukti perbaikan, dan keputusan kelayakan rilis.

## Fase 10 - Build stabil dan repository

**Pekerjaan:** reproducible build, konfigurasi lingkungan, CI, versioning, runbook, panduan kontribusi, daftar lisensi, dan paket rilis.

**Output:** release candidate terdokumentasi.

## Fase 11 - Deployment dan serah terima

**Input minimum:** server, domain, sertifikat, backup, PIC operasi, dan persetujuan rilis.

**Pekerjaan:** deployment staging/production, migrasi, smoke test, monitoring, simulasi restore/rollback, pelatihan, dan serah terima.

**Output:** sistem live, runbook, blueprint akhir, user manual, berita acara, dan daftar tindak lanjut.
