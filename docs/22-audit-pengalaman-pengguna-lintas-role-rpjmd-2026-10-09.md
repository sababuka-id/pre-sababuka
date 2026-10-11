# Audit Pengalaman Pengguna Lintas Role — Finalisasi RPJMD

Tanggal audit: 9 Oktober 2026

Lingkungan: aplikasi full-stack lokal, database demo/UAT

Sudut pandang: pegawai pemerintah, operator OPD, pemeriksa BAPPERIDA, Kominfo, pimpinan, dan pengelola teknis
Keputusan: **belum layak untuk UAT luas; layak untuk UAT terbimbing setelah temuan P0 ditutup**

## 1. Ringkasan eksekutif

Fungsi inti SABABUKA sudah tersedia, tetapi aplikasi masih lebih mudah dipahami oleh pembuat sistem daripada oleh pegawai dinas. Halaman banyak menampilkan status teknis, kode, dan struktur data, sementara pengguna membutuhkan jawaban sederhana:

1. Apa tugas saya hari ini?
2. Data atau indikator mana yang harus saya periksa?
3. Apa yang masih kurang?
4. Siapa yang menunggu pekerjaan saya?
5. Apa langkah berikutnya dan kapan tugas dianggap selesai?

Masalah terbesar bukan warna atau tampilan, melainkan ketidaksinkronan status dan tidak adanya orientasi tugas. Pada saat audit, database menunjukkan:

- 29 kategori RPJMD seluruhnya berstatus `draft`;
- 69 indikator RPJMD seluruhnya berstatus `draft`;
- 13 form capaian berstatus `approved`;
- 1 publikasi berstatus `active` dengan 6 item;
- 0 item publikasi aktif masih memenuhi syarat kategori/indikator saat ini.

Akibatnya, halaman Publikasi menyatakan ada publikasi aktif, tetapi Dashboard Pimpinan menyatakan tidak ada publikasi aktif. Form capaian yang tercatat berisi satu indikator dan sudah disetujui dapat dibuka menjadi dialog yang menyatakan “Belum ada indikator aktif”. Kontradiksi ini cukup untuk membuat pengguna meragukan seluruh status sistem.

## 2. Prinsip perbaikan

1. **Beranda adalah daftar pekerjaan**, bukan ringkasan database.
2. **Satu istilah hanya memiliki satu makna** dan selalu menyebut objeknya, misalnya “Kategori disetujui”, “Definisi indikator aktif”, atau “Capaian OPD disetujui”.
3. **Pengguna hanya melihat aksi yang menjadi tanggung jawabnya**, dengan alasan yang jelas ketika aksi belum tersedia.
4. **Data historis tidak boleh menghilang** hanya karena master indikator berubah status.
5. **Demo, draf RPJMD, data resmi, dan publikasi pimpinan harus terpisah secara visual dan logis.**
6. **Kode teknis menjadi informasi sekunder**, bukan bahasa utama antarmuka.

## 3. Temuan lintas sistem

