# Audit Kesesuaian OPD dan Kecamatan

Tanggal pemeriksaan: 7 Oktober 2026  
Sumber pembanding: `DAFTAR LAMPIRAN SKPD DAN CAMAT.docx`  
Data aplikasi: endpoint organisasi SABABUKA lokal

## Kesimpulan

Daftar organisasi SABABUKA belum sesuai dengan dokumen lampiran. Dokumen memuat 45 penerima yang terdiri dari 28 perangkat daerah, sekretariat, dan badan serta 17 kecamatan. Aplikasi memuat 20 organisasi. Sebanyak 16 organisasi dapat dipadankan berdasarkan nama atau singkatan, 12 entitas perangkat daerah belum tersedia sebagai organisasi yang setara, dan 17 kecamatan belum dibuat sebagai entitas tersendiri.

## Organisasi yang sudah dapat dipadankan

| Kode aplikasi | Nama aplikasi | Nomor dokumen | Catatan |
|---|---|---:|---|
| BAPPERIDA | Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah | 3 | Sesuai |
| DISDIK | Dinas Pendidikan | 5 | Sesuai |
| DINKES | Dinas Kesehatan | 6 | Sesuai |
| DPUPR | Dinas Pekerjaan Umum dan Penataan Ruang | 7 | Sesuai |
| DISPERKIMTAN | Dinas Perumahan, Kawasan Permukiman dan Pertanahan | 8 | Sesuai |
| DLHK | Dinas Lingkungan Hidup dan Kehutanan | 9 | Sesuai |
| DPMD | Dinas Pemberdayaan Masyarakat dan Desa | 10 | Sesuai |
| DP3APPKB | Dinas P3APPKB | 11 | Nama aplikasi berupa singkatan |
| DKPP | Dinas Ketahanan Pangan dan Perikanan | 12 | Sesuai |
| DINSOS | Dinas Sosial | 13 | Sesuai |
| DISPERINDAGKOPUKM | Dinas Perdagangan, Perindustrian, Koperasi dan UKM | 14 | Sesuai secara makna |
| DISNAKERTRANS | Dinas Tenaga Kerja dan Transmigrasi | 15 | Urutan istilah berbeda, entitas sama |
| DISTAN | Dinas Pertanian | 16 | Sesuai; dokumen memiliki salah ketik `DINAS DINAS` |
| DPMPTSP | Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu | 17 | Sesuai |
| DISHUB | Dinas Perhubungan | 21 | Sesuai |
| DISARPUS | Dinas Kearsipan dan Perpustakaan | 22 | Sesuai |

## Perangkat daerah yang belum tersedia sebagai entitas setara

1. Sekretariat Daerah Kabupaten Kapuas. Aplikasi hanya memiliki unit `Sekretariat Daerah - Bagian Perekonomian`.
2. Inspektorat Kabupaten Kapuas.
3. Sekretariat DPRD Kabupaten Kapuas.
4. Badan Pendapatan Daerah Kabupaten Kapuas.
5. Badan Kepegawaian dan Pengembangan Sumber Daya Manusia Kabupaten Kapuas.
6. Badan Keuangan dan Aset Daerah Kabupaten Kapuas.
7. Badan Penanggulangan Bencana Daerah Kabupaten Kapuas.
8. Dinas Pemadam Kebakaran dan Penyelamatan Kabupaten Kapuas.
9. Satuan Polisi Pamong Praja Kabupaten Kapuas.
10. Dinas Komunikasi, Informatika, Persandian dan Statistik Kabupaten Kapuas.
11. Dinas Kependudukan dan Pencatatan Sipil Kabupaten Kapuas.
12. Badan Kesatuan Bangsa dan Politik Kabupaten Kapuas.

## Kecamatan yang belum dibuat sebagai entitas tersendiri

1. Kecamatan Selat
2. Kecamatan Kapuas Hilir
3. Kecamatan Kapuas Barat
4. Kecamatan Basarang
5. Kecamatan Kapuas Timur
6. Kecamatan Pulau Petak
7. Kecamatan Kapuas Kuala
8. Kecamatan Mantangai
9. Kecamatan Kapuas Murung
10. Kecamatan Bataguh
11. Kecamatan Tamban Catur
12. Kecamatan Dadahup
13. Kecamatan Kapuas Tengah
14. Kecamatan Timpah
15. Kecamatan Kapuas Hulu
16. Kecamatan Pasak Talawang
17. Kecamatan Mandau Talawang

