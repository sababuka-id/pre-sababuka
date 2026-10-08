# Materi Paparan Update SABABUKA

## Jumat, 9 Oktober 2026

### Pesan utama

SABABUKA sedang membangun master data indikator pembangunan Kabupaten Kapuas. Tahap saat ini berfokus pada penataan fokus kebijakan, isu atau kategori, indikator, target, pemilik data, serta alur persetujuan. Integrasi realisasi dari BPS, Satu Data Kapuas, dan sumber data OPD menjadi tahap lanjutan setelah struktur indikator disepakati.

## 1. Posisi SABABUKA saat ini

SABABUKA sudah berjalan sebagai aplikasi web demo/UAT lokal dengan autentikasi lintas role, master indikator, alur pengiriman data, pemeriksaan BAPPERIDA, publikasi, dashboard pimpinan, konektor sumber, notifikasi, dan audit.

Angka yang aman untuk disampaikan:

- 5 kategori pilot dan 15 indikator pilot pada paket demo yang sudah tersedia.
- Target indikator berada pada cakupan tahunan 2025-2029.
- 5 role aplikasi: Developer/Superadmin, BAPPERIDA, Kominfo baca-saja, OPD, dan Pimpinan.
- Struktur database telah melalui 27 migration berurutan pada versi lokal terbaru.
- Integrasi konektor Satu Data dan profil BPS sudah tersedia pada level teknis untuk discovery, mapping, preview, staging, dan import terkontrol.
- Data yang belum memiliki sumber resmi tetap berlabel demo atau menunggu konfirmasi OPD.

SABABUKA belum boleh disebut sebagai layanan produksi penuh atau sebagai sumber data resmi tunggal sebelum UAT, kredensial sumber, dan persetujuan pemilik data selesai.

## 2. Sumber draft tahap sekarang

Tim UPR menyusun draft awal hanya dari Matrix RPJMD. Draft tersebut memuat usulan fokus kebijakan, isu atau kategori, indikator, target, OPD pemilik, dan keterangan sumber jika sudah diketahui.

Renstra OPD dan dokumen teknis lain dapat memperkaya definisi, rumus, dan metadata pada tahap berikutnya. Dokumen tersebut belum menjadi dasar utama paket draft yang dipresentasikan pada tahap ini.

## 3. Struktur master data

```text
Matrix RPJMD
    ↓
Fokus kebijakan
    ↓
Isu atau kategori strategis
    ↓
Indikator dan versi definisi
    ↓
Target tahunan
    ↓
OPD pemilik dan bidang pengelola
    ↓
Sumber data dan realisasi
```

Fokus kebijakan dipakai sebagai pengelompokan strategis. Kategori atau isu menjadi unit pengelolaan utama. Indikator menjadi unit yang memiliki definisi, satuan, periode, target, pemilik, sumber, dan status verifikasi.

## 4. Pembagian peran

| Peran | Tanggung jawab |
| --- | --- |
| Tim UPR | Menyusun draft dari Matrix RPJMD dan memasukkan metadata awal |
| Admin BAPPERIDA | Menilai fokus, isu atau kategori, indikator, target, sumber yang diusulkan, dan kelayakan tayang |
| Operator OPD | Memeriksa kewenangan, definisi, satuan, target, periode, sumber, dan nilai data milik organisasinya |
| Superadmin atau developer | Menjaga aplikasi, akun, konfigurasi teknis, konektor, backup, keamanan, dan reset demo |
| Kominfo | Memantau layanan, kesehatan konektor, alur data, audit teknis, dan keterbukaan data dalam mode baca saja |
| Pimpinan | Membaca data yang sudah disetujui dan dipublikasikan |

Kominfo tidak menyetujui kategori, indikator, observasi, sumber data, atau publikasi. Jika Kominfo menjadi pemilik indikator tertentu, operator Kominfo dapat memakai role OPD dengan scope organisasinya untuk melakukan verifikasi teknis.

## 5. Alur persetujuan indikator

```text
UPR membuat draft
    ↓
BAPPERIDA menilai fokus, isu, indikator, dan target
    ↓
Disetujui untuk verifikasi OPD
    ↓
OPD pemilik memeriksa sisi teknis
    ↓
BAPPERIDA memberi keputusan akhir
    ↓
Master indikator aktif
```

