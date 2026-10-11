# Matriks URL dan Kelengkapan Data OPD SABABUKA

Tanggal pemeriksaan: 10 Oktober 2026
Lingkup: 29 organisasi bertipe `opd` yang aktif pada master organisasi SABABUKA produksi.

## Cara membaca

- **URL terlindungi**: host tersedia, tetapi pemeriksaan otomatis menerima HTTP 403 dari lapisan keamanan bersama. Status ini tidak sama dengan situs mati; pemeriksaan konten perlu browser atau akses yang diizinkan.
- **A**: indikator RPJMD, dataset terstruktur, dan akun PIC OPD sudah tersedia.
- **B**: indikator dan dataset tersedia, tetapi akun PIC OPD belum tersedia.
- **C**: salah satu unsur indikator atau dataset sumber belum tersedia.
- **D**: indikator, dataset sumber, dan PIC belum tersedia.
- Jumlah dataset berasal dari organisasi CKAN Satu Data Kapuas. Dataset agregat `Data Pemerintah Kabupaten Kapuas 2025` tidak dibagikan secara asumtif kepada OPD tertentu.

## Matriks

| Kode | OPD | URL resmi/kandidat | Kondisi URL | Indikator / kategori RPJMD | Dataset Satu Data | PIC | Kelengkapan dan catatan |
|---|---|---|---|---:|---|---:|---|
| BAKESBANGPOL | Badan Kesatuan Bangsa dan Politik | https://kesbangpol.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 0 | 0 | **C** - mapping ada, dataset dan PIC belum ada |
| BAPENDA | Badan Pendapatan Daerah | https://bapenda.kapuaskab.go.id | Terdaftar; terlindungi 403 | 3 / 2 | 2 XLSX | 0 | **B** - siapkan PIC dan tentukan seri pendapatan bulanan |
| BAPPERIDA | Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah | https://bapperida.kapuaskab.go.id | Terdaftar; terlindungi 403 | 8 / 6 | 0 | 1 | **C** - mapping dan PIC ada, sumber data CKAN organisasi belum ada |
| BKAD | Badan Keuangan dan Aset Daerah | https://perbendaharaan.kapuaskab.go.id | Alternatif aktif/terlindungi; `bpkad` tidak ter-resolve | 1 / 1 | 2 XLSX | 0 | **B** - konfirmasi URL utama dan siapkan PIC |
| BKPSDM | Badan Kepegawaian dan Pengembangan SDM | https://bkpsdm.kapuaskab.go.id | Terdaftar; terlindungi 403; terindeks mesin pencari | 1 / 1 | 2 XLS | 0 | **B** - data ada, format lama XLS dan PIC belum ada |
| BPBD | Badan Penanggulangan Bencana Daerah | https://bpbd.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 2 XLSX | 0 | **B** - perlu PIC dan seri kejadian per bulan/kecamatan |
| DAMKAR | Dinas Pemadam Kebakaran dan Penyelamatan | https://polppdamkar.kapuaskab.go.id | Host lama/gabungan terlindungi; URL mandiri belum ada | 0 / 0 | 0 | 0 | **D** - konfirmasi kelembagaan, URL, indikator, dataset, dan PIC |
| DINKES | Dinas Kesehatan | https://dinkes.kapuaskab.go.id/web/ | Terdaftar; terlindungi 403; konten 2026 terindeks | 6 / 1 | 13 XLSX | 1 | **A** - paling siap; perlu normalisasi seri tahunan/bulanan |
| DINSOS | Dinas Sosial | https://dissos.kapuaskab.go.id | Terdaftar; terlindungi 403 | 2 / 1 | 1 CSV/JSON/XLSX, multiyear | 0 | **B** - sumber terbaik untuk pilot; tambahkan PIC |
| DISARPUS | Dinas Kearsipan dan Perpustakaan | https://disarpustaka.kapuaskab.go.id | Terdaftar; terlindungi 403 | 2 / 2 | 4 CSV/JSON/XLSX | 0 | **B** - format sangat siap, PIC dan histori perlu dilengkapi |
| DISBUDPARPORA | Dinas Kebudayaan, Pariwisata, Kepemudaan dan Olahraga | https://disparbudpora.kapuaskab.go.id | Host tersedia/terlindungi; direktori lama memakai `dispora` | 4 / 3 | 6 XLS | 0 | **B** - konfirmasi URL/nomenklatur dan migrasi XLS |
| DISDIK | Dinas Pendidikan | https://disdik.kapuaskab.go.id | Terdaftar; terlindungi 403 | 5 / 2 | 6 XLS/XLSX | 0 | **B** - data cukup, PIC dan konsistensi tahun ajaran perlu disiapkan |
| DISHUB | Dinas Perhubungan | https://dishub.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 1 XLSX | 0 | **B** - data awal ada, perlu seri periode dan PIC |
| DISKOMINFOSANTIK | Dinas Komunikasi, Informatika, Persandian dan Statistik | https://diskominfosantik.kapuaskab.go.id | Terdaftar; terlindungi 403 | 6 / 3 | 3 XLSX | 0 | **B** - Walidata sudah jelas, tetapi membership PIC organisasi perlu dirapikan |
| DISNAKERTRANS | Dinas Transmigrasi dan Tenaga Kerja | https://distransnaker.kapuaskab.go.id | Terdaftar; terlindungi 403 | 3 / 1 | 0 | 0 | **C** - mapping ada; organisasi/dataset CKAN dan PIC belum ada |
| DISPERINDAGKOPUKM | Dinas Perdagangan, Perindustrian, Koperasi dan UKM | https://dppkukm.kapuaskab.go.id | Terdaftar; terlindungi 403 | 5 / 4 | 4 XLSX | 0 | **B** - kandidat integrasi harga bulanan; PIC belum ada |
| DISPERKIMTAN | Dinas Perumahan, Kawasan Permukiman dan Pertanahan | https://perkimtan.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 0 | 0 | **C** - mapping ada, data CKAN dan PIC belum ada |
| DISTAN | Dinas Pertanian | https://distan.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 3 XLS/XLSX | 0 | **B** - perlu PIC, seri produksi, dan kode kecamatan |
| DKPP | Dinas Ketahanan Pangan dan Perikanan | https://dkpp.kapuaskab.go.id | Terdaftar; terlindungi 403 | 4 / 2 | 7; 6 terstruktur | 1 | **A** - siap awal; satu dataset multiyear terdeteksi |
| DLHK | Dinas Lingkungan Hidup dan Kehutanan | https://dlhk.kapuaskab.go.id | Host tersedia/terlindungi; direktori lama memakai `dlh` | 7 / 2 | 6; 2 terstruktur | 0 | **B** - konfirmasi URL, tambah PIC, utamakan tabel dibanding PDF |
| DP3APPKB | Dinas P3APPKB | https://dp3appkb.kapuaskab.go.id | Terdaftar; terlindungi 403 | 3 / 1 | 5 XLSX | 0 | **B** - data ada, PIC dan seri periode belum ada |
| DPMD | Dinas Pemberdayaan Masyarakat dan Desa | https://dpmd.kapuaskab.go.id | Terdaftar; terlindungi 403 | 2 / 1 | 3 XLS/XLSX | 0 | **B** - perlu PIC dan kode desa/kecamatan baku |
| DPMPTSP | Dinas Penanaman Modal dan PTSP | https://dpmptsp.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 0 | 0 | **C** - kandidat integrasi perizinan bulanan; dataset dan PIC belum ada |
| DPUPR | Dinas Pekerjaan Umum dan Penataan Ruang | https://dpuprpkp.kapuaskab.go.id | Terdaftar; terlindungi 403 | 6 / 4 | 21; 4 tabel + data spasial | 0 | **B** - sumber paling kaya, tetapi perlu pemetaan format spasial dan PIC |
| DUKCAPIL | Dinas Kependudukan dan Pencatatan Sipil | https://disdukcapil.kapuaskab.go.id | Terdaftar; terlindungi 403 | 0 / 0 | 3 XLS/XLSX | 0 | **C** - data ada tetapi belum terhubung ke indikator/kategori RPJMD |
| INSPEKTORAT | Inspektorat Kabupaten Kapuas | https://inspektorat.kapuaskab.go.id | Terdaftar; terlindungi 403 | 1 / 1 | 0 | 0 | **C** - mapping ada; dataset dan PIC belum ada |
| SATPOLPP | Satuan Polisi Pamong Praja | https://polpp.kapuaskab.go.id | Terdaftar; terlindungi 403 | 0 / 0 | 0 | 0 | **D** - indikator, dataset, dan PIC perlu ditetapkan |
| SETDA | Sekretariat Daerah Kabupaten Kapuas | https://setda.kapuaskab.go.id | Terdaftar; terlindungi 403 | 4 / 3 | 0 | 0 | **C** - mapping ada; tentukan unit pemilik data dan PIC |
| SETWAN | Sekretariat DPRD Kabupaten Kapuas | https://setwan.kapuaskab.go.id | Terdaftar; terlindungi 403 | 0 / 0 | 0 | 0 | **D** - konfirmasi apakah perlu indikator RPJMD atau hanya data pendukung |

