# Audit UI/UX lintas peran SABABUKA

Tanggal audit: 10 Oktober 2026
Lingkup: seluruh menu aktif untuk Pengelola Sistem, BAPPERIDA, Operator OPD, Walidata Diskominfosantik, dan Pimpinan.

## Kesimpulan

Alur utama sudah dibuat konsisten dengan pola Kurasi dan Publikasi: halaman dimulai dari konteks pekerjaan, menyediakan filter dan urutan data, menampilkan status dengan bahasa tugas, lalu menyediakan keputusan yang sesuai kewenangan. Pengguna tidak perlu memahami kode workflow untuk mengetahui tindakan berikutnya.

Pemisahan kewenangan tetap dijaga:

1. Penyusun menyiapkan master RPJMD.
2. BAPPERIDA memeriksa substansi.
3. PIC OPD penanggung jawab memverifikasi definisi indikator.
4. BAPPERIDA mengaktifkan indikator, memeriksa capaian, dan melakukan kurasi publikasi.
5. Walidata Diskominfosantik mengelola mapping, sinkronisasi, interoperabilitas, dan kualitas teknis sumber data; bukan memutus substansi capaian.
6. Pimpinan hanya membaca data yang telah dipublikasikan dan memakai Asisten Data berbasis rilis aktif.

## Hasil audit per peran

| Peran | Menu dan tugas utama | Hasil audit |
|---|---|---|
| Pengelola Sistem | Beranda administrasi, organisasi, pengguna, peran, menu, konfigurasi, keamanan | Alur registrasi mandiri, pemeriksaan PIC, penetapan OPD/peran, aktivasi/nonaktif/hapus akun tersedia. Konfirmasi tindakan berisiko memakai modal dengan penjelasan dampak. Istilah teknis tetap tersedia pada area administrasi yang memang membutuhkannya. |
| BAPPERIDA | Tugas Saya, Kelompok Isu RPJMD, Matriks Indikator, Realisasi, Pemeriksaan, Kurasi dan Publikasi, audit | Antrean kerja diarahkan lewat kartu tugas. Master RPJMD dapat difilter secara hierarkis. Pemeriksaan dan publikasi mengikuti tahapan yang jelas dan menjaga pemisahan petugas. |
| Operator OPD | Tugas Saya, Matriks Indikator sesuai tanggung jawab, Realisasi Indikator | Ringkasan sudah memakai istilah dan angka yang relevan untuk OPD. Pembuatan pelaporan memakai periode berjalan, mencegah duplikasi, menjelaskan dokumen internal, dan membedakan status draf, dikembalikan, menunggu, dan selesai. |
| Walidata Diskominfosantik | Ruang Walidata dan Audit | Posisi Walidata dinyatakan eksplisit. Walidata mengelola mapping, pemeriksaan preview, sinkronisasi, dan impor. Kredensial rahasia tetap hanya dipegang Pengelola Sistem. BAPPERIDA hanya memantau status teknis. |
| Pimpinan | Beranda/Ringkasan, Rilis Data, Asisten Data | Hanya data publikasi aktif yang tampil. Dashboard memiliki pencarian serta filter kelompok isu dan OPD. Asisten memakai bahasa nonteknis, contoh pertanyaan, status kecukupan data, dan sumber jawaban. |

## Temuan dan perbaikan yang diterapkan

