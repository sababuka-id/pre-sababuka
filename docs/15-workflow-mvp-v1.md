# Workflow MVP v1

Status: baseline implementasi  
Tanggal: 2026-09-29

## Status implementasi lokal per 2026-10-04

Tabel di bawah tetap menjadi alur sasaran penuh. Untuk pilot input manual yang saat ini sudah berjalan, alur pengiriman sengaja disederhanakan menjadi:

```text
draft/returned -> submitted -> under_review -> returned atau approved
```

OPD mengisi minimal satu capaian sebelum `submit`; BAPPERIDA dapat memulai review, mengembalikan dengan catatan wajib, atau menyetujui. Tahap validasi otomatis (`validating`/`ready`) dan konfirmasi internal OPD (`opd_confirmed`) belum diaktifkan karena membutuhkan aturan kualitas serta penunjukan validator OPD yang disepakati. Status tersebut tetap dipertahankan dalam model data agar penambahannya tidak memutus kontrak.

## 1. Definisi indikator

| Dari | Aksi | Ke | Pelaksana | Syarat utama |
|---|---|---|---|---|
| `draft` | submit | `in_review` | BAPPERIDA | Definisi, satuan, frekuensi, dimensi, dan penanggung jawab lengkap |
| `in_review` | approve | `approved` | BAPPERIDA berizin persetujuan | Tidak ada masalah definisi terbuka |
| `approved` | activate | `active` | BAPPERIDA/Superadmin | Tanggal berlaku valid; tidak bentrok dengan versi aktif |
| `active` | retire | `retired` | BAPPERIDA/Superadmin | Versi pengganti tersedia atau indikator dihentikan |

Perubahan indikator aktif selalu membuat `indicator_versions` baru.

## 2. Pengiriman data

| Dari | Aksi | Ke | Pelaksana | Syarat utama |
|---|---|---|---|---|
| `draft` | validate | `validating` | OPD/Sistem | Batch memiliki baris data |
| `validating` | validation_failed | `draft` | Sistem | Terdapat error |
| `validating` | validation_passed | `ready` | Sistem | Tidak ada error terbuka |
| `ready` | submit | `submitted` | Operator OPD | Warning telah diberi catatan bila ada |
| `submitted` | confirm | `opd_confirmed` | Validator OPD | Konfirmasi substansi dan sumber |
| `opd_confirmed` | start_review | `under_review` | BAPPERIDA | Berkas dan metadata lengkap |
| `under_review` | return | `returned` | BAPPERIDA | Alasan koreksi wajib |
| `returned` | revise | `draft` | OPD | Revisi dibuat sebagai batch/versi baru bila diperlukan |
| `under_review` | approve | `approved` | BAPPERIDA | Kelayakan tayang terpenuhi |
| `approved` | include_in_publication | `published` | BAPPERIDA/Superadmin | Observasi masuk publikasi aktif |

## 3. Publikasi

| Dari | Aksi | Ke | Pelaksana | Syarat utama |
|---|---|---|---|---|
| `draft` | activate | `active` | BAPPERIDA/Superadmin | Minimal satu item disetujui, sumber dapat ditelusuri |
| `active` | replace | `replaced` | BAPPERIDA/Superadmin | Publikasi pengganti aktif |
| `active` | withdraw | `withdrawn` | Superadmin | Alasan wajib dan tercatat di audit |

Satu `publication_key` hanya memiliki satu publikasi aktif.

## 4. Koreksi

Observasi terbit tidak diubah atau dihapus. Koreksi membuat observasi baru dengan `supersedes_id` menunjuk versi lama, menjalani validasi dan persetujuan kembali, lalu dimasukkan dalam publikasi pengganti.

## 5. Audit workflow

Setiap transisi mencatat aktor, role efektif, status asal, status tujuan, waktu, catatan, dan correlation ID permintaan. Baris workflow dan audit bersifat append-only.
