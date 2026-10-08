# Konektor sumber eksternal

SABABUKA memakai konektor eksplisit untuk menghubungkan indikator tahunan dengan sumber resmi. Konektor tidak mencocokkan judul secara otomatis dan tidak menimpa data manual.

## Sumber yang tersedia

- **Satu Data Kapuas** memakai katalog CKAN. Pencarian katalog tersedia dari menu Konektor dan mengambil metadata paket/resource. Resource CSV atau JSON harus dipilih dan dipetakan ke indikator tertentu.
- **BPS Kabupaten Kapuas** memakai WebAPI BPS. Status awalnya `Menunggu API key` sampai `BPS_API_KEY` diatur di environment backend. Setelah key tersedia, mapping membutuhkan URL endpoint resource BPS yang eksplisit.

Superadmin dapat mengelola key BPS dari **Konfigurasi Sistem → API BPS Kabupaten Kapuas**. Tombol **Simpan & Uji Koneksi** menguji key lebih dulu, lalu menyimpannya dalam bentuk terenkripsi dengan `CONNECTOR_ENCRYPTION_KEY`. Nilai key tidak pernah dikembalikan ke browser, log, audit, atau pesan error. Tombol **Nonaktifkan / Hapus key** menghapus ciphertext dari database. `BPS_API_KEY` environment tetap dibaca sebagai fallback kompatibilitas, tetapi tidak dapat ditulis dari aplikasi.

Contoh konfigurasi lokal ada di `backend/.env.example`. Jangan menyimpan API key di Git, seed, atau metadata dataset.
Skrip demo menyimpan master key konektor di `backend/tmp/connector-encryption-key` yang di-ignore Git agar ciphertext tetap bisa dibuka setelah restart lokal; environment produksi harus menyediakan `CONNECTOR_ENCRYPTION_KEY` dari secret manager.

## Alur penggunaan

1. Cari resource di katalog atau siapkan endpoint BPS.
2. Buat mapping draf ke satu versi indikator tahunan. Mapping wajib mencantumkan field tahun, nilai, dan kode wilayah; rentang yang diterima saat ini 2025-2029 dan wilayah default Kabupaten Kapuas `6203`.
3. BAPPERIDA menyetujui lalu mengaktifkan mapping.
4. Jalankan **Preview sinkronisasi**. Data diambil ke staging, divalidasi tahun, wilayah, nilai numerik, dan satuan. Baris yang tidak valid ditahan dan tidak masuk batch.
5. Tinjau preview, lalu impor. Impor membuat batch `api_import` terpisah dengan checksum, URL, waktu pengambilan, dan status sumber `verified_direct`; batch manual tidak diubah.

Tombol **Uji koneksi** pada setiap konektor menampilkan profile terukur: keterjangkauan, waktu respons, identitas platform, jumlah dataset dan resource yang dapat diproses, publisher, cakupan tahun, serta error yang sudah disanitasi. Profile juga menampilkan kandidat kategori dan indikator yang sudah `approved` atau `active` saja. Skor dan alasan kata kunci hanya bahan review; kandidat tidak pernah otomatis membuat master baru, menyetujui mapping, atau mengimpor nilai. Endpoint website/API OPD dapat ditambahkan dengan kontrak profile yang sama, tetapi belum dinyatakan terhubung sampai konektornya benar-benar diimplementasikan.

Konektor hanya bertugas mengambil realisasi dari sumber resmi. Target RPJMD/Renstra tetap menjadi data perencanaan yang dikelola di SABABUKA. Jika dua sumber menghasilkan angka berbeda, buat mapping sumber pendukung dan tahan keputusan sampai diverifikasi, jangan memilih diam-diam.

## Hak akses

`connector.view` dapat melihat status, katalog, mapping, dan preview. `connector.manage` membuat mapping dan menjalankan aksi mapping/import. Aktivasi publikasi tetap mengikuti permission publikasi BAPPERIDA; pimpinan hanya membaca hasil yang sudah aktif.
