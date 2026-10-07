# Audit Konsistensi UI/UX SABABUKA MVP

Tanggal audit: 7 Oktober 2026  
Lingkungan: aplikasi lokal, data demo dan publikasi resmi terpilih  
Keputusan: **layak untuk demonstrasi terarah, perlu konsolidasi design system sebelum UAT luas**

## 1. Lingkup dan metode

Audit mencakup 17 halaman aplikasi:

1. Beranda Administrasi;
2. Organisasi dan OPD;
3. Pengguna;
4. Role dan Permission;
5. Pengaturan Menu;
6. Konfigurasi Sistem;
7. Keamanan Akun;
8. Kategori Indikator;
9. Master Indikator;
10. Realisasi Indikator;
11. Review Capaian OPD;
12. Kurasi dan Publikasi;
13. Ringkasan Pimpinan;
14. Asisten Data;
15. Notifikasi;
16. Audit Aktivitas;
17. Dashboard Operasional.

Setiap halaman dirender pada desktop 1440 × 1000 dan mobile 390 × 844. Total bukti terdiri dari 34 screenshot, pemeriksaan DOM, pengukuran target klik, label form, overflow, kontras warna, dan pembacaan source React/CSS. Bukti render tersimpan di `.qa/ui-audit/`.

## 2. Ringkasan kuantitatif

| Pemeriksaan | Hasil |
|---|---:|
| Halaman yang diperiksa | 17 |
| Screenshot desktop dan mobile | 34 |
| Elemen teks desktop di bawah 12 px | 373 |
| Teks 9 px | 239 elemen |
| Teks 10 px | 115 elemen |
| Teks 11 px | 19 elemen |
| Kontrol filter/pencarian tanpa label aksesibel | 12 |
| Tabel desktop yang keluar dari kontainer | 0 |
| Tabel mobile yang memerlukan scroll horizontal | 7 dari 8 tabel |
| Halaman mobile dengan overflow seluruh halaman | 1, Dashboard Operasional |
| Ukuran font yang didefinisikan di CSS | 17 variasi |
| Nilai radius sudut yang didefinisikan | 19 variasi |
| Variasi deklarasi padding | lebih dari 40 |

## 3. Temuan prioritas tinggi

### UI-01 — Loading halaman memakai komponen layar penuh di dalam layout

**Lokasi:** `components.tsx`, `App.tsx`, `ExecutivePage.tsx`, `OperationsPage.tsx`  
**Bukti:** `.loading-screen` memiliki `min-height: 100vh`, sementara komponen tersebut kadang dirender di dalam layout yang sudah memiliki topbar, sidebar, dan page shell.

**Dampak:** halaman memperlihatkan area kosong sangat besar, posisi spinner tampak terlalu rendah, dan tinggi halaman bertambah melebihi viewport. Pola loading berbeda dengan halaman tabel yang memakai `panel-loading` setinggi 180 px.

**Perbaikan:** pisahkan `AppBootScreen`, `PageLoading`, `PanelLoading`, dan skeleton tabel/kartu. `100vh` hanya dipakai sebelum layout aplikasi tersedia.

### UI-02 — Konteks “Internal Sistem” ditentukan dari role, bukan jenis halaman

**Lokasi:** `layout/AdminLayout.tsx`  
**Bukti:** pengguna Superadmin melihat label **Konfigurasi Internal** dan **Internal Sistem** pada Ringkasan Pimpinan, Asisten AI, Publikasi, serta Dashboard Operasional.

**Dampak:** hierarki informasi salah. Halaman pimpinan terlihat seperti menu konfigurasi karena label konteks mengikuti role Superadmin.

**Perbaikan:** tentukan konteks dari route atau metadata halaman, misalnya `administration`, `governance`, `operations`, dan `executive`.

### UI-03 — Tabel mobile hanya mengecil menjadi tabel yang dapat digeser

**Lokasi:** aturan `.table-scroll`, `.identity-cell`, seluruh halaman tabel  
**Bukti:** 7 dari 8 tabel mobile memiliki lebar konten melebihi kontainer. Pada halaman Pengguna hanya kolom Pengguna dan Organisasi Utama yang langsung terlihat; status, MFA, login terakhir, dan tindakan berada di luar layar. Tidak ada petunjuk bahwa tabel dapat digeser.