Jika BAPPERIDA menemukan masalah, mereka dapat mengembalikan draft dengan catatan atau menolaknya dengan alasan. Jika OPD menemukan masalah teknis, OPD mengembalikan indikator kepada BAPPERIDA dan menyertakan koreksi atau keterangan sumber.

Persetujuan awal BAPPERIDA belum berarti indikator langsung tayang. Persetujuan akhir dilakukan setelah verifikasi teknis OPD selesai.

## 6. Jika OPD mengusulkan indikator

OPD dapat mengusulkan fokus, isu, kategori, atau indikator baru. Usulan tersebut tetap masuk sebagai draft. BAPPERIDA memeriksa kesesuaian dengan RPJMD dan kebijakan daerah, lalu OPD memvalidasi aspek teknisnya. BAPPERIDA melakukan persetujuan akhir sebelum indikator aktif.

Alur ini menjaga agar OPD dapat mengusulkan kebutuhan lapangan tanpa menetapkan sendiri struktur strategis kabupaten.

## 7. Pemeriksaan data masuk

Dashboard pemeriksaan data masuk menjadi antrean BAPPERIDA untuk memeriksa data yang berasal dari Satu Data, BPS, unggahan OPD, atau input manual.

BAPPERIDA memeriksa:

- indikator dan versi definisi yang digunakan;
- tahun, periode, dan wilayah;
- satuan dan tipe nilai;
- kelengkapan dan duplikasi;
- kewajaran nilai;
- sumber dan URL;
- waktu pengambilan;
- status validasi OPD;
- kesesuaian data dengan target.

Sistem menjalankan validasi otomatis lebih dahulu. BAPPERIDA memeriksa antrean yang perlu keputusan, kemudian memilih setujui, kembalikan, atau tolak. Data yang belum disetujui tidak masuk publikasi pimpinan.

## 8. Contoh simulasi end-to-end

Paket simulasi menggunakan contoh berikut:

- Fokus kebijakan: Ketahanan Pangan Daerah
- Isu atau kategori: Ketersediaan Pangan
- Indikator: Indeks Ketahanan Pangan
- OPD pemilik: DKPP
- Target latihan: tahun 2026
- Sumber simulasi: dataset Satu Data Kapuas

Urutan simulasi:

1. UPR membuat kategori dan indikator dalam status draft.
2. Admin BAPPERIDA menyetujui kategori.
3. Admin BAPPERIDA memeriksa indikator dan menunjuk DKPP sebagai pemilik.
4. Operator DKPP memeriksa definisi, satuan, target, periode, dan sumber data.
5. BAPPERIDA menyetujui indikator secara final.
6. Superadmin atau developer mengatur mapping teknis sumber data.
7. Sistem mengambil preview dan menahan nilai di staging.
8. Operator DKPP mengonfirmasi data teknis.
9. BAPPERIDA memeriksa data masuk dan menyetujui publikasi.
10. Pimpinan melihat indikator dan realisasi pada dashboard.

Sinkronisasi pada simulasi berarti SABABUKA membaca data dari Satu Data. SABABUKA tidak menulis balik ke Satu Data tanpa API dan persetujuan resmi.

## 9. Kebutuhan integrasi BPS

Integrasi BPS membutuhkan:

- endpoint atau WebAPI resmi;
- API key jika diwajibkan;
- daftar tabel atau publikasi yang digunakan;
- pemetaan kode indikator;
- kode wilayah dan satuan;
- periode dan frekuensi rilis;
- definisi metadata;
- batas penggunaan data;
- jadwal pembaruan;
- prosedur bila angka BPS berbeda dari data OPD.

Target RPJMD tetap tersimpan sebagai target perencanaan. Angka BPS menjadi salah satu sumber realisasi. Sistem menyimpan URL sumber, waktu pengambilan, checksum, status kualitas, dan status verifikasi.

## 10. OPD tanpa dataset Satu Data atau website

OPD tetap dapat menggunakan SABABUKA melalui:

- input manual;
- form capaian;
- template CSV atau XLSX;
- dokumen resmi OPD;
- endpoint internal jika tersedia;
- dataset Satu Data jika sudah dipublikasikan;
- publikasi BPS jika menjadi sumber yang disepakati.

