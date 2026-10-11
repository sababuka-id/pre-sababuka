# Audit Kesamaan Template Website OPD Kabupaten Kapuas

Tanggal audit: 10 Oktober 2026

Lingkup: 29 OPD aktif pada master SABABUKA
Metode: direktori resmi, hasil indeks halaman publik, pola URL/aset, struktur halaman, teks footer, dan konfirmasi yang nantinya diisi OPD melalui SABABUKA.

## Batas ketepatan

Sebagian besar subdomain mengembalikan HTTP 403 kepada pemeriksaan otomatis. Karena itu, dokumen ini **tidak menyamakan hosting/domain bersama dengan template yang sama**. Kesimpulan final hanya diberikan jika terdapat minimal dua bukti yang sejalan. Atribusi pembuat atau pengelola tidak dianggap final tanpa footer eksplisit atau konfirmasi pihak yang memegang akses admin.

## Kelompok yang terbukti sama

### Keluarga portal Pemkab/OPD

**BAPENDA, BKPSDM, dan SETWAN** memiliki struktur yang sama secara konsisten: blok Pengumuman, Berita Utama, Informasi/Layanan/Bank Data/Pegawai/Struktur, Lihat Semua, sambutan pimpinan dalam modal, jajak pendapat, pola halaman detail, serta footer alamat dan statistik pengunjung. SETWAN secara eksplisit menampilkan footer “Dikembangkan Oleh IT Pemkab Kapuas”.

Status: **template/aplikasi satu keluarga terverifikasi**.
Atribusi pengembang untuk BAPENDA dan BKPSDM: **belum boleh otomatis dianggap Diskominfosantik** sampai footer atau pengelola mengonfirmasi.

**BAPPERIDA** memakai pola penyimpanan `/public/deploy/pdf/` yang juga ditemukan pada BAPENDA dan BKPSDM. Ini indikasi backend/komponen yang sama, tetapi halaman utamanya belum dapat diverifikasi penuh akibat proteksi akses.

Status: **indikasi kuat; perlu konfirmasi admin/footer**.

### Keluarga WordPress majalah

**DINKES dan DP3APPKB** sama-sama menampilkan struktur “Latest Post”, daftar kategori, kartu berita berulang, dan blok “You missed”. DINKES juga terkonfirmasi memakai jalur WordPress `/wp-content/uploads/`.

Status: **keluarga tema/tata letak yang sama terverifikasi dari halaman terindeks**.
Atribusi pengembang: **belum diketahui**.

## Website WordPress tetapi bukan bukti template yang sama

- **DINSOS**: WordPress, footer menyebut “Developed By Good Looking Themes”.
- **DISARPUSTAKA**: WordPress, footer menyebut “Powered by Majalah Berita X”.
- **DPUPR**: WordPress pada jalur `/web/` dan `/wp-content/uploads/`, tetapi tata letaknya berbeda dari kelompok DINKES–DP3APPKB.
- **DINKES** dan **DP3APPKB**: masuk kelompok tema majalah di atas.

Kesamaan CMS WordPress saja tidak cukup untuk menyatakan template atau pembuatnya sama.

## Matriks hasil audit 29 OPD