| Area | Temuan | Perbaikan |
|---|---|---|
| Navigasi | Nama menu dan judul halaman tidak seragam; istilah `Superadmin` terlalu teknis | Menyeragamkan Kelompok Isu RPJMD, Matriks Indikator, Kurasi dan Publikasi, serta label Pengelola Sistem. Pimpinan tetap melihat istilah Rilis Data. |
| Responsif | Matriks indikator membuat halaman melebar dan kontrol tampak tidak rapi | Membatasi lebar area kerja/panel, membuat filter membungkus, dan mempertahankan scroll hanya di dalam tabel. Audit viewport desktop 1280 px dan ponsel 390 px tidak menemukan overflow halaman atau kontrol area kerja yang terpotong. |
| Tabel | Pengguna sulit memahami urutan data | Tabel daftar utama memiliki kepala kolom yang dapat diurutkan; data transaksional default terbaru; matriks RPJMD default mengikuti urutan dokumen. Ringkasan urutan tampil di pagination. |
| Tombol | Nama tindakan berbeda antara daftar dan formulir | Mengubah `Buat form capaian` menjadi `Mulai pelaporan`, menyeragamkan tombol utama/sekunder/bahaya, dan mempertahankan satu aksi utama per konteks. |
| Realisasi OPD | Istilah bukti privat kurang jelas | Mengganti menjadi Dokumen pendukung internal, memberi contoh dokumen, format, batas ukuran, dan siapa yang dapat melihat. |
| Ringkasan OPD | Metrik memakai sudut pandang lintas instansi | Mengganti metrik OPD menjadi indikator tanggung jawab, draf, menunggu pemeriksaan, perlu diperbaiki, dan pelaporan selesai. |
| Dashboard pimpinan | Daftar capaian tidak dapat disaring | Menambahkan pencarian indikator/periode, filter kelompok isu, filter OPD, hapus filter, dan jumlah hasil. |
| Asisten Data | Memakai istilah teknis `retrieval lokal` dan hanya satu contoh | Mengganti dengan penjelasan sumber resmi serta menyediakan beberapa pertanyaan awal yang dapat dipilih. |
| Audit | Kode event, UUID, dan Request ID tampil sebagai informasi utama | Mengubah kode menjadi kalimat aktivitas, mengganti entitas menjadi istilah pemerintahan, serta memindahkan ID teknis ke opsi `Tampilkan detail teknis`. |
| Notifikasi | Empty state tidak menjelaskan kondisi atau langkah pengguna | Membedakan kondisi belum ada pemberitahuan dan semua sudah dibaca, serta menjelaskan jenis pembaruan yang akan muncul. |
| Kelola akun | Aktivasi, nonaktif, dan hapus memakai pop-up browser | Mengganti dengan modal yang menjelaskan dampak dan memberikan jalur batal yang jelas. |
| Kurasi dan Publikasi | Alur belum cukup membimbing pengguna | Menjadi tiga tahap: informasi rilis, pemilihan capaian layak, lalu pemeriksaan dan aktivasi. Ditambahkan filter kandidat, bulk selection, hapus item, ubah draf, versi pengganti, penarikan rilis, preview pimpinan, dan peringatan perubahan belum disimpan. |
| Form capaian OPD | Penyimpanan per indikator tidak memberi gambaran progres | Menambahkan progres indikator terisi, Simpan semua perubahan, waktu simpan terakhir, label satuan, catatan realisasi yang terarah, dan peringatan deviasi lebih dari 50% terhadap target. |
| Pengembalian BAPPERIDA | Catatan koreksi masih bersifat umum | Pemeriksa wajib memilih indikator terdampak sebelum mengembalikan dan catatan tersimpan bersama daftar indikator yang harus diperbaiki. |
| Mobile pelaporan | Tabel memaksa operator menggeser layar | Daftar pelaporan dan pemeriksaan berubah menjadi kartu pada ponsel dengan periode, progres, status, pembaruan, dan aksi utama. |
| Bantuan pengguna | Tidak ada glosarium atau panduan berdasarkan tanggung jawab | Menambahkan tombol bantuan global dengan panduan tiga langkah berbeda untuk Pengelola Sistem, BAPPERIDA, OPD, Walidata, dan Pimpinan serta glosarium target/realisasi/publikasi. |
| Hak akses | Daftar permission terlalu teknis dan perubahan kritis sulit ditinjau | Menambahkan pencarian, mode detail teknis opsional, label kelompok/risk berbahasa Indonesia, ringkasan hak ditambah/dicabut, pembatalan perubahan, konfirmasi, dan alasan wajib yang tersimpan dalam audit. |
| Beranda administrasi | Angka dan status fondasi berpotensi statis/basi | Menghitung OPD, kecamatan, dan hak akses dari API serta mengganti klaim domain statis dengan status layanan berdasarkan respons aplikasi saat ini. |
| Navigasi pelaporan | Dashboard, realisasi, dan pemeriksaan tampak seperti tiga menu dengan fungsi serupa | Mengubahnya menjadi Beranda Tugas, Pelaporan Realisasi, dan Verifikasi Pelaporan OPD. BAPPERIDA tidak lagi melihat menu pengisian OPD; URL lama otomatis diarahkan ke antrean verifikasi. |

## Keseragaman visual

- Tombol utama: tindakan yang melanjutkan atau menyimpan pekerjaan.
- Tombol sekunder: melihat, menyaring, membatalkan, atau tindakan pendukung.
- Tombol bahaya: menghapus, menarik, atau menonaktifkan; selalu disertai dampak tindakan.
- Badge: status proses, bukan tombol.
- Tabel: daftar kerja berdensitas tinggi, dapat diurutkan pada kolom bermakna, serta memiliki empty state dan ringkasan jumlah.
- Kartu: ringkasan, tugas prioritas, dan tampilan mobile; bukan pengganti tabel untuk pekerjaan bulk.
- Bahasa: memakai istilah tugas pemerintahan; kode dan ID teknis disembunyikan kecuali dibutuhkan Pengelola Sistem.

## Catatan kesiapan operasional

- Tidak ada peran `verifikator` terpisah. Verifikasi indikator dilaksanakan oleh PIC OPD pada scope organisasinya. Sistem mencegah petugas BAPPERIDA yang memeriksa menjadi verifikator OPD pada indikator yang sama.
- Walidata Diskominfosantik memiliki kewenangan teknis konektor, tetapi tidak mengambil alih persetujuan substansi BAPPERIDA atau pengesahan data OPD.
- Data terbaru menjadi default pada daftar transaksi. Matriks indikator sengaja memakai urutan RPJMD agar proses finalisasi dapat dibandingkan dengan dokumen sumber.
- Tujuh pengujian integrasi yang memerlukan database aktif tetap berstatus skip pada lingkungan lokal; pengujian unit dan route yang dapat berjalan lokal lulus.

## Verifikasi

- TypeScript frontend: lulus.
- Pengujian backend: 13 lulus, 0 gagal, 7 dilewati karena memerlukan layanan/database integrasi.
- Audit visual BAPPERIDA: Operations, Kelompok Isu, Matriks Indikator, Realisasi, Pemeriksaan, Kurasi dan Publikasi, Ruang Walidata, Audit, Dashboard, dan Notifikasi.
- Audit responsif: desktop 1280×800 dan ponsel 390×844; tidak ada overflow horizontal halaman pada menu yang diuji.