| ID | Prioritas | Temuan dan dampak bagi pengguna | Rekomendasi |
|---|---|---|---|
| UX-01 | P0 | Status lintas modul bertentangan: 13 capaian disetujui dan 1 publikasi aktif, tetapi 0 indikator aktif dan dashboard menyatakan tidak ada publikasi aktif. Pengguna tidak tahu status mana yang benar. | Buat proses rekonsiliasi atomik setelah perubahan master. Publikasi yang itemnya tidak lagi eligible harus otomatis ditandai “Perlu rekonsiliasi”, bukan tetap “Aktif”. Semua kartu harus memakai aturan eligibility yang sama. |
| UX-02 | P0 | Form capaian historis menampilkan jumlah satu indikator, tetapi detailnya kosong karena query hanya mengambil indikator yang masih aktif. Bukti bahwa data pernah disetujui menjadi tidak terlihat. | Detail form harus membaca snapshot indikator dan observasi pada saat pengiriman. Status master terbaru ditampilkan sebagai catatan terpisah, tidak menghapus isi historis. |
| UX-03 | P0 | Seluruh baseline 29 kategori dan 69 indikator berada pada draf, tetapi BAPPERIDA tidak mempunyai aksi terhadap draf yang belum pernah diajukan. Kolom “Tindakan” hanya berisi tanda `-`. | Tetapkan Tim UPR/Developer sebagai penyusun resmi dan sediakan aksi bulk “Ajukan baseline RPJMD”. Beri alasan eksplisit: “Menunggu diajukan oleh Tim UPR”, bukan tanda `-`. |
| UX-04 | P0 | Tidak ada beranda “Tugas Saya”. Pengguna harus menebak menu mana yang berisi pekerjaan. | Jadikan landing setiap role sebagai antrean kerja: perlu dilengkapi, perlu diverifikasi, dikembalikan, menunggu pihak lain, dan selesai. Setiap kartu membuka daftar yang sudah terfilter. |
| UX-05 | P0 | Paket demo bercampur dengan 29 kategori dan 69 indikator RPJMD pada filter dan daftar utama. | Pisahkan ruang **Master RPJMD** dan **Simulasi**. Tambahkan banner lingkungan `DEMO/UAT` yang selalu terlihat dan filter “Sembunyikan data demo” sebagai default. |
| UX-06 | P1 | Kata “Draf”, “Disetujui”, dan “Aktif” dipakai untuk kategori, definisi indikator, form capaian, serta publikasi tanpa selalu menyebut objeknya. | Gunakan label lengkap: “Kategori: Draf”, “Indikator: Menunggu OPD”, “Capaian: Disetujui BAPPERIDA”, “Publikasi: Aktif”. Tambahkan stepper proses pada detail. |
| UX-07 | P1 | Pengguna tidak melihat alasan suatu aksi tersedia atau terkunci. Banyak sel tindakan hanya `-`. | Tampilkan `Aksi berikutnya`, `Penanggung jawab berikutnya`, dan `Alasan belum bisa diproses` pada setiap objek. Tombol terkunci boleh tampil jika penjelasannya berguna. |
| UX-08 | P1 | Tidak ada tenggat, PIC, atau SLA pada antrean kerja. | Tambahkan PIC substansi, operator, tanggal diterima, tenggat, umur antrean, dan penanda terlambat. |
| UX-09 | P1 | Istilah teknis seperti UUID, request ID, key publikasi, kode indikator panjang, `retrieval lokal`, `mapping`, dan event code mendominasi beberapa halaman. | Tampilkan bahasa manusia sebagai informasi utama. Kode teknis dipindah ke “Detail teknis” yang dapat diperluas atau disalin. |
| UX-10 | P1 | Tidak ada glosarium atau bantuan kontekstual untuk membedakan target, realisasi, indikator aktif, capaian disetujui, dan publikasi. | Tambahkan ikon bantuan dan glosarium singkat. Sediakan tur pertama kali berdasarkan role, maksimal 3–5 langkah. |
| UX-11 | P1 | Filter aktif tidak diringkas dan halaman kosong dapat disalahartikan sebagai tidak ada data. | Tampilkan chip filter, jumlah per status, dan tombol “Hapus filter”. Empty state harus menyebut filter yang aktif. |
| UX-12 | P1 | Notifikasi berdiri sendiri dan tidak menjadi pusat tugas; kondisi kosong hanya berkata pembaruan akan tampil. | Setiap notifikasi harus memiliki objek, alasan, batas waktu, dan tombol “Buka tugas”. Gabungkan notifikasi sejenis agar tidak membanjiri pengguna. |
| UX-13 | P1 | Tabel mobile masih memerlukan scroll horizontal. Status dan tindakan berada di luar layar tanpa petunjuk yang cukup. | Pada ponsel, ubah tabel operasional menjadi kartu dengan identitas, status, tenggat, dan aksi utama. Gunakan tabel scroll hanya untuk administrasi teknis. |
| UX-14 | P2 | Nama menu dan judul halaman tidak selalu sejalan: “Publikasi” menjadi “Kurasi dan Publikasi”, “Indikator” menjadi “Master Indikator”. | Gunakan nama yang sama di menu, breadcrumb, judul, dan dokumentasi. |
| UX-15 | P2 | Tidak ada akses cepat ke bantuan atau kontak pengelola saat pengguna tidak memahami alur. | Tambahkan menu “Bantuan” berisi SOP satu halaman, kontak admin, dan cara melaporkan masalah dengan ID objek otomatis. |

