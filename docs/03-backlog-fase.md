# Roadmap Pengembangan SABABUKA

Status: rancangan kerja utama untuk dibahas bersama Bupati, BAPPERIDA, Diskominfosantik, BPS, dan OPD.

## 1. Arah pengembangan

SABABUKA dikembangkan sebagai lapisan integrasi, kurasi, analisis, dan dukungan keputusan. SABABUKA tidak menggantikan Satu Data Kapuas, BPS, SIPD, aplikasi sektoral, atau website OPD serta tidak meminta OPD menginput ulang data yang sudah tersedia pada sistem resmi.

Alur utamanya adalah:

```mermaid
flowchart LR
    A[Fokus kebijakan] --> B[Kategori strategis]
    B --> C[Kamus indikator dan target]
    C --> D[Kontrak sumber data]
    D --> E[Akuisisi dan normalisasi]
    E --> F[Konfirmasi substansi OPD]
    F --> G[Kurasi dan rekonsiliasi BAPPERIDA]
    G --> H[Analisis tren dan wilayah]
    H --> I[Dashboard dan Asisten Data Bupati]
```

Prinsip utamanya:

1. Kebutuhan keputusan menentukan indikator, bukan ketersediaan data semata.
2. Setiap indikator memiliki sumber primer yang ditetapkan sebelum integrasi.
3. Satu Data menjadi kanal utama apabila dataset dari sumber primer tersedia di sana.
4. OPD tetap menjadi produsen dan penanggung jawab substansi data sektoral.
5. BAPPERIDA mengoordinasikan kebutuhan kebijakan, rekonsiliasi, dan kelayakan penyajian kepada pimpinan.
6. Diskominfosantik mengelola wali data, integrasi teknis, keamanan, interoperabilitas, dan operasional platform.
7. BPS menjadi pembina dan rujukan statistik resmi sesuai kewenangannya.
8. AI hanya menggunakan data yang tersedia sesuai hak akses dan tidak menyatakan dugaan sebagai sebab atau keputusan resmi.

## 2. Pembagian ruang kerja

| Pengguna | Ruang kerja | Fungsi utama |
|---|---|---|
| Bupati/pimpinan | Ringkasan Pimpinan | Membaca fokus, indikator, tren, peta, peringatan, insight, pilihan tindak lanjut, dan jejak sumber ringkas |
| BAPPERIDA | Ruang Kurasi dan Keputusan Data | Mengelola fokus kebijakan, kamus indikator, antrean kelayakan tayang, perbandingan sumber, rekonsiliasi, analisis lintas sektor, dan pratinjau ringkasan |
| Diskominfosantik | Ruang Integrasi dan Wali Data | Mengelola konektor, jadwal sinkronisasi, metadata, kegagalan sumber, pengguna, hak akses, keamanan, dan audit teknis |
| OPD | Kotak Konfirmasi Data | Memeriksa indikator kewenangannya, mengonfirmasi substansi, memberi koreksi/catatan, dan melihat riwayat; bukan dashboard input ulang |
| BPS | Rujukan statistik | Menjadi sumber statistik resmi dan pembina data statistik sesuai kewenangan |

## 3. Kebijakan pemilihan sumber

Prioritas tidak ditetapkan secara kaku sebagai Satu Data lalu BPS lalu OPD. Setiap indikator harus memiliki kontrak sumber yang menetapkan sumber primer, sumber pembanding, kanal akses, dan batas pemakaiannya.

Urutan teknis yang digunakan adalah:

1. Tetapkan sumber primer sesuai kewenangan dan definisi indikator.
2. Ambil melalui Satu Data Kapuas apabila dataset sumber primer tersedia dan dapat diproses.
3. Jika belum tersedia di Satu Data, gunakan API atau sistem resmi produsen data.
4. Jika API belum tersedia, gunakan CSV/XLSX atau layanan geospasial resmi yang dipertukarkan terjadwal.
5. Gunakan halaman website hanya untuk konteks atau berkas resmi yang jelas; halaman berita bukan sumber utama angka.
6. Scraping hanya boleh menjadi jalur terbatas jika tidak tersedia API/berkas resmi, akses diizinkan, struktur stabil, serta kualitasnya dipantau.
7. Input manual menjadi jalur sementara terakhir dan harus memiliki bukti sumber, versi, PIC, serta rencana migrasi ke kanal resmi.