**Dampak:** informasi dan tindakan penting sulit ditemukan. Pengguna dapat menyimpulkan kolom atau tombol tidak tersedia.

**Perbaikan:** gunakan pola responsif per jenis tabel:

- tabel master menjadi kartu ringkas pada lebar di bawah 640 px;
- pertahankan kolom identitas sebagai sticky jika scroll tetap dipakai;
- tampilkan petunjuk “Geser untuk melihat kolom lain”;
- pindahkan tindakan utama ke menu per baris yang selalu terlihat;
- sediakan `scope="col"`, caption, dan label kolom yang bermakna.

### UI-04 — Dashboard Operasional mengalami overflow halaman pada mobile

**Lokasi:** `.operations-grid`, `.operations-metrics`, tabel status OPD  
**Bukti:** audit viewport 390 px menemukan `document.scrollWidth > document.clientWidth` pada `/operations`.

**Dampak:** seluruh halaman dapat bergeser horizontal, topbar dan kartu tampak terpotong, serta interaksi scroll menjadi tidak stabil.

**Perbaikan:** tambahkan `min-width: 0` pada anak grid/panel, batasi isi feed, pastikan tabel hanya overflow di `.table-scroll`, dan uji pada 320, 360, 390, serta 430 px.

### UI-05 — Skala teks terlalu kecil untuk aplikasi operasional dan proyektor

**Lokasi:** tabel, badge, sidebar, permission, menu tree, metadata, kode  
**Bukti:** 373 elemen desktop berukuran kurang dari 12 px; 239 elemen memakai 9 px. Header tabel, badge status, metadata permission, kode menu, dan label navigasi paling terdampak.

**Dampak:** keterbacaan buruk pada proyektor, laptop beresolusi tinggi, pengguna berusia lanjut, dan tampilan mobile. Perbedaan hierarki terlalu bergantung pada ukuran sangat kecil.

**Perbaikan:** tetapkan skala minimum:

| Fungsi | Ukuran yang disarankan |
|---|---:|
| Metadata paling kecil | 12 px |
| Body/table | 14 px |
| Label kontrol | 13–14 px |
| Badge | 11–12 px |
| Subjudul halaman | 14–16 px |
| Judul kartu | 16–18 px |

### UI-06 — Kontrol filter dan pencarian tidak memiliki komponen tunggal

**Lokasi:** halaman Audit, Publikasi, Pengiriman, Review, Kategori, Indikator, Pengaturan Menu  
**Bukti:** filter Publikasi tampil sebagai select bawaan browser setinggi sekitar 25 px, filter Audit sebagai input bawaan sekitar 27 px, filter Indikator memiliki gaya khusus 43 px, sedangkan search box memiliki gaya lain. Ditemukan 12 kontrol tanpa label aksesibel.

**Dampak:** tampilan terlihat belum selesai, ukuran kontrol tidak sejajar, dan pembaca layar hanya memperoleh placeholder atau konteks yang tidak cukup.

**Perbaikan:** buat `SearchField`, `FilterSelect`, `FilterBar`, dan `FormField`. Semua kontrol harus memiliki label terlihat atau `aria-label`, tinggi 44 px, state fokus, tombol reset, dan jarak konsisten.

### UI-07 — Kontrol keyboard dan semantik interaktif belum lengkap

**Lokasi:** `.switch input`, `.clickable-row`, modal, sidebar mobile  
**Bukti:** checkbox feature flag memakai `display: none`; baris indikator/submission memakai `onClick` pada `<tr>` tanpa `tabIndex`, role, atau handler keyboard. Modal dapat ditutup dengan Escape tetapi belum mengunci fokus dan belum mengembalikan fokus ke pemicu.

**Dampak:** pengguna keyboard tidak dapat mengoperasikan feature flag atau membuka detail dari tabel. Fokus dapat berpindah ke konten di belakang modal.

**Perbaikan:** gunakan pola visually hidden untuk switch, tombol/link nyata pada sel utama, focus trap modal, initial focus, restore focus, serta penguncian scroll halaman.

### UI-08 — Tombol pencarian global tidak bekerja dan indikator notifikasi selalu menyala

