# Audit release SABABUKA - 8 Oktober 2026

Audit ini mencakup role, alur persetujuan, publikasi, dashboard pimpinan, notifikasi, konektor sumber data, provenance, orphan reference, reset demo, build, dan uji lintas-peran. Database produksi lokal hanya dibaca. Uji transaksi dijalankan pada database audit terisolasi yang kemudian dapat dihapus.

## Hasil gate

| Area | Pemeriksaan | Hasil | Status |
| --- | --- | --- | --- |
| Migrasi | Migration 001-024 pada database audit | 24 migration berhasil diterapkan berurutan | Lulus |
| Role dan menu | Superadmin, BAPPERIDA, Kominfo, OPD, pimpinan | Matriks permission dan menu mengikuti scope; connector secret hanya superadmin | Lulus |
| Anti self-approval | Pengaju kategori/indikator tidak boleh menyetujui objek yang sama | Backend mengembalikan konflik dan menyimpan actor audit | Lulus |
| Verifikasi OPD | Verifikasi indikator wajib dilakukan oleh OPD pemilik | Global role tidak dapat melewati scope organisasi | Lulus |
| State machine | Kategori disetujui sebelum indikator, lalu approve BAPPERIDA, verifikasi OPD, aktivasi | Diuji dalam workflow lintas peran | Lulus |
| Publication gate | Kandidat dan item publikasi hanya menerima batch approved, indikator approved/active, dan kategori approved/active | Query kandidat dan add item memakai gate yang sama | Lulus |
| Dashboard | Metrik indikator aktif hanya menghitung master yang aktif dan kategorinya approved | Query executive diselaraskan dengan publication gate | Lulus |
| Data operasi | Ringkasan OPD hanya menghitung dataset manual capaian SABABUKA | Batch konektor tidak tercampur ke ringkasan pelaporan OPD | Lulus |
| CKAN/Satu Data | Discovery, profile, mapping eksplisit, staging, preview, import | Tidak ada auto-import atau fuzzy auto-approve | Lulus |
| BPS | Profile BPS, secret terenkripsi, URL publik tanpa query key | Endpoint secret tanpa sesi 401; belum connected tanpa key resmi | Lulus / menunggu key |
| Provenance | Source, URL publik, checksum, waktu ambil, status kualitas, geografi | Import eksternal terpisah dari input manual | Lulus |
| Orphan reference | Notification, publication item, workflow, evidence, audit event, connector run | Query integritas audit menghasilkan 0 orphan | Lulus |
| Demo/reset | Data demo dapat dibuat ulang tanpa menghapus master RPJMD | Seed/reset tetap terisolasi | Lulus |
| Annual scope | Periode rilis dibatasi annual 2025-2029 | Tidak ada klaim interval bulanan/triwulanan | Lulus |
| Build | Backend typecheck/build dan frontend typecheck/build | Keduanya berhasil | Lulus |
| E2E | Semua suite integration pada database audit | 7/7 lulus, 0 gagal, 0 skip | Lulus |
| Visual browser | Chrome desktop, lima role, navigasi utama, denied route, empty state, modal/form, connector settings | Smoke lintas-role lulus; console error 0; tidak ada 4xx/5xx tak terduga | Lulus |

## Temuan P0/P1 yang sudah diperbaiki

- Pengaju kategori dan pengaju indikator tidak dapat menjadi approver pada objek yang sama.
- Reviewer BAPPERIDA tidak dapat sekaligus menjadi verifikator teknis OPD.
- Verifikasi indikator selalu dibatasi ke organisasi pemilik; superadmin tidak lagi mendapat bypass global.
- Kandidat publikasi tidak dapat mengambil versi indikator draft atau kategori yang belum disetujui.
- Dashboard pimpinan tidak lagi menghitung indikator aktif yang master-nya belum layak tampil.
- Ringkasan operasi tidak mencampur batch konektor dengan dataset pelaporan manual OPD.
- Pemeriksaan orphan diperluas ke audit event dan seluruh referensi typed yang dipakai notifikasi/konektor.
- Menu `Sumber Data` ditampilkan untuk role yang berwenang dan halaman konektor diberi kartu ringkasan yang terbaca pada desktop serta responsif.
- Metrik `Publikasi aktif` kini hanya menghitung publikasi yang memiliki item eligible, sehingga angka dashboard sama dengan daftar yang dapat ditampilkan.

## Bukti audit visual browser

- Superadmin, BAPPERIDA, Kominfo, OPD, dan pimpinan berhasil login pada Chrome desktop dengan akun audit sementara.
- Sidebar diverifikasi per role. Superadmin/BAPPERIDA melihat `Sumber Data`; Kominfo dan OPD mendapat penolakan yang jelas saat membuka route yang tidak berwenang.
- Halaman connector, publikasi, dashboard pimpinan, asisten data, notifikasi, operasi OPD, dan konfigurasi sistem terbuka tanpa error console. Empty state notifikasi dan state mapping connector terbaca.
- Route `/connectors` untuk Kominfo dan `/reviews` untuk OPD menampilkan pesan akses ditolak tanpa crash atau blank screen.
- Runtime log tidak menunjukkan 4xx/5xx tak terduga; respons 401 yang tersisa berasal dari pemeriksaan unauthenticated yang memang diharapkan.
- Lima akun audit sementara sudah diarsipkan setelah smoke test; tidak ada akun audit aktif yang ditinggalkan.

## Bukti database audit

Database audit menunjukkan 24 migration, 0 indikator aktif tanpa kategori approved, 0 duplikasi versi aktif, 0 duplikasi target, 0 orphan publication item, 0 publikasi aktif tanpa item, 0 orphan connector run, dan 0 connector secret tersimpan. Dua kategori tanpa policy focus yang muncul saat pemeriksaan adalah kategori sementara yang dibuat oleh test lintas-peran, bukan data produksi.

## Sisa risiko sebelum rilis eksternal

- Key BPS resmi belum dipasang pada environment demo. Konektor BPS belum boleh disebut connected atau dipakai impor sampai key dan profile resmi diverifikasi.
- Endpoint website/API OPD belum diaktifkan; kontrak konektor sudah siap tetapi belum menggantikan konfirmasi OPD.
- Cakupan release tetap annual 2025-2029. Interval bulanan, triwulanan, dan semester belum aktif.
- Audit visual desktop sudah dilakukan. Audit mobile dan pengujian konektor eksternal nyata tetap menunggu environment serta kredensial resmi.

## Perintah validasi

```powershell
cd backend
pnpm check
pnpm build
cd ..\frontend
pnpm build
```

Uji integration memakai database PostgreSQL terisolasi, empat role utama, dan satu superadmin. Perubahan governance sebelumnya sudah tercatat pada commit `6d0c514`; perubahan audit visual dan konsistensi metrik dicatat pada commit lokal berikutnya. Push hanya boleh menuju target development/preview yang terverifikasi; tidak ada deployment produksi dari audit ini.