Contoh kontrak sumber:

| Indikator | Sumber primer | Kanal yang diutamakan | Sumber pembanding |
|---|---|---|---|
| Kemiskinan | BPS/Susenas | WebAPI/tabel resmi BPS | Data program Dinas Sosial, tidak diperlakukan sebagai ukuran kemiskinan BPS |
| Pertumbuhan ekonomi dan IPM | BPS | WebAPI/publikasi resmi | Dokumen perencanaan untuk target |
| Jalan kondisi mantap | DPUPRPKP | Satu Data atau pertukaran data OPD | Data geospasial dan dokumen perencanaan |
| Stunting | Sumber survei resmi yang disepakati | API/berkas resmi dan berita acara | Data operasional Dinas Kesehatan untuk intervensi |
| Produksi padi | BPS dan Dinas Pertanian sesuai kesepakatan | Satu Data/API/berkas resmi | Luas panen, produktivitas, dan data sentra produksi |
| Penyerapan anggaran | BPKAD/sistem keuangan resmi | API atau database view terotorisasi | Capaian keluaran dari OPD |
| Layanan adminduk | Sistem layanan Disdukcapil | API/agregat terjadwal | Data pengaduan dan kepuasan |

## 4. Status perjalanan data

Setiap nilai melewati status berikut dan seluruh perubahannya dicatat:

1. **Ditemukan** — dataset atau rilis sumber teridentifikasi.
2. **Terambil** — data berhasil diambil dan salinan mentah tercatat.
3. **Ternormalisasi** — indikator, satuan, periode, wilayah, serta versi sudah dipetakan.
4. **Lulus pemeriksaan teknis** — tipe, rentang, kelengkapan, duplikasi, dan konsistensi dasar diperiksa.
5. **Menunggu konfirmasi OPD** — produsen data perlu memastikan substansi apabila sumbernya sektoral.
6. **Dikonfirmasi OPD** — nilai dan konteksnya sesuai dengan sumber sektoral.
7. **Dalam rekonsiliasi** — terdapat perbedaan definisi, periode, cakupan, metode, atau nilai antar-sumber.
8. **Layak tayang** — BAPPERIDA menetapkan nilai layak untuk konteks Ringkasan Pimpinan.
9. **Perlu perbaikan** — data dikembalikan dengan alasan yang tercatat.
10. **Dibatasi** — data tersedia tetapi hanya boleh dilihat oleh pengguna tertentu.
11. **Kedaluwarsa** — data melewati batas waktu pembaruan dan tidak boleh ditampilkan tanpa penanda.

Jika data sudah melalui mekanisme Satu Data, SABABUKA menggunakan metadata dan status yang tersedia. OPD tidak diminta mengulangi unggahan. BAPPERIDA hanya memeriksa kelayakannya untuk konteks perencanaan dan paparan pimpinan.

## 5. Penanganan perbedaan data

SABABUKA tidak merata-ratakan atau menimpa nilai yang berbeda. Setiap observasi disimpan beserta sumber, definisi, periode, wilayah, metode, versi, waktu pengambilan, dan statusnya.

Kasus rekonsiliasi minimal menjawab:

- apakah indikator dan definisinya sama;
- apakah periode referensinya sama;
- apakah cakupan wilayah dan populasinya sama;
- apakah status datanya sementara, final, atau direvisi;
- apakah metode pengumpulan dan penghitungannya sama;
- sumber mana yang berwenang untuk konteks penggunaan tersebut;
- siapa yang mengonfirmasi dan kapan keputusan dibuat.

Hasil rekonsiliasi disebut **nilai rujukan yang disepakati untuk konteks paparan pimpinan**, bukan satu kebenaran baru yang menghapus sumber lain.

## 6. Persyaratan data tingkat wilayah

Setiap indikator mencatat tingkat wilayah terendah yang sah. Sistem tidak boleh membentuk nilai kecamatan dari angka kabupaten tanpa metode resmi.

Data wilayah minimal memiliki:

- kode referensi wilayah;
- nama wilayah;
- tingkat administrasi;
- periode referensi;
- nilai dan satuan;
- sumber dan versi;
- status validasi;
- geometri atau kode penghubung ke peta;
- tingkat ketelitian dan batas penggunaan.