Aplikasi saat ini hanya memiliki satu entri kelompok bernama `Perwakilan Kecamatan Kabupaten Kapuas`. Entri ini tidak setara dengan 17 kecamatan pada dokumen karena tidak dapat digunakan untuk penetapan pengguna, hak akses, atau pelaporan per kecamatan.

## Entri aplikasi yang tidak tercantum sebagai penerima pada dokumen

1. Pemerintah Kabupaten Kapuas (`KAPUAS`), sebagai organisasi induk.
2. Perumda Air Minum Kabupaten Kapuas (`PERUMDA_AIR`).
3. Perwakilan Kecamatan Kabupaten Kapuas (`KECAMATAN`), sebagai kelompok sementara.
4. Sekretariat Daerah - Bagian Perekonomian (`SETDA_EKO`), sebagai unit kerja di bawah Sekretariat Daerah.

Entri tambahan dapat dipertahankan jika memang diperlukan oleh struktur aplikasi. Namun, entri tersebut tidak menggantikan organisasi yang tercantum dalam dokumen.

## Catatan kualitas dokumen sumber

- Judul menggunakan kata `LAMPURAN`; kemungkinan yang dimaksud adalah `LAMPIRAN`.
- Nomor 16 menulis `DINAS DINAS PERTANIAN`.
- Nama Kecamatan Pasak Talawang perlu dikonfirmasi karena dokumen menulis `PASAKA TALAWANG`.
- Sebagian baris memakai jabatan penerima seperti `Kepala` atau `Sekretaris`, sementara beberapa baris langsung memakai nama instansi. Untuk master organisasi aplikasi, nama sebaiknya disimpan tanpa awalan jabatan.

## Tindakan yang disarankan

1. Tambahkan 12 perangkat daerah yang belum tersedia.
2. Buat 17 kecamatan sebagai organisasi terpisah dengan tipe `district` atau padanan yang disepakati.
3. Jadikan entri kelompok kecamatan sebagai induk jika masih diperlukan, bukan pengganti kecamatan individual.
4. Tetapkan Sekretariat Daerah sebagai organisasi induk untuk Bagian Perekonomian.
5. Konfirmasi kode resmi setiap organisasi sebelum data dimasukkan agar tidak memakai singkatan buatan.

## Status penerapan database lokal

Migrasi `014_official_organization_directory.sql` diterapkan pada 7 Oktober 2026. Hasil verifikasi setelah migrasi:

- 28 perangkat daerah tersedia dengan tipe `opd`;
- 17 kecamatan tersedia dengan tipe `district`;
- 45 entitas daftar resmi aktif dan dapat dipilih secara individual;
- seluruh kecamatan memiliki induk `Perwakilan Kecamatan Kabupaten Kapuas`;
- `Sekretariat Daerah - Bagian Perekonomian` memiliki induk `Sekretariat Daerah Kabupaten Kapuas`;
- tidak ada kode perangkat daerah wajib yang tertinggal;
- total tabel organisasi adalah 49 karena empat entitas teknis dan pilot tetap dipertahankan untuk menjaga relasi pengguna, indikator, dan struktur aplikasi.

Kartu ringkasan administrasi menghitung 45 OPD dan kecamatan, sedangkan halaman master organisasi tetap menampilkan seluruh 49 entitas.

## Tambahan organisasi dari Matrix RPJMD

Migration `030_complete_rpjmd_organization_mapping.sql` menambahkan Disbudparpora sebagai entitas OPD berdasarkan penyebutan langsung pada Matrix RPJMD, di luar 45 entitas pada lampiran sumber audit ini. Disbudparpora menjadi pemilik utama tiga indikator budaya dan pariwisata yang sebelumnya belum memiliki relasi organisasi. Dengan tambahan tersebut, seluruh 69 indikator baseline RPJMD memiliki OPD utama. Nama dan kode resminya tetap ditandai menunggu konfirmasi BAPPERIDA/OPD karena tidak tercantum pada lampiran 28 perangkat daerah yang dipakai dalam pemeriksaan awal.
