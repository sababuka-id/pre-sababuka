# Dokumentasi API SABABUKA

Dokumentasi API adalah kontrak resmi antara frontend, backend, integrasi, pengujian, dan dokumen administrasi.

## Sumber utama

- `openapi.yaml`: kontrak mesin OpenAPI 3.1.
- `kode-error.md`: katalog kode error stabil.
- `changelog.md`: perubahan kontrak API.
- `../14-matriks-role-permission.md`: aturan otorisasi.
- `../15-workflow-mvp-v1.md`: aturan transisi status.

Jika terdapat perbedaan, implementasi harus diperbaiki agar sesuai `openapi.yaml` atau perubahan kontrak harus disetujui dan diberi versi baru.

## Konvensi

- Base path: `/api/v1`.
- Base URL aktif saat ini: `http://127.0.0.1:3001/api/v1`; domain development belum diaktifkan.
- Format: JSON UTF-8, kecuali unggahan berkas.
- Waktu: ISO 8601 UTC; UI menampilkan Asia/Jakarta.
- ID: UUID.
- Autentikasi web: cookie sesi `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- Semua operasi mutasi membutuhkan perlindungan CSRF.
- Pagination memakai `page` dan `page_size` pada MVP.
- Setiap respons membawa `X-Request-Id`.
- Error menggunakan objek `ApiError` dan kode stabil.

## Pemeliharaan

Setiap endpoint baru atau perubahan endpoint wajib memperbarui OpenAPI, contoh request/response, permission, changelog, dan pengujian kontrak sebelum digabungkan.
