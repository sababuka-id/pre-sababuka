# Materi Paparan Update SABABUKA

## Jumat, 9 Oktober 2026

### Pesan utama

SABABUKA sedang menyiapkan master data indikator pembangunan Kabupaten Kapuas. Tahap yang sedang dikerjakan adalah menyusun struktur fokus kebijakan, isu atau kategori, indikator, target, OPD pemilik, serta alur pemeriksaannya. Data realisasi dari BPS, Satu Data Kapuas, dan sumber OPD akan disinkronkan setelah struktur indikator dan pemilik datanya disepakati.

### Pembuka paparan antara

Paparan ini melanjutkan expose pendahuluan. Setelah arah produk dan kebutuhan dashboard pimpinan dibahas, tim UPR berangkat dari Matrix RPJMD Kabupaten Kapuas sebagai sumber acuan pemetaan awal di SABABUKA. Dari matrix tersebut, tim menyusun draft fokus kebijakan, isu atau kategori, indikator, target, dan OPD pemilik. Draft itu kemudian masuk ke ruang verifikasi BAPPERIDA dan pemeriksaan teknis OPD pemilik.

Paparan besok belum menetapkan master final. Forum diminta mengonfirmasi resume Matrix RPJMD, daftar organisasi yang masuk, pemilik indikator, sumber data, dan urutan pekerjaan integrasi. Resume matrix dan matrix forum tersedia pada lampiran terpisah.

## 1. Posisi SABABUKA saat ini

SABABUKA sudah berjalan sebagai aplikasi web untuk menguji tata kelola indikator dan alur persetujuan. Sistem ini menampung struktur indikator dan membantu mencatat siapa yang menyusun, memeriksa, menyetujui, serta menjadi pemilik data.

Yang sudah tersedia:

- 5 kategori pilot dan 15 indikator pilot.
- Target tahunan 2025-2029.
- Role Developer atau Superadmin, BAPPERIDA, OPD, Kominfo baca-saja, dan Pimpinan.
- Alur draft, review, verifikasi teknis, persetujuan, dan publikasi.
- Dashboard pimpinan yang hanya membaca data yang sudah disetujui.
- Koneksi teknis ke Satu Data Kapuas dan profil BPS untuk tahap mapping berikutnya.

Angka pada paket pilot masih berlabel demo sampai OPD dan sumber resmi mengonfirmasi definisi serta nilainya.

## 2. Bahan penyusunan draft

Tim UPR menyusun draft awal hanya dari Matrix RPJMD. Draft memuat usulan fokus kebijakan, isu atau kategori, indikator, target, dan OPD pemilik jika sudah dapat diidentifikasi.

Renstra OPD dan dokumen teknis digunakan pada tahap berikutnya untuk memperjelas definisi, rumus, satuan, sumber, serta penanggung jawab teknis. Renstra belum menjadi dasar utama paket draft yang dipaparkan besok.

## 3. Struktur master data

```text
Matrix RPJMD
    -> Fokus kebijakan
    -> Isu atau kategori strategis
    -> Indikator dan definisi
    -> Target tahunan
    -> OPD pemilik dan bidang pengelola
    -> Sumber data dan realisasi
```

Fokus kebijakan menjadi pengelompokan strategis. Isu atau kategori menjadi unit pengelolaan. Indikator menjadi unit yang memiliki definisi, satuan, periode, target, pemilik, sumber, dan status verifikasi.

## 4. Pembagian peran

| Peran | Tanggung jawab |
| --- | --- |
| Tim UPR | Menyusun draft dari Matrix RPJMD dan mengisi metadata awal |
| BAPPERIDA | Menilai fokus, isu atau kategori, indikator, target, OPD pemilik, dan kelayakan tayang |
| OPD pemilik | Memeriksa kewenangan, definisi, satuan, target, periode, sumber, dan nilai data |
| Pengelola sistem | Menjaga layanan, akun, keamanan, konektor, dan reset demo |
| Kominfo | Memantau kesehatan layanan, alur data, dan keterbukaan dalam mode baca-saja |
| Pimpinan | Membaca data yang sudah disetujui dan dipublikasikan |

Kominfo tidak memvalidasi kategori, indikator, nilai, sumber, atau publikasi. Jika suatu indikator menjadi kewenangan Kominfo, verifikasi teknis tetap mengikuti alur OPD pemilik.

## 5. Alur persetujuan indikator

```text
UPR membuat draft
    -> BAPPERIDA menilai fokus, isu, indikator, dan target
    -> OPD pemilik memeriksa sisi teknis
    -> BAPPERIDA memberi persetujuan akhir
    -> Indikator aktif dan data dapat diperiksa
    -> Data yang disetujui dipublikasikan untuk Pimpinan
```

BAPPERIDA dapat mengembalikan atau menolak draft dengan catatan. OPD mengembalikan indikator bila definisi, sumber, periode, atau pemilik teknis belum benar. Persetujuan awal BAPPERIDA belum membuat indikator langsung tayang.

## 6. Jika OPD mengusulkan indikator

OPD dapat mengusulkan fokus, isu, kategori, atau indikator baru. Usulan tetap berstatus draft. BAPPERIDA memeriksa kesesuaiannya dengan RPJMD dan kebijakan daerah. Setelah itu OPD memeriksa aspek teknis, lalu BAPPERIDA memberikan persetujuan akhir.

Dengan alur ini, OPD dapat mengusulkan kebutuhan lapangan tanpa menetapkan sendiri struktur strategis kabupaten.