## 4. Temuan role Operator OPD

| ID | Prioritas | Temuan dan dampak | Rekomendasi |
|---|---|---|---|
| OPD-01 | P0 | Dashboard OPD menampilkan `Indikator aktif: 0` tetapi `Capaian disetujui: 3`. Operator tidak tahu apakah masih mempunyai indikator atau tidak. | Ganti metrik dengan “Indikator menjadi tanggung jawab OPD”, “Perlu verifikasi”, “Perlu diisi”, “Dikembalikan”, dan “Selesai”. Pisahkan status master dari status pelaporan. |
| OPD-02 | P0 | Dua form DKPP untuk Tahun 2026 dapat tampil sebagai baris yang hampir identik. Operator tidak tahu perbedaannya. | Terapkan satu form kerja per OPD–periode, atau tampilkan versi/batch, tanggal pengajuan, indikator yang dicakup, dan alasan revisi. Cegah duplikasi tidak disengaja. |
| OPD-03 | P0 | Form baru otomatis memilih Tahun 2029, bukan tahun berjalan 2026. Risiko salah periode sangat tinggi. | Pilih tahun berjalan secara default. Tahun masa depan memerlukan konfirmasi dan label “Target/perencanaan”, bukan “Realisasi”. |
| OPD-04 | P0 | Dialog pembuatan form hanya menampilkan kode `DKPP` dan periode; tidak memperlihatkan indikator apa yang akan diisi atau bahwa saat ini ada 0 indikator aktif. | Sebelum membuat draf, tampilkan nama lengkap OPD, jumlah serta daftar indikator, dan peringatan jika kosong. Nonaktifkan pembuatan form kosong. |
| OPD-05 | P1 | Halaman Indikator OPD menampilkan status “Draf”, tetapi tidak menjelaskan apakah operator harus menunggu, memeriksa, atau memperbaiki. | Tambahkan tab “Perlu verifikasi saya”, “Menunggu BAPPERIDA”, “Aktif untuk pelaporan”, dan “Arsip”. |
| OPD-06 | P1 | Operator hanya melihat indikator miliknya, tetapi kehilangan konteks fokus kebijakan dan alasan indikator ditugaskan kepada OPD. | Detail indikator harus memuat fokus RPJMD, kelompok isu, dasar penugasan, halaman sumber, OPD pendukung, dan catatan BAPPERIDA. |
| OPD-07 | P1 | Penyimpanan dilakukan per indikator melalui tombol “Simpan indikator”; tidak ada indikator keseluruhan apakah semua perubahan sudah tersimpan. | Gunakan autosave dengan status “Tersimpan pukul …”, atau “Simpan semua”. Tampilkan progres `3 dari 5 indikator lengkap`. |
| OPD-08 | P1 | Kolom “Catatan” terlalu umum. Operator tidak tahu apakah harus menulis metodologi, penjelasan perubahan, atau masalah kualitas. | Pisahkan menjadi `Catatan realisasi`, `Metode/sumber`, dan `Penjelasan deviasi`. Beri contoh singkat. |
| OPD-09 | P1 | Bukti dukung disebut “privat” dan hanya menjelaskan format/ukuran. Tidak jelas kapan wajib, jenis dokumen yang diterima, dan siapa yang dapat melihat. | Gunakan istilah “Dokumen pendukung internal”. Nyatakan wajib/tidak, contoh dokumen, klasifikasi akses, dan pemeriksa yang dapat membuka. |
| OPD-10 | P1 | Tidak ada validasi visual terhadap target, satuan, rentang, perubahan ekstrem, atau duplikasi sebelum dikirim. | Tampilkan target, nilai tahun sebelumnya, satuan permanen, warning rentang/deviasi, dan checklist validasi sebelum submit. |
| OPD-11 | P1 | Form yang dikembalikan hanya mengandalkan satu catatan umum; koreksi tidak diarahkan ke indikator tertentu. | Reviewer harus dapat memberi catatan per indikator dan menandai field yang salah. Operator melihat daftar koreksi yang dapat dicentang selesai. |
| OPD-12 | P1 | Daftar form tidak menampilkan nama indikator sehingga beberapa form pada OPD/periode yang sama sulit dibedakan. | Tampilkan cakupan indikator atau kategori dan nomor revisi pada baris/kartu. |
| OPD-13 | P2 | “Buat form capaian” terdengar seperti membuat formulir baru, bukan melaporkan data. | Ganti menjadi “Isi realisasi periode” atau “Mulai pelaporan”. |
| OPD-14 | P2 | Tidak ada halaman ringkas “Riwayat pelaporan saya” yang membedakan pekerjaan berjalan dan arsip. | Pisahkan `Pekerjaan aktif` dari `Riwayat selesai`. Default hanya menampilkan yang masih membutuhkan perhatian. |
| OPD-15 | P2 | Pada mobile, kolom periode, terisi, status, dan aksi tersembunyi dalam tabel geser. | Gunakan kartu: Tahun, status, progres indikator, pembaruan terakhir, dan tombol “Lanjutkan/Buka”. |