Indikator berbasis sampel, termasuk sebagian keluaran Susenas, hanya ditampilkan sampai tingkat estimasi yang dapat dipertanggungjawabkan. Pemetaan kecamatan mengutamakan data administrasi OPD, sensus, data fasilitas, data ruas, atau publikasi yang memang menyediakan rincian kecamatan.

## 7. Peran analitik dan AI

Analitik dan AI dibangun setelah kamus indikator, sumber, serta workflow verifikasi stabil.

### Tingkat 1 — deskriptif

- menjelaskan nilai, target, tren, dan perubahan;
- menunjukkan wilayah tertinggal atau berbeda dari pola kabupaten;
- menyebut periode, sumber, dan status validasi.

### Tingkat 2 — diagnostik terbatas

- menunjukkan faktor yang berjalan bersamaan berdasarkan data yang tersedia;
- membedakan korelasi, indikasi, dan bukti sebab-akibat;
- meminta data tambahan jika penjelasan belum cukup.

### Tingkat 3 — dukungan keputusan

- menyusun pilihan wilayah prioritas;
- menyebut OPD yang perlu dilibatkan;
- mengidentifikasi data tambahan dan risiko keputusan;
- menawarkan pilihan tindak lanjut, bukan menetapkan keputusan.

Setiap insight AI menggunakan format:

1. fakta tervalidasi;
2. makna terhadap target atau kebijakan;
3. indikasi faktor terkait;
4. data yang belum tersedia;
5. pilihan tindak lanjut;
6. tingkat keyakinan;
7. sumber dan periode.

Asisten Data hanya membaca data yang boleh diakses pengguna. Jika data tidak tersedia atau belum tervalidasi, asisten menyatakannya secara langsung dan tidak membuat estimasi sendiri.

## 8. Roadmap pelaksanaan

### Fase 0 — mandat dan tata kelola

**Tujuan:** memastikan kewenangan dan pemilik keputusan jelas sebelum membangun konektor.

**Pekerjaan:**

- menetapkan sponsor/pemilik produk;
- menetapkan peran BAPPERIDA, Diskominfosantik, BPS, OPD, dan tim SABABUKA;
- menunjuk PIC substansi dan teknis untuk OPD pilot;
- menetapkan klasifikasi akses dan prinsip perlindungan data;
- menyepakati SOP awal data, koreksi, rekonsiliasi, serta publikasi.

**Output:** piagam produk, matriks kewenangan, daftar PIC, dan rancangan SOP.

**Gerbang lanjut:** setiap keputusan data memiliki pemilik yang jelas.

### Fase 1 — fokus kebijakan dan kebutuhan keputusan

**Tujuan:** memulai dari pertanyaan yang perlu dijawab pimpinan.

**Pekerjaan:**

- lokakarya fokus kebijakan Kabupaten Kapuas;
- menyusun pertanyaan keputusan untuk setiap fokus;
- mengelompokkan kategori strategis;
- menentukan pengguna, frekuensi, dan bentuk output yang diperlukan;
- memilih fokus untuk pilot.

**Output:** register fokus kebijakan, kategori strategis, dan daftar pertanyaan keputusan.

**Gerbang lanjut:** setiap fokus mempunyai keputusan atau tindakan yang hendak didukung.

### Fase 2 — kamus indikator dan target

**Tujuan:** memastikan istilah yang sama dibaca dengan arti yang sama.

**Pekerjaan:**

- menentukan nama, definisi, formula, satuan, arah, target, frekuensi, dan level wilayah;
- menetapkan OPD pengampu serta OPD pendukung;
- menetapkan sumber primer dan sumber pembanding;
- menentukan ambang peringatan dan batas kedaluwarsa;
- menandai indikator yang tidak sah sampai tingkat kecamatan.

**Output:** register indikator berversi dan kontrak sumber per indikator.

**Gerbang lanjut:** indikator pilot disetujui BAPPERIDA, produsen data, wali data, dan BPS untuk aspek statistik yang relevan.

### Fase 3 — inventarisasi dan audit sumber

**Tujuan:** mengetahui data apa yang benar-benar tersedia dan dapat diakses.

**Pekerjaan:**

- memetakan dataset Satu Data Kapuas terhadap indikator;
- memetakan rilis dan tabel BPS;
- memeriksa aplikasi, API, basis data, file, dan layanan geospasial OPD;
- menilai struktur, lisensi, frekuensi, kualitas, sensitivitas, serta stabilitas akses;
- menentukan jalur integrasi dan fallback tanpa duplikasi input.