| OPD | Bukti platform/template yang tersedia | Status kesamaan |
|---|---|---|
| BAKESBANGPOL | Konten terhalang proteksi | Belum terverifikasi |
| BAPENDA | Portal Pemkab/OPD | Sama dengan BKPSDM dan SETWAN |
| BAPPERIDA | Pola `/public/deploy/pdf/` | Indikasi satu keluarga portal |
| BKAD | URL utama belum konsisten; kandidat Perbendaharaan | Belum terverifikasi |
| BKPSDM | Portal Pemkab/OPD | Sama dengan BAPENDA dan SETWAN |
| BPBD | Halaman terindeks masih memuat teks demo “NEWS AND MAGAZINES/Lorem Ipsum” | Template belum layak/final |
| DAMKAR | Domain lama gabungan | Belum terverifikasi |
| DINKES | WordPress, tema majalah “Latest Post/You missed” | Sama dengan DP3APPKB |
| DINSOS | WordPress, Good Looking Themes | Berdiri sendiri |
| DISARPUS | WordPress, Majalah Berita X | Berdiri sendiri |
| DISBUDPARPORA | Nomenklatur/domain belum konsisten | Belum terverifikasi |
| DISDIK | Halaman publik terindeks; fingerprint tema belum cukup | Belum terverifikasi |
| DISHUB | Konten terhalang proteksi | Belum terverifikasi |
| DISKOMINFOSANTIK | Konten terhalang proteksi | Belum terverifikasi |
| DISNAKERTRANS | Halaman WordPress terindeks | Tema spesifik belum terverifikasi |
| DISPERINDAGKOPUKM | Konten terhalang proteksi | Belum terverifikasi |
| DISPERKIMTAN | Konten terhalang proteksi | Belum terverifikasi |
| DISTAN | Konten terhalang proteksi | Belum terverifikasi |
| DKPP | Konten terhalang proteksi | Belum terverifikasi |
| DLHK | Nomenklatur/domain belum konsisten | Belum terverifikasi |
| DP3APPKB | Tema majalah “Latest Post/You missed” | Sama dengan DINKES |
| DPMD | Konten terhalang proteksi | Belum terverifikasi |
| DPMPTSP | Konten terhalang proteksi | Belum terverifikasi |
| DPUPR | WordPress `/web/` | Berbeda dari kelompok DINKES–DP3APPKB |
| DUKCAPIL | Situs PHP lama/khusus, pola `index1.php?modul=` | Berdiri sendiri |
| INSPEKTORAT | Konten terhalang proteksi | Belum terverifikasi |
| SATPOLPP | Konten terhalang proteksi | Belum terverifikasi |
| SETDA | Konten terhalang proteksi | Belum terverifikasi |
| SETWAN | Portal Pemkab/OPD; footer IT Pemkab Kapuas | Sama dengan BAPENDA dan BKPSDM |

## Kesimpulan yang aman digunakan

1. Kelompok yang paling kuat terbukti sama adalah **BAPENDA–BKPSDM–SETWAN**.
2. Kelompok tema publik lain yang terbukti sangat serupa adalah **DINKES–DP3APPKB**.
3. BAPPERIDA kemungkinan memakai keluarga portal yang sama dengan kelompok pertama, tetapi belum final.
4. Bukti yang ada belum cukup untuk menyatakan seluruh kelompok tersebut “digarap Diskominfosantik”. Bukti publik hanya memastikan SETWAN menyebut **IT Pemkab Kapuas**; identitas unit pembuat, pengelola konten, pemilik hosting, dan pemegang admin harus dikonfirmasi terpisah.
5. Form Profil Data dan Baseline OPD di SABABUKA sekarang memuat nama template, pengembang/vendor, pengelola, hosting, pemegang akses admin, dan bukti pengelolaan. Jawaban tersebut diperiksa Diskominfosantik sehingga status “100% terkonfirmasi” dapat dibentuk tanpa asumsi.

## Sumber publik

- Direktori website resmi Satu Data Kapuas: https://satudata.kapuaskab.go.id/daftar-website/
- Daftar OPD pada portal Kabupaten Kapuas: https://kapuaskab.go.id/web/page/opd
- BAPENDA: https://bapenda.kapuaskab.go.id/
- BKPSDM: https://bkpsdm.kapuaskab.go.id/
- SETWAN: https://setwan.kapuaskab.go.id/
- DINKES: https://dinkes.kapuaskab.go.id/web/
- DP3APPKB: https://dp3appkb.kapuaskab.go.id/
- DINSOS: https://dissos.kapuaskab.go.id/
- DISARPUSTAKA: https://disarpustaka.kapuaskab.go.id/
- DPUPR: https://dpuprpkp.kapuaskab.go.id/web/
- DUKCAPIL: https://disdukcapil.kapuaskab.go.id/