## 5. Temuan role BAPPERIDA

| ID | Prioritas | Temuan dan dampak | Rekomendasi |
|---|---|---|---|
| BAP-01 | P0 | Semua kategori RPJMD draf tidak memiliki tindakan bagi BAPPERIDA, padahal notice mengatakan BAPPERIDA dapat memperbaiki, menyetujui, atau menolak. | Sinkronkan teks dengan permission. Sediakan tahap `Disusun Tim UPR → Diajukan → Diputuskan BAPPERIDA`, lengkap dengan tombol bulk. |
| BAP-02 | P0 | Pemeriksaan Capaian default memfilter “Capaian dikirim” dan menampilkan “Belum ada data”, walaupun ada 13 capaian disetujui. | Gunakan tab dengan badge jumlah: Baru, Sedang diperiksa, Dikembalikan, Disetujui. Empty state harus berkata “Tidak ada capaian berstatus Dikirim”. |
| BAP-03 | P0 | Memproses 29 kategori dan 69 indikator hanya bisa satu per satu melalui daftar panjang. | Tambahkan bulk review per fokus/OPD, checklist kesiapan, aksi “Ajukan semua yang lengkap”, dan ringkasan pengecualian. Keputusan final tetap tercatat per objek. |
| BAP-04 | P1 | Filter kategori indikator berupa daftar datar lebih dari 30 opsi tanpa pengelompokan fokus atau pencarian. | Buat filter bertingkat Fokus → Kelompok isu → OPD, plus pencarian dan chip filter aktif. |
| BAP-05 | P1 | Daftar indikator hanya menunjukkan “5 tahun”, bukan kelengkapan target 2025–2029 atau target yang kosong/aneh. | Tampilkan `5/5 target`, warning nilai kosong, pola tidak wajar, sumber belum pasti, dan definisi belum lengkap. |
| BAP-06 | P1 | Tidak ada matriks kesiapan 69 indikator yang memperlihatkan definisi, rumus, satuan, OPD, sumber, target, dan status verifikasi. | Tambahkan halaman “Kesiapan RPJMD” dengan kolom kelengkapan dan ekspor daftar tindak lanjut per OPD. |
| BAP-07 | P1 | Aksi pengembalian capaian memakai prompt browser sederhana dan satu catatan umum. | Gunakan dialog terstruktur: alasan, indikator/field terdampak, batas waktu, dan dokumen yang perlu diganti. |
| BAP-08 | P1 | Publikasi memakai istilah “kunci”, “versi”, dan “item” tanpa menjelaskan dampak ke dashboard. | Gunakan “Paket tayang”, “Revisi”, dan “Jumlah capaian”. Sediakan preview persis seperti yang akan dilihat pimpinan. |
| BAP-09 | P1 | Detail publikasi menampilkan kode indikator, bukan nama, OPD, sumber, atau status validasinya. | Tampilkan nama indikator, nilai, periode, OPD, sumber, tanggal data, dan link bukti sebelum aktivasi. |
| BAP-10 | P1 | Tidak ada penjelasan mengapa capaian tertentu tidak masuk kandidat publikasi. | Tampilkan daftar “Belum layak tayang” beserta alasan: kategori belum disetujui, indikator belum aktif, capaian belum disetujui, atau sumber belum lengkap. |
| BAP-11 | P1 | Menu BAPPERIDA memuat Dashboard Pimpinan, kategori, indikator, sumber data, dashboard operasional, realisasi, pemeriksaan, publikasi, dan audit sekaligus. | Ringkas menjadi: **Beranda Tugas**, **Master RPJMD**, **Verifikasi OPD**, **Pelaporan Capaian**, **Publikasi**, **Riwayat**. Sumber data dan audit menjadi detail sekunder. |
| BAP-12 | P2 | Halaman Sumber Data berstatus baca saja tetapi menjelaskan mapping disetujui BAPPERIDA tanpa menyediakan antrean persetujuan. | Jika BAPPERIDA perlu menyetujui mapping, sediakan task approval. Jika tidak, hilangkan halaman dari menu utama BAPPERIDA. |
| BAP-13 | P2 | Audit Aktivitas berisi event code Inggris, UUID, tipe entitas, dan request ID; aktivitas login menutupi keputusan substansi. | Default audit BAPPERIDA hanya menampilkan perubahan kategori, indikator, capaian, dan publikasi dalam kalimat manusia. Log teknis berada pada mode lanjutan. |

