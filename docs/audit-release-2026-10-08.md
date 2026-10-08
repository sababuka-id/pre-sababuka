# Audit release SABABUKA — 8 Oktober 2026

Audit ini memakai pembacaan kode, migration lokal, query read-only ke database demo, test backend, build, dan smoke test health. Tidak ada data master atau transaksi yang diubah saat audit.

| Area | Expected | Actual / evidence | Status |
| --- | --- | --- | --- |
| Role dan secret | Hanya Superadmin membaca atau mengubah API key BPS | Endpoint secret memakai `requireSuperadmin` dan permission `connector_secret.view/manage`; BAPPERIDA hanya mendapat permission konektor umum | Lulus |
| Penyimpanan secret | Ciphertext at rest, tanpa plaintext di response/audit/log | AES-256-GCM dengan `CONNECTOR_ENCRYPTION_KEY`; response hanya status/mask; test round-trip dan non-plaintext lulus | Lulus |
| Master governance | Matching hanya memakai kategori approved dan indikator approved/active | Query `matchCandidates` memfilter `review_status='approved'`, `is_active=true`, dan versi indikator approved/active; database lokal saat audit masih 36 kategori draft dan 71 versi indikator draft, sehingga kandidat sah = 0 | Lulus / menunggu keputusan BAPPERIDA |
| CKAN | Discovery live, profile, mapping eksplisit, staging, preview, import terpisah | Satu Data Kapuas terdaftar pada migration 023; resource tidak diimpor tanpa mapping; URL resource dibatasi HTTPS dan host sumber | Lulus |
| BPS | Test koneksi aman dan hanya aktif setelah key tersedia | Sumber BPS terdaftar dengan domain 6203; status tanpa key tetap menunggu konfigurasi; key baru diuji sebelum disimpan | Lulus / menunggu key resmi |
| Provenance | Import tidak menimpa manual, menyimpan checksum, URL, waktu, sumber, geografi | Batch `api_import` terpisah, checksum run, source status `verified_direct`, geografi wajib ada di master | Lulus |
| Annual scope | Release hanya annual 2025-2029 | Mapping, staging, UI, dan dokumentasi membatasi rentang tersebut | Lulus |
| Auth/session | Endpoint terlindungi dan mutasi memakai CSRF | Health 200; endpoint secret tanpa sesi menghasilkan 401; test security dan auth lulus | Lulus |
| Demo/reset | Master RPJMD tidak ikut terhapus | Reset tetap memakai isolasi paket demo dari migration 021; tidak disentuh pada audit ini | Lulus berdasarkan test existing |
| Build dan test | Backend/frontend dapat dibangun | Backend test 13 lulus, 7 skip; build backend/frontend lulus | Lulus |

## Temuan dan perbaikan

- **P1 diperbaiki:** URL BPS yang membawa query key tidak lagi disimpan ke run, staging, batch, provenance, atau audit. Database hanya menerima URL publik tanpa secret.
- **P1 diperbaiki:** resource URL konektor harus HTTPS dan hostname-nya sama dengan sumber resmi, sehingga mapping tidak menjadi SSRF bebas.
- **P1 diperbaiki:** impor eksternal sekarang mengisi `geography_id` dari master geografi dan menolak kode wilayah yang belum terdaftar.
- **P2 diperbaiki:** nama sumber pada observasi diambil dari data source, bukan selalu dilabeli Satu Data Kapuas.
- **P2 diperbaiki:** profile koneksi menyimpan waktu respons, identitas platform, jumlah dataset/resource, publisher, tahun, error tersanitasi, dan kandidat master; tidak ada auto-approve atau auto-import fuzzy.

## Residual risk dan batas release

- Key BPS resmi belum dipasang pada environment demo, sehingga konektor BPS belum dapat disebut connected atau dipakai mengimpor data.
- Test integration lintas database dilewati ketika `INTEGRATION_DATABASE_URL` tidak tersedia. Unit, smoke health, typecheck, dan build tetap dijalankan.
- Endpoint website/API OPD belum diaktifkan; kontrak profile koneksi baru disiapkan agar konektor berikutnya mengikuti pola yang sama.
- Cakupan data release tetap annual 2025-2029. Interval bulanan, triwulanan, atau semester belum boleh diklaim aktif.