**Lokasi:** `layout/AdminLayout.tsx`  
**Bukti:** tombol ikon Pencarian tidak memiliki `onClick`. Ikon notifikasi selalu merender titik merah `<i />` tanpa membaca `unread_count`.

**Dampak:** UI memberi janji fungsi yang tidak tersedia dan menampilkan status belum dibaca meskipun tidak ada notifikasi.

**Perbaikan:** sembunyikan pencarian sampai implementasi tersedia atau hubungkan ke command palette. Ambil jumlah notifikasi aktual, tampilkan angka bila perlu, dan hilangkan indikator saat nol.

### UI-09 — Navigasi client-side tidak mereset posisi scroll

**Lokasi:** `router.ts`, fungsi `navigate()`  
**Bukti:** navigasi hanya menjalankan `pushState` dan `popstate`; tidak ada `window.scrollTo(0, 0)` atau pengelolaan fokus ke judul halaman.

**Dampak:** pengguna yang berpindah setelah menggulir tabel panjang dapat masuk ke halaman berikutnya pada posisi tengah/bawah. Masalah paling terasa pada mobile.

**Perbaikan:** reset scroll saat route berubah dan pindahkan fokus programatis ke `<h1>` dengan pengumuman perubahan halaman.

## 4. Temuan prioritas menengah

### UI-10 — Ukuran target klik belum memenuhi baseline 44 × 44 px

Button utama memakai tinggi 42 px, search input 43 px, icon button 40 px, compact button 34 px, dan nav link 43 px. Naikkan ukuran target tanpa harus memperbesar ikon; area klik dapat diperluas dengan padding.

### UI-11 — Kontras beberapa teks berada di bawah ambang WCAG AA

Pengukuran pasangan warna:

| Pasangan | Rasio | Status teks normal |
|---|---:|---|
| `--muted` pada latar halaman | 4,39:1 | Gagal tipis |
| header tabel pada `--soft` | 4,34:1 | Gagal |
| warna warning lama pada latar kuning | 3,35:1 | Gagal |
| teks sidebar utama | 10,71:1 | Lulus |
| badge success | 5,27:1 | Lulus |

Warna warning yang saat ini dipakai `.notice.warning` lebih gelap daripada token awal dan terlihat lebih baik, tetapi token warna perlu dikunci agar komponen baru tidak memakai pasangan yang gagal.

### UI-12 — Padding panel tidak konsisten

Sebagian panel memakai `panel-heading` 20 × 22 px, dashboard 22 px, kategori rilis 20 px, modal 22 px, dan panel Ringkasan Pimpinan tidak memberi padding dasar pada `.executive-panel`. Header “Data Terkurasi” dan kartu dapat terlalu dekat dengan tepi panel.

Gunakan struktur tunggal: `PanelHeader`, `PanelBody`, dan `PanelFooter` dengan token 16/20/24 px.

### UI-13 — Radius, gap, dan padding tidak mengikuti skala terbatas

CSS memuat 19 variasi radius, lebih dari 40 deklarasi padding, dan gap hampir setiap angka 2–20 px. Variasi kecil seperti radius 9, 10, 11, 12, 13, 14, dan 15 px tidak menghasilkan perbedaan bermakna tetapi membuat tampilan sulit dirawat.

Gunakan token:

- spacing: 4, 8, 12, 16, 24, 32;
- radius: 8 untuk kontrol, 12 untuk kartu, 16 untuk modal/panel besar, 999 untuk pill;
- shadow: low, medium, overlay.

### UI-14 — Loading, empty, error, dan success state berbeda antarhalaman

Ada halaman yang memakai layar penuh, spinner tanpa kontainer, panel loading, empty state berlambang berlian, atau notice. Error state tidak selalu menyediakan tombol coba lagi. Empty state kadang memiliki CTA dan kadang hanya teks.

Standarkan empat state dengan tinggi, ikon, kalimat, dan tindakan yang seragam.

### UI-15 — Toolbar mobile menyembunyikan fungsi tanpa pengganti

Pada lebar di bawah 800 px, tombol pencarian dan notifikasi disembunyikan. Notifikasi memang dapat tersedia melalui menu, tetapi lokasi dan jumlah unread tidak terlihat. Pencarian menghilang sepenuhnya.