**Output:** matriks indikator–sumber, register akses, nilai kesiapan, dan prioritas konektor.

**Gerbang lanjut:** setiap indikator pilot memiliki sumber primer yang dapat diuji dan dasar akses yang jelas.

### Fase 4 — fondasi data, metadata, dan keamanan

**Tujuan:** menyediakan penyimpanan yang dapat ditelusuri serta hak akses yang benar.

**Pekerjaan:**

- membangun lapisan raw, staging, canonical, metadata, dan audit;
- menerapkan kode referensi wilayah;
- membangun versioning, histori, dan lineage;
- menerapkan RBAC untuk pimpinan, BAPPERIDA, wali data, OPD, dan administrator;
- membangun autentikasi, backup, restore, logging, dan pemisahan lingkungan;
- menyusun API internal berversi.

**Output:** platform data dasar, API internal, RBAC, audit trail, dan runbook keamanan awal.

**Gerbang lanjut:** nilai dapat ditelusuri kembali ke sumber dan pengguna hanya melihat data sesuai kewenangan.

### Fase 5 — integrasi pilot

**Tujuan:** menghubungkan sumber resmi tanpa meminta input ganda.

**Pekerjaan:**

- konektor CKAN Satu Data;
- konektor WebAPI/tabel resmi BPS;
- konektor API, database view, file terjadwal, atau geospasial OPD pilot;
- pemeriksaan otomatis, retry, observability, dan notifikasi kegagalan;
- pembandingan hasil konektor dengan sumber asli;
- jalur unggah sementara yang terbatas apabila sumber belum terstruktur.

**Output:** konektor aktif, log sinkronisasi, laporan kualitas, dan staging data pilot.

**Gerbang lanjut:** sinkronisasi dapat diulang, hasilnya konsisten, dan tidak menciptakan kewajiban unggah ulang.

### Fase 6 — konfirmasi OPD dan kurasi BAPPERIDA

**Tujuan:** membangun tata kelola operasional sebelum data masuk ke pimpinan.

**Pekerjaan:**

- membangun Kotak Konfirmasi Data OPD;
- membangun antrean kelayakan tayang BAPPERIDA;
- menerapkan catatan, koreksi, penolakan, pembatasan, dan kedaluwarsa;
- membangun kasus rekonsiliasi antar-sumber;
- menyimpan siapa, kapan, alasan, dan versi setiap keputusan;
- menyediakan pratinjau Ringkasan Pimpinan.

**Output:** workflow verifikasi, audit trail keputusan data, dan daftar nilai layak tayang.

**Gerbang lanjut:** sampel data telah direkonsiliasi dan disetujui melalui mekanisme yang dapat diaudit.

### Fase 7 — dashboard Bupati dan BAPPERIDA

**Tujuan:** menyajikan informasi yang berbeda sesuai kebutuhan pengguna.

**Pekerjaan:**

- ringkasan fokus kebijakan;
- kartu indikator, target, dan peringatan;
- tren antarperiode;
- peta dan perbandingan wilayah sesuai granularitas yang sah;
- data keuangan berupa serapan, target periode, deviasi, keluaran, dan hambatan;
- layanan publik berupa volume, penyelesaian, SLA, kepuasan, serta pengaduan;
- metadata dan evidence drawer pada setiap angka;
- desain proyektor, mobile, aksesibilitas, dan koneksi terbatas.

**Output:** dashboard pilot Bupati, dashboard kurasi BAPPERIDA, dan ruang integrasi Diskominfosantik.

**Gerbang lanjut:** pengguna dapat menjawab apa yang terjadi, di mana, dibanding apa, dari sumber mana, dan siapa penanggung jawabnya.

### Fase 8 — analitik, peringatan, dan Asisten Data

**Tujuan:** mempercepat pembacaan data tanpa melampaui bukti.

**Pekerjaan:**

- deteksi tren, deviasi target, kedaluwarsa, dan kesenjangan wilayah;
- aturan peringatan yang dapat dijelaskan;
- penyusunan insight terstruktur dan tingkat keyakinan;
- Asisten Data berbasis retrieval dari data canonical dan metadata;
- guardrail, penolakan jawaban, sitasi sumber, log, dan evaluasi jawaban;
- pengujian pertanyaan Bupati dan BAPPERIDA.