## Ringkasan kesiapan

- **A - siap awal:** 2 OPD (DINKES dan DKPP).
- **B - data dan mapping tersedia, PIC belum lengkap:** 16 OPD.
- **C - ada kesenjangan indikator atau dataset:** 8 OPD.
- **D - belum memiliki tiga komponen utama:** 3 OPD.
- Hanya 3 OPD yang saat ini memiliki membership akun aktif/undangan pada organisasi: BAPPERIDA, DINKES, dan DKPP.
- Mayoritas dataset OPD masih berupa snapshot satu tahun. Dataset DINSOS 2021-2023 adalah kandidat paling siap untuk integrasi multiyear terstruktur.

## Tindakan prioritas

1. Konfirmasi nomenklatur dan URL untuk BKAD, DAMKAR, DISBUDPARPORA, DLHK, serta pembagian DPUPR/Disperkimtan.
2. Daftarkan minimal satu PIC aktif untuk setiap OPD.
3. Tetapkan indikator atau peran data untuk DUKCAPIL, DAMKAR, SATPOLPP, dan SETWAN.
4. Minta OPD mengirim format seri waktu baku: periode, kode wilayah, nilai, satuan, sumber, dan tanggal pembaruan.
5. Prioritaskan DINSOS, DINKES, DKPP, DPUPR, dan Disperindagkop UKM sebagai gelombang integrasi pertama.
6. Koordinasikan akses mesin-ke-mesin dengan Diskominfosantik karena seluruh subdomain aktif memakai perlindungan yang mengembalikan HTTP 403 ke pemeriksaan otomatis.

## Sumber pemeriksaan

- Direktori website resmi: https://satudata.kapuaskab.go.id/daftar-website/
- API organisasi/dataset CKAN: https://satudata.kapuaskab.go.id/api/3/action/organization_list?all_fields=true&include_dataset_count=true
- Master organisasi, relasi indikator, kategori, dan membership pengguna SABABUKA produksi (read-only query, 10 Oktober 2026).