## 6. Temuan role Pimpinan

| ID | Prioritas | Temuan dan dampak | Rekomendasi |
|---|---|---|---|
| PIM-01 | P0 | Pimpinan melihat publikasi aktif pada menu Publikasi, tetapi dashboard menyatakan tidak ada publikasi aktif. | Tutup UX-01 sebelum akun pimpinan dipakai. Satu sumber eligibility harus dipakai dashboard dan daftar publikasi. |
| PIM-02 | P1 | Dashboard menampilkan metrik proses internal seperti “Capaian disetujui 13”, bukan informasi kebijakan. | Pimpinan sebaiknya melihat indikator on-track/off-track, perubahan terbaru, fokus prioritas, sumber, dan tanggal pembaruan. Metrik workflow dipindah ke BAPPERIDA. |
| PIM-03 | P1 | Tidak ada filter fokus, tahun, OPD, wilayah, status target, atau tren. | Tambahkan filter sederhana dan default “Kondisi terbaru”. Jangan menampilkan kontrol administrasi. |
| PIM-04 | P1 | Asisten Data mengundang pertanyaan walaupun tidak ada data eligible dan memakai istilah “Retrieval lokal”. | Tampilkan jumlah/topik data yang tersedia, pertanyaan contoh yang dapat diklik, serta empty state yang mengarahkan ke data tersedia. Ganti istilah teknis dengan “Hanya membaca data yang sudah disahkan”. |
| PIM-05 | P1 | Menu Publikasi memakai judul “Kurasi dan Publikasi” serta kalimat instruksi memilih capaian, walaupun Pimpinan hanya dapat membaca. | Untuk Pimpinan, ganti menjadi “Rilis Data” dan tampilkan hanya rilis aktif serta arsip resmi. |
| PIM-06 | P2 | Detail publikasi menampilkan kode indikator dan nomor teknis, tidak memberi konteks sumber atau arti nilai. | Sajikan nama, nilai, target, status capaian, sumber, OPD, dan catatan ringkas. Nomor publikasi berada pada bagian metadata. |

## 7. Temuan role Kominfo