## 7. Validasi data sebelum tayang

Data dapat berasal dari Satu Data Kapuas, BPS, unggahan OPD, formulir SABABUKA, atau dokumen resmi OPD. Sistem memeriksa tahun, wilayah, satuan, tipe nilai, kelengkapan, duplikasi, rentang nilai, sumber, dan waktu pengambilan.

BAPPERIDA menentukan apakah data disetujui untuk publikasi, dikembalikan untuk koreksi, atau ditolak dengan catatan. Data yang belum disetujui tidak masuk dashboard pimpinan.

## 8. OPD yang belum memiliki dataset atau website

OPD tetap dapat menjadi pemilik indikator. Data dapat dimasukkan melalui:

- Form SABABUKA.
- Template CSV atau XLSX.
- Dokumen resmi yang disahkan OPD.
- Dataset Satu Data Kapuas jika sudah tersedia.
- Data BPS atau sumber resmi lain yang disepakati.

Setiap nilai tetap harus memiliki pemilik, periode, satuan, wilayah, waktu pembaruan, sumber, dan status verifikasi. Label sumber dibuat jelas, misalnya Manual OPD, Dokumen resmi OPD, Satu Data Kapuas, atau BPS.

## 9. Konfirmasi organisasi dan kontak

Sebelum pemetaan indikator diperluas, daftar OPD dan kecamatan perlu dikonfirmasi. Status yang digunakan:

- Masuk SABABUKA.
- Tidak masuk.
- Perlu koreksi nama atau kode.
- Perlu digabung.
- Menunggu forum.

Formulir konfirmasi meminta URL website atau portal data, bidang pemilik data, PIC, operator, kontak resmi, jenis data, frekuensi pembaruan, serta kebutuhan integrasi. Kontak disimpan dengan akses terbatas. Link grup koordinasi dan QR code ditampilkan setelah URL resmi dikonfirmasi.

Lampiran paparan menyediakan tabel konfirmasi dengan kolom status masuk, koreksi nama atau kode, bidang pemilik data, PIC, operator, URL website atau portal data, dan kontak resmi. Ruang URL grup koordinasi dan barcode disiapkan untuk diisi setelah forum menyepakati link resmi.

## 10. Batas tahap dan pekerjaan berikutnya

Paparan besok berfokus pada master data, kategori, indikator, pemilik data, serta alur persetujuan. Sinkronisasi angka dari BPS dan Satu Data Kapuas dikerjakan setelah metadata, akses resmi, kode wilayah, satuan, jadwal rilis, dan pemetaan indikator disepakati.

SABABUKA membaca data dari sumber. Sistem tidak menulis balik ke Satu Data tanpa API dan persetujuan resmi.

## 11. Simulasi yang ditunjukkan

Gunakan satu contoh yang sederhana:

- Fokus kebijakan: Ketahanan Pangan Daerah.
- Isu atau kategori: Ketersediaan Pangan.
- Indikator: Indeks Ketahanan Pangan.
- OPD pemilik: DKPP.

Urutannya:

1. UPR membuat kategori dan indikator sebagai draft.
2. BAPPERIDA menyetujui kategori.
3. BAPPERIDA mengirim indikator kepada OPD pemilik.
4. OPD memeriksa definisi, satuan, target, periode, dan sumber.
5. BAPPERIDA memberi persetujuan akhir.
6. Data masuk melalui sumber yang disepakati, lalu BAPPERIDA memeriksa sebelum publikasi.
7. Pimpinan melihat hasil yang sudah disetujui.

Paket latihan dapat direset untuk mengulangi simulasi tanpa menghapus master resmi.

## 12. Keputusan yang diminta dari forum

1. OPD dan kecamatan yang masuk SABABUKA.
2. Fokus dan kategori strategis.
3. Indikator pilot dan OPD pemilik.
4. Bidang, PIC, dan operator.
5. Sumber data serta jadwal pembaruan.
6. Batas data yang boleh tampil di dashboard pimpinan.
7. Dataset Satu Data dan rujukan BPS yang siap dipetakan.
8. URL grup koordinasi dan persetujuan simulasi.

Resume Matrix RPJMD dan daftar 28 perangkat daerah atau badan serta 17 kecamatan dibawa sebagai bahan kerja forum. Setiap organisasi diberi keputusan yang dapat diisi langsung: masuk, koreksi, tambah, keluarkan, atau menunggu konfirmasi.

## Penutup

Fondasi sistem sudah disiapkan. Tahap berikutnya adalah menetapkan master dan sumber resmi bersama. BAPPERIDA menetapkan arah dan kelayakan, OPD memastikan data, dan SABABUKA menjaga alur serta bukti pemeriksaannya.

## Catatan internal presenter

Bagian berikut tidak perlu ditampilkan pada paparan utama karena terlalu teknis atau belum diperlukan untuk keputusan OPD:

- Detail perlindungan IP, source map, CSP, CORS, secret, dan repository.
- Detail endpoint API BPS, API key, checksum, dan struktur staging.
- Tombol internal untuk berpindah akun demo.
- Detail migration database dan konfigurasi server.

Jika ditanya tentang keamanan, cukup jawab bahwa aturan workflow dan akses diproses di backend, secret tidak dikirim ke frontend, dan setiap perubahan dicatat pada audit. Jika ditanya tentang integrasi BPS, sampaikan bahwa konektor teknis sudah disiapkan, sedangkan akses resmi dan mapping indikator masih menunggu kesepakatan sumber data.