Pertahankan notifikasi pada topbar mobile atau sediakan item menu dengan badge. Hapus pencarian global jika belum diimplementasikan.

### UI-16 — Kartu metrik terlalu panjang pada mobile

Empat kartu Ringkasan Pimpinan dan lima kartu Operasional berubah menjadi satu kolom pada lebar di bawah 560 px. Isi utama baru terlihat setelah beberapa layar scroll.

Gunakan grid dua kolom pada 360–560 px untuk kartu ringkas, atau ubah menjadi baris metrik padat. Kartu lima pada Operasional sudah memakai dua kolom hingga 650 px dan dapat dijadikan pola bersama.

### UI-17 — Tidak ada petunjuk sorting, filtering aktif, atau hasil pencarian

Header tabel tidak dapat diurutkan. Setelah filter dipilih, tidak ada ringkasan filter aktif, jumlah hasil, atau tombol hapus filter. Pengguna juga tidak tahu apakah pencarian terjadi saat mengetik atau setelah menekan Cari.

Tambahkan jumlah hasil, chips filter aktif, reset, dan indikator sort pada kolom yang relevan.

### UI-18 — Tindakan baris tidak memiliki judul kolom

Tabel Pengguna memiliki `<th />` kosong untuk tombol “Tetapkan role”. Gunakan “Tindakan” sebagai header visual atau `aria-label` yang jelas bila desain sengaja menyembunyikannya.

### UI-19 — Informasi teknis mengambil ruang besar tanpa terjemahan pengguna

Audit menampilkan `auth.login_succeeded`, UUID penuh, `Auth_session`, `development.demo_content_seeded`, dan Request ID tanpa penjelasan. Permission dan menu juga dominan memakai kode teknis 9 px.

Tampilkan label manusia sebagai informasi utama; kode teknis masuk ke detail/drawer dan tetap dapat disalin.

## 5. Temuan konsistensi teks

### UI-20 — Bahasa Indonesia dan Inggris bercampur pada komponen utama

Contoh yang terlihat:

- Role dan Permission;
- Active, Replaced;
- Normal, Elevated, Critical;
- Feature control, Feature flag;
- Dataset, Executive Dashboard, Assistant, Category, Indicator;
- scope, workflow, production, recovery code.

Istilah teknis boleh dipertahankan sebagai kode, tetapi label pengguna perlu memakai satu bahasa. Rekomendasi:

| Saat ini | Disarankan |
|---|---|
| Role dan Permission | Peran dan Hak Akses |
| Active | Aktif |
| Replaced | Digantikan |
| Normal / Elevated / Critical | Normal / Tinggi / Kritis |
| Feature flag | Kendali Fitur |
| Scope organisasi | Lingkup organisasi |
| Executive Dashboard | Ringkasan Pimpinan |
| Assignment role | Penetapan peran |

### UI-21 — Nama menu dan judul halaman tidak selalu sama

| Menu | Judul halaman |
|---|---|
| Pengiriman Data | Realisasi Indikator |
| Review Data | Review Capaian OPD |
| Publikasi | Kurasi dan Publikasi |
| Audit | Audit Aktivitas |
| Asisten AI | Asisten Data Pimpinan pada isi halaman |

Pilih satu nama pendek untuk navigasi dan satu judul panjang bila diperlukan, tetapi hubungannya harus eksplisit. “Pengiriman Data” paling berpotensi disalahartikan sebagai unggah dataset, sedangkan halaman sebenarnya berisi form capaian indikator.

### UI-22 — Status indikator bertentangan dengan pesan peringatan

Halaman Master Indikator menampilkan warning “Indikator pilot dimulai sebagai draft”, sementara seluruh baris yang terlihat berstatus `Active`. Warning seharusnya kontekstual, misalnya hanya muncul saat ada draft atau di dalam form pembuatan.

### UI-23 — Label status kategori dapat dibaca terlalu luas

Badge **Rilis Data Resmi** muncul pada kategori yang baru memiliki dua indikator terverifikasi, bukan seluruh indikator kategori. Ganti menjadi **Memuat capaian terverifikasi** atau **2 indikator terverifikasi** agar tidak memberi kesan semua data kategori sudah resmi.