| ID | Prioritas | Temuan dan dampak | Rekomendasi |
|---|---|---|---|
| KOM-01 | P0 | Kominfo masuk ke Dashboard Pimpinan, bukan dashboard kesehatan layanan. Halaman tersebut kosong akibat eligibility RPJMD. | Landing Kominfo harus “Kesehatan Layanan dan Integrasi”. |
| KOM-02 | P1 | Halaman Sumber Data hanya menunjukkan URL, “Menunggu API key”, dan “Terhubung”; tidak ada waktu cek, latensi, sinkronisasi terakhir, jumlah data, error, atau SLA. | Tambahkan status operasional: health check, last success/failure, durasi, baris masuk/ditolak, checksum, jadwal berikutnya, dan owner insiden. |
| KOM-03 | P1 | Satu Data berlabel “Terhubung” walaupun belum ada mapping. Pengguna dapat mengira integrasi data sudah berjalan. | Bedakan `Endpoint dapat diakses`, `Mapping tersedia`, `Sinkronisasi aktif`, dan `Data terakhir berhasil masuk`. |
| KOM-04 | P1 | Empty state berkata “Buat mapping” meskipun role Kominfo baca saja. | Gunakan “Belum ada mapping; menunggu Developer/BAPPERIDA” dan tampilkan siapa penanggung jawabnya. |
| KOM-05 | P1 | Tidak ada daftar insiden, peringatan kegagalan, atau tombol eskalasi. | Buat antrean gangguan dengan severity, waktu mulai, dampak, penanggung jawab, dan status penyelesaian. |
| KOM-06 | P2 | Audit Kominfo masih bercampur login pengguna dan keputusan substansi. | Default ke audit teknis konektor, autentikasi gagal, perubahan konfigurasi, dan kejadian layanan; sediakan filter manusia. |

## 8. Temuan role Developer/Superadmin

| ID | Prioritas | Temuan dan dampak | Rekomendasi |
|---|---|---|---|
| ADM-01 | P1 | Sidebar memuat hampir seluruh aplikasi sekaligus. Risiko salah konteks antara administrasi teknis dan tata kelola substansi tinggi. | Pisahkan mode **Administrasi Sistem** dan **Operasional Data**, atau sediakan switch ruang kerja. |
| ADM-02 | P1 | Label role berganti antara “Developer”, “Superadmin”, dan “Pengelola teknis”. | Pilih satu label pengguna, misalnya “Pengelola Sistem”; `superadmin` hanya menjadi kode teknis. |
| ADM-03 | P1 | Kartu beranda menyebut 46 OPD/kecamatan, sedangkan tabel organisasi memuat 50 entitas. | Pecah angka: 29 OPD terkait RPJMD, 17 kecamatan, dan 4 entitas teknis/induk/pilot. Jelaskan dasar hitung. |
| ADM-04 | P1 | Daftar pengguna berisi akun ganda `.local` dan `.com`; status MFA mayoritas “Opsional”. | Tandai akun demo/legacy, arsipkan duplikat sebelum UAT, dan wajibkan MFA untuk role kritis. |
| ADM-05 | P1 | Halaman Hak Akses menampilkan 49 checkbox, group label Inggris, kode permission, dan level risiko tanpa ringkasan dampak. | Sediakan template role yang dikunci, diff sebelum simpan, pencarian, mode lanjutan, dan tombol pulihkan standar. |
| ADM-06 | P1 | Perubahan permission kritis dapat dilakukan dari daftar panjang; kesalahan satu checkbox sulit terlihat. | Minta alasan, tampilkan dampak menu/aksi, lakukan konfirmasi perubahan kritis, dan cegah lockout. |
| ADM-07 | P1 | Konfigurasi sistem menerima kunci dan JSON mentah. Ini terlalu teknis dan rawan salah format. | Buat form bertipe untuk parameter yang didukung. Mode key/value hanya untuk pengelola ahli dan tervalidasi schema. |
| ADM-08 | P1 | Tidak ada panel integritas yang memperingatkan kontradiksi seperti publikasi aktif dengan 0 item eligible. | Tambahkan Health/Integrity Center: orphan, status tidak konsisten, indikator tanpa owner, publikasi invalid, duplikasi form, dan migration status. |
| ADM-09 | P2 | Klaim “Domain development aktif” berada pada kartu statis dan dapat basi. | Ambil status domain, TLS, API, DB, dan versi rilis dari health check nyata lengkap dengan waktu pemeriksaan. |
| ADM-10 | P2 | Mode simulasi berada dalam menu profil dan langsung mengeluarkan pengguna, tetapi mekanismenya tidak menjelaskan bahwa login ulang tetap diperlukan. | Jadikan “Pratinjau sebagai role” yang jelas untuk lingkungan demo, dengan banner role yang sedang dipratinjau dan tombol kembali ke Developer. |