**Output:** pusat peringatan, insight berbasis bukti, dan Asisten Data terkontrol.

**Gerbang lanjut:** jawaban tidak mengarang, selalu membawa periode/sumber, dan tidak menyatakan korelasi sebagai sebab.

### Fase 9 — uji, operasional, dan perluasan

**Tujuan:** mengubah pilot menjadi layanan yang dapat dipelihara.

**Pekerjaan:**

- uji pengguna lintas peran, keamanan, performa, dan kegagalan sumber;
- rekonsiliasi sampel dan berita acara penerimaan;
- pelatihan BAPPERIDA, Diskominfosantik, serta PIC OPD;
- deployment staging dan production;
- monitoring, SLA, backup, restore, rollback, serta respons insiden;
- evaluasi pilot dan penambahan fokus, indikator, OPD, serta wilayah secara bertahap.

**Output:** sistem produksi pilot, runbook, manual per peran, laporan uji, berita acara, dan backlog perluasan.

**Gerbang selesai pilot:** tata kelola berjalan, sumber dapat ditelusuri, data penting dapat diperbarui, dan keputusan publikasi tercatat permanen.

## 9. Rekomendasi lingkup pilot

Pilot sebaiknya menggunakan 3–5 fokus, sekitar 10–15 indikator, dan OPD yang memiliki data paling siap. Kandidat awal:

1. **Kesehatan dan stunting** — Dinas Kesehatan, DPUPRPKP, DPMD, dan P3APPKB.
2. **Infrastruktur dan konektivitas** — DPUPRPKP, Dinas Perhubungan, serta kecamatan.
3. **Pangan dan pertanian** — Dinas Pertanian, BPS, perangkat daerah pangan, dan DPUPRPKP.
4. **Keuangan dan pelaksanaan program** — BPKAD, Bapenda, BAPPERIDA, serta OPD pilot.
5. **Pelayanan publik** — Disdukcapil dan satu atau dua penyelenggara layanan yang sudah memiliki data terstruktur.

Pemilihan akhir ditentukan berdasarkan nilai kebijakan, kesiapan sumber, ketersediaan PIC, granularitas wilayah, sensitivitas, dan kemampuan menghasilkan tindak lanjut.

## 10. Yang sengaja ditunda

Hal berikut bukan prioritas sebelum fondasi data dan workflow pilot terbukti:

- dashboard input penuh untuk setiap OPD;
- aplikasi Android native atau wrapper khusus;
- bot WhatsApp;
- prediksi kebijakan otomatis;
- integrasi seluruh OPD sekaligus;
- scraping massal website berita;
- penggunaan data individu atau transaksi pada dashboard umum;
- publikasi terbuka semua data tanpa klasifikasi akses.

Kanal tambahan dapat dipertimbangkan setelah API, keamanan, audit, dan pengalaman pengguna web stabil.

## 11. Ukuran keberhasilan

Pilot dinyatakan berhasil apabila:

- seluruh indikator pilot memiliki definisi, sumber primer, target, PIC, dan metadata;
- tidak ada kewajiban input ulang untuk data yang sudah tersedia pada sumber resmi;
- setiap nilai di dashboard dapat ditelusuri ke sumber dan versinya;
- perbedaan data dapat direkonsiliasi tanpa menghapus jejak sumber;
- OPD dapat mengonfirmasi atau mengoreksi data melalui alur yang sederhana;
- BAPPERIDA dapat menentukan kelayakan tayang dengan audit trail;
- Diskominfosantik dapat memantau integrasi dan keamanan;
- Bupati dapat membaca tren, kesenjangan wilayah, makna, serta pilihan tindak lanjut;
- Asisten Data menolak pertanyaan yang tidak didukung data;
- proses tetap berjalan ketika PIC berganti karena SOP, metadata, dan riwayat tersimpan.

## 12. Kalimat posisi produk

> SABABUKA menghubungkan berbagai sumber tanpa menghilangkan identitas dan kewenangan pemilik datanya, membantu OPD mengonfirmasi substansi, membantu BAPPERIDA mengkurasi informasi, memperkuat peran Diskominfosantik dalam integrasi, serta menyajikan data yang layak sebagai dukungan keputusan Bupati.