Sumber diberi label yang jelas, misalnya `Manual OPD`, `Dokumen resmi OPD`, `Satu Data Kapuas`, atau `BPS`. Setiap nilai tetap membutuhkan periode, satuan, wilayah, pemilik, waktu pembaruan, dan bukti verifikasi.

## 11. Konfirmasi daftar organisasi

SABABUKA perlu menampilkan daftar seluruh organisasi yang sudah terdaftar. OPD dan kecamatan dipisahkan berdasarkan jenis organisasinya.

Setiap organisasi diberi status konfirmasi:

- Masuk SABABUKA;
- Tidak masuk;
- Nama atau kode perlu diperbaiki;
- Organisasi perlu digabung;
- Menunggu keputusan forum.

Daftar ini menjadi bahan konfirmasi awal kepada OPD sebelum indikator dan sumber data dipetakan lebih jauh.

## 12. Formulir konfirmasi OPD

Formulir dapat meminta:

- kode dan nama OPD;
- URL website resmi;
- URL portal data atau API;
- nama bidang pemilik data;
- nama penanggung jawab;
- nama operator;
- email dinas dan kontak resmi;
- jenis data yang tersedia;
- frekuensi pembaruan;
- status dataset di Satu Data;
- status ketersediaan data BPS;
- catatan kebutuhan integrasi.

Data kontak disimpan pada akses terbatas dan tidak ditampilkan pada dashboard publik. Link grup koordinasi SABABUKA dan QR code digunakan setelah URL grup resmi dikonfirmasi.

## 13. Mode simulasi lintas role

Superadmin mendapat tombol **Mode Simulasi** untuk memilih akun demo BAPPERIDA, OPD, Kominfo baca-saja, dan Pimpinan. Tombol ini hanya mengisi akun demo pada halaman login; autentikasi tetap dilakukan dengan kredensial akun demo masing-masing.

Mode tersebut harus:

- hanya aktif pada development atau demo;
- memakai akun demo yang terpisah;
- menampilkan keterangan bahwa akun yang dipilih adalah akun demo;
- mencatat tindakan pada audit;
- tidak membuka akun pengguna nyata;
- dapat dikembalikan ke Superadmin;
- dapat direset tanpa menghapus master RPJMD.

## 14. Perlindungan IP dan keamanan

Browser selalu menerima sebagian kode frontend sehingga tidak mungkin membuat aplikasi web sepenuhnya tidak dapat di-inspect. Perlindungan utama ditempatkan pada backend dan repository.

Kontrol yang diterapkan atau diwajibkan:

- aturan bisnis dan keputusan workflow diproses di backend;
- secret, API key, dan kredensial tidak dikirim ke frontend;
- source map produksi dimatikan;
- build produksi diminifikasi;
- endpoint development dan seed demo dinonaktifkan pada produksi;
- CORS, CSP, cookie, rate limit, dan audit log dikunci;
- repository dan credential deployment dibatasi;
- data resmi tidak ditanam pada bundle JavaScript;
- akses Kominfo hanya menampilkan status yang diperlukan;
- data kontak OPD tidak ditampilkan untuk umum.

## 15. Keputusan yang dibutuhkan dari forum

1. Daftar OPD dan kecamatan yang masuk SABABUKA.
2. Fokus dan kategori yang disepakati BAPPERIDA.
3. Indikator pilot yang menjadi prioritas.
4. OPD pemilik dan bidang pengelola setiap indikator.
5. Sumber data utama setiap indikator.
6. Batas data yang boleh tampil di dashboard pimpinan.
7. Jadwal pembaruan dan batas waktu verifikasi.
8. PIC dan operator setiap OPD.
9. Endpoint atau kredensial integrasi BPS.
10. Dataset Satu Data yang siap dipetakan.
11. URL grup koordinasi SABABUKA.
12. Persetujuan untuk uji simulasi lintas role.

## Kalimat penutup

SABABUKA saat ini sedang menata fondasi tata kelola indikator. Sistem menyiapkan satu master data yang menghubungkan kebijakan, indikator, pemilik data, sumber, dan status verifikasi. Setelah struktur tersebut disepakati oleh BAPPERIDA dan OPD, SABABUKA siap melanjutkan sinkronisasi terukur dengan BPS, Satu Data Kapuas, dan sumber data OPD.