### UI-24 — Format tanggal belum seragam

Sebagian halaman memakai helper `formatDate()` dengan zona Asia/Jakarta; Ringkasan Pimpinan dan Notifikasi memakai `toLocaleString("id-ID")` langsung. Tampilan menghasilkan bentuk seperti `7/10/2026, 09.02.44` tanpa label WIB.

Gunakan satu formatter: `7 Okt 2026, 09.02 WIB` untuk tampilan, dengan detik hanya pada Audit.

### UI-25 — Satuan nilai dicampur ke angka utama

Kartu menampilkan bentuk seperti `82,35 Indeks`. Untuk satuan generik, tampilkan angka sebagai fokus dan satuan sebagai label kecil, misalnya `82,35` lalu `Skor IKP`.

## 6. Temuan aksesibilitas tambahan

### UI-26 — Belum ada pola focus-visible yang konsisten

Input memiliki focus ring khusus, tetapi tombol, link, nav, baris interaktif, switch, dan kartu tidak memakai pola fokus bersama. Buat token focus ring dengan kontras tinggi dan offset yang konsisten.

### UI-27 — Status dinamis belum diumumkan

Spinner, notice, hasil simpan, error, dan pesan chat belum konsisten memakai `role="status"`, `aria-live`, atau `aria-busy`. Pengguna pembaca layar tidak selalu mengetahui bahwa pemuatan atau penyimpanan telah selesai.

### UI-28 — Profil dan menu popover belum memiliki state aksesibel lengkap

Tombol profil belum memiliki `aria-expanded`, `aria-controls`, penutupan klik luar, atau penutupan Escape. Sidebar mobile juga belum mengelola fokus saat dibuka.

## 7. Hal yang sudah konsisten dan layak dipertahankan

- Palet navy, teal, amber, dan latar abu muda membentuk identitas visual yang jelas.
- Hierarki judul halaman, eyebrow, panel, dan kartu mudah dikenali.
- Sidebar desktop memiliki grouping yang kuat dan active state terlihat jelas.
- Form utama umumnya memakai label yang membungkus input, sehingga hubungan label–kontrol sudah baik.
- Status kritis pada data resmi versus demo menggunakan label teks, bukan warna saja.
- Tampilan desktop 1440 px tidak mengalami overflow tabel.
- Modal sudah memiliki `role="dialog"`, `aria-modal`, tombol tutup berlabel, dan dukungan Escape.
- Empty state, notice, badge, pagination, serta formatting tanggal sudah mulai dipusatkan sebagai komponen bersama.

## 8. Urutan perbaikan yang disarankan

### Gelombang 1 — sebelum ekspose/UAT

1. Benahi loading di dalam layout.
2. Benahi label konteks berdasarkan route.
3. Samakan gaya dan label seluruh filter.
4. Naikkan teks 9–11 px ke minimum 12 px.
5. Lokalkan status yang terlihat pada demo.
6. Ganti label kategori “Rilis Data Resmi”.
7. Hilangkan tombol pencarian global yang belum aktif dan hubungkan dot notifikasi ke data aktual.
8. Hilangkan overflow halaman Dashboard Operasional mobile.

### Gelombang 2 — sebelum UAT lintas role

1. Ubah tabel mobile menjadi kartu atau tabel adaptif.
2. Perbaiki switch dan clickable row untuk keyboard.
3. Tambahkan focus management modal/sidebar/popover.
4. Standarkan loading, empty, error, dan retry.
5. Konsolidasikan nama menu dan judul halaman.
6. Standarkan tanggal, zona waktu, satuan, dan status.

### Gelombang 3 — konsolidasi design system

1. Bentuk token font, spacing, radius, shadow, color, dan breakpoint.
2. Buat komponen Panel, Toolbar, Field, Filter, ResponsiveTable, StatusBadge, MetricCard, serta PageState.
3. Tambahkan pemeriksaan visual otomatis desktop/mobile dan audit aksesibilitas pada CI.
4. Uji zoom 200%, navigasi keyboard, screen reader, proyektor, dan koneksi lambat.

## 9. Kriteria selesai

Perapian UI/UX dapat dinyatakan selesai ketika:

- tidak ada teks operasional di bawah 12 px;
- seluruh body/table minimal 14 px;
- seluruh target interaktif utama minimal 44 × 44 px;
- seluruh kontrol memiliki label aksesibel;
- tidak ada overflow halaman pada viewport 320–1440 px;
- tabel mobile tetap menyediakan identitas, status, dan tindakan utama tanpa tebak-tebakan;
- seluruh halaman memakai istilah, status, tanggal, dan satuan yang konsisten;
- loading/error/empty/success memakai komponen bersama;
- semua fungsi yang terlihat benar-benar bekerja;
- alur utama dapat diselesaikan dengan keyboard saja.

## 10. Status implementasi 7 Oktober 2026

Gelombang perbaikan utama sudah diterapkan pada frontend:

- Source Sans 3 lokal (400/600/700, subset Latin) menjadi font utama; heading Georgia dihapus;
- skala teks dinaikkan sehingga tidak ada lagi teks terukur di bawah 12 px;
- tinggi kontrol utama distandarkan pada 44–46 px;
- input pencarian dan filter memiliki gaya serta label aksesibel yang konsisten;
- loading halaman memakai state lokal sehingga sidebar dan topbar tidak menghilang;
- konteks topbar dan eyebrow mengikuti area halaman;
- tombol pencarian global yang belum berfungsi dan dot notifikasi statis dihapus;
- tabel mobile ditempatkan dalam area scroll terkontrol dengan kolom identitas tetap terlihat;
- overflow halaman Dashboard Operasional mobile dihilangkan;
- clickable row, switch, modal, popover profil, dan perpindahan halaman diperbaiki untuk keyboard/focus;
- status penting, istilah menu, zona waktu, dan label kategori rilis dirapikan.

Audit ulang pada 17 route desktop dan 17 route mobile menghasilkan:

| Metrik | Sebelum | Sesudah |
|---|---:|---:|
| Teks di bawah 12 px | 373 | 0 |
| Kontrol tanpa label aksesibel | 12 | 0 |
| Halaman mobile overflow horizontal | 1 | 0 |
| Target kecil yang terdeteksi skrip | 373 | 77 |

Sebagian besar 77 target tersisa adalah checkbox native 17 × 17 px yang berada di dalam label dengan area klik baris yang lebih besar, serta tautan sumber inline di dalam kalimat. Keduanya bukan kontrol utama mandiri. Tombol ringkas dan input pencarian dinaikkan lagi ke minimum 44 px setelah pengukuran ini.

Bukti audit terbaru tersimpan di `.qa/ui-audit/`; baseline sebelum perbaikan tersimpan di `.qa/ui-audit-before/`.

### Audit lanjutan seluruh dialog

Audit kedua membuka 12 jenis dialog pada viewport desktop 1440 × 1000 dan mobile 390 × 844. Sebanyak 22 keadaan dialog berhasil diperiksa; dialog pemeriksaan capaian tidak memiliki baris pada data demo saat audit, tetapi memakai komponen rincian capaian yang sama dengan dialog realisasi yang sudah diperiksa pada kedua viewport.

Perbaikan hasil audit dialog:

- garis fokus biru pada seluruh bingkai dialog dihapus tanpa menghilangkan fokus pada tombol dan kontrol;
- header dibuat tetap, sedangkan gulir dibatasi pada isi dialog;
- ringkasan capaian dan publikasi memakai empat kolom rapi di desktop serta susunan satu atau dua kolom di mobile;
- tampilan baca capaian tidak lagi memakai input nonaktif yang menyerupai formulir kosong;
- angka target, realisasi, dan publikasi memakai format Indonesia dengan maksimum empat desimal;
- status teknis dan frekuensi diterjemahkan ke label yang terbaca pengguna;
- judul dinamis membersihkan tanda pisah panjang menjadi tanda hubung biasa;
- isi dialog publikasi mendapat padding konsisten dan ukuran teks item dinaikkan;
- tombol tutup dipertahankan pada area sentuh minimum 46 × 46 px.

Hasil pemeriksaan akhir tidak menemukan desimal panjang, input kosong nonaktif, outline pada bingkai dialog, atau overflow horizontal. Bukti 24 tangkapan dan metrik audit tersimpan di `.qa/modal-audit/`.