## 9. Struktur navigasi yang direkomendasikan

### Operator OPD

1. **Beranda / Tugas Saya**
2. **Indikator OPD Saya**
3. **Isi Realisasi**
4. **Riwayat Pelaporan**
5. **Notifikasi dan Bantuan**

### BAPPERIDA

1. **Beranda / Antrean Keputusan**
2. **Master RPJMD** — fokus, kategori, indikator dalam satu ruang
3. **Verifikasi OPD**
4. **Capaian OPD**
5. **Paket Tayang Pimpinan**
6. **Riwayat Keputusan**

### Pimpinan

1. **Ringkasan Pembangunan**
2. **Tanya Data**
3. **Rilis Data Resmi**

### Kominfo

1. **Kesehatan Layanan**
2. **Integrasi Sumber Data**
3. **Insiden dan Audit Teknis**

### Pengelola Sistem

1. **Kesehatan dan Integritas Sistem**
2. **Organisasi dan Pengguna**
3. **Akses dan Keamanan**
4. **Integrasi**
5. **Konfigurasi Lanjutan**

## 10. Urutan implementasi yang disarankan

### Gelombang 0 — pemulihan konsistensi data

1. Rekonsiliasi status kategori, indikator, form capaian, dan publikasi.
2. Pastikan form historis tetap menampilkan snapshot observasi.
3. Batalkan atau tandai publikasi yang itemnya tidak lagi eligible.
4. Cegah duplikasi form OPD–periode atau definisikan revisinya secara eksplisit.

### Gelombang 1 — sebelum UAT OPD

1. Buat Beranda Tugas Saya per role.
2. Buat alur bulk pengajuan baseline RPJMD.
3. Sederhanakan form OPD dan pilih tahun berjalan.
4. Pisahkan data demo dari baseline RPJMD.
5. Terapkan istilah status lengkap dan stepper proses.
6. Ubah daftar mobile operasional menjadi kartu.

### Gelombang 2 — sebelum UAT lintas instansi

1. Matriks kesiapan 69 indikator.
2. Catatan koreksi per indikator/field.
3. Preview paket tayang pimpinan.
4. Dashboard kesehatan Kominfo.
5. Audit manusia dan Integrity Center.

### Gelombang 3 — penyempurnaan

1. Onboarding berbasis role dan glosarium.
2. SLA, PIC, tenggat, dan eskalasi.
3. Penyederhanaan administrasi role/menu/setting.
4. Pengujian usability dengan 3–5 pegawai yang belum pernah melihat SABABUKA.

## 11. Kriteria siap UAT

SABABUKA layak dibawa ke UAT OPD tanpa pendampingan terus-menerus ketika:

- tidak ada kontradiksi hitungan/status antarhalaman;
- pengguna dapat menyebut tugas berikutnya dalam waktu kurang dari 30 detik setelah login;
- operator dapat menyelesaikan satu pelaporan tanpa penjelasan lisan dari pengembang;
- BAPPERIDA dapat memproses baseline per fokus/OPD tanpa membuka 69 item satu per satu;
- seluruh empty state menjelaskan konteks filter dan penanggung jawab berikutnya;
- form tidak dapat dibuat untuk periode/OPD yang salah tanpa peringatan;
- status demo, draf, resmi, dan tayang dapat dibedakan hanya dengan membaca labelnya;
- status dan aksi utama tetap terlihat pada ponsel;
- seluruh perubahan keputusan mempunyai catatan dan dapat ditelusuri dalam bahasa manusia.
