# Audit Scope Demo SABABUKA

Tanggal audit: 23 September 2026

## Prinsip penilaian

Setiap fitur harus memenuhi sedikitnya satu tujuan berikut:

1. Menunjukkan manfaat integrasi lintas sistem.
2. Memperjelas sumber dan pemilik data.
3. Menunjukkan adanya pemeriksaan sebelum data digunakan.
4. Membantu pimpinan memahami konteks tanpa menggantikan kewenangan manusia.

Fitur yang menciptakan klaim berlebihan, kompetisi antarlembaga, atau beban implementasi sebelum kebutuhan disepakati harus disembunyikan dari demo awal atau dipindahkan ke roadmap.

## Keputusan fitur

| Fitur | Keputusan demo | Urgensi dan alasan |
|---|---|---|
| Ringkasan Pimpinan | Pertahankan | Menjadi bukti utama bahwa data lintas sumber dapat disederhanakan menjadi bahan pembahasan. Wajib diberi label data demonstrasi. |
| Bahan Analisis | Pertahankan dengan bahasa netral | Menunjukkan nilai tambah integrasi. Harus disebut bahan diskusi, bukan rekomendasi otomatis atau keputusan sistem. |
| Sumber dan provenance | Pertahankan sebagai fitur inti | Mengurangi sengketa angka karena sumber, periode, produsen, dan versi tetap terlihat. |
| Simulasi gerbang verifikasi | Pertahankan sebagai fitur inti | Menunjukkan bahwa data tidak langsung masuk ke pimpinan. Workflow final harus diputuskan oleh pemerintah daerah. |
| Mode presentasi dan ekspor brief | Pertahankan | Bernilai langsung untuk rapat dan mudah dipahami tanpa menambah kompleksitas tata kelola. |
| CKAN Satu Data | Pertahankan sebatas metadata | Membuktikan konektivitas katalog. Jangan menyatakan nilai indikator sudah terintegrasi. |
| Rujukan BPS | Pertahankan | Menguatkan sumber statistik resmi. Penarikan otomatis baru diaktifkan setelah token dan pemetaan indikator tersedia. |
| Capaian target OPD | Tampilkan tanpa ranking | Setiap OPD dibandingkan dengan target resminya sendiri. Status digunakan untuk membuka kebutuhan dukungan dan koordinasi, bukan membandingkan kinerja antar-OPD. Target serta ambang harus dikonfirmasi bersama. |
| Profil wilayah dan peta indikator | Tampilkan | Batas geografis 17 kecamatan ditampilkan sebagai peta tematik. Pengguna dapat mengganti indikator, melihat perubahan warna wilayah, dan membuka profil kecamatan. |
| Keuangan daerah | Tampilkan sebagai bahan diskusi metode | Kebutuhan telah disampaikan dalam diskusi awal BAPPERIDA. Nilai demo tidak boleh dibaca sebagai posisi resmi; rincian per OPD ditahan sampai sumber, definisi, hak akses, dan otorisasi BPKAD/Bapenda disepakati. |
| Pelayanan publik | Tampilkan sebagai bahan diskusi metode | Kebutuhan telah disampaikan dalam diskusi awal BAPPERIDA. Demo harus membantu memilih layanan prioritas serta menyepakati definisi selesai, SLA, kepuasan, pengaduan, dan sumber data. |
| Pusat peringatan | Tampilkan dengan validasi berjenjang | Peringatan baru masuk lebih dahulu ke BAPPERIDA, dikonfirmasi kepada OPD, lalu hanya isu tervalidasi yang dapat dieskalasikan ke Ringkasan Pimpinan. |
| Asisten Data | Tampilkan dengan grounding ketat | Jawaban hanya boleh menggunakan data dan metadata yang tersedia dalam SABABUKA. Jika data tidak tersedia, asisten harus menyatakan keterbatasan dan tidak membuat asumsi. |
| Sinkronisasi semua sumber | Jangan diklaim produksi | Tombol demo tidak boleh memberi kesan seluruh sumber benar-benar tersinkron. |
| Skor kepercayaan 83% | Hapus sebagai klaim kualitas | Belum memiliki metodologi yang disepakati. Diganti menjadi cakupan pemeriksaan demo `10/12`. |
| Label “terverifikasi BAPPERIDA” | Hapus dari demo | Belum ada mandat atau persetujuan nyata. Diganti menjadi “lolos simulasi” dan “usulan alur verifikasi”. |

## Scope aman untuk rapat awal

Alur presentasi dibagi menjadi dua ruang peran yang saling terhubung:

1. Ruang Bupati: Ringkasan Pimpinan, Bahan Analisis, Asisten Data, Peta Sebaran Indikator, Keuangan, Pelayanan, dan Jejak Sumber.
2. Ruang BAPPERIDA: Dashboard koordinasi, Verifikasi Data, Pusat Peringatan, Peta Sebaran Indikator, Capaian Target OPD, Keuangan, Pelayanan, Asisten Data, Sumber Integrasi, dan pratinjau Ringkasan Pimpinan.

Pemisahan menu menjaga agar pimpinan menerima informasi ringkas dan baca-saja, sementara tindakan verifikasi, klarifikasi, dan eskalasi berada pada ruang kerja BAPPERIDA.

Halaman lain tetap berada dalam kode sebagai eksperimen internal dan bahan roadmap, tetapi tidak ditampilkan pada navigasi rapat.

## Syarat sebelum naik dari demo ke pilot

- PIC dan pemilik setiap indikator ditetapkan.
- Kamus indikator, satuan, periode, wilayah, dan metode disepakati.
- Jalur koreksi dan persetujuan data ditetapkan.
- Klasifikasi akses dan perlindungan data disepakati.
- Infrastruktur serta kontrol keamanan direviu Diskominfosantik.
- Angka resmi dipisahkan dari data demonstrasi.
- Formula status, target, prioritas, dan alert disahkan pemilik kebijakan.
- Histori perubahan dan audit trail disimpan permanen.

## Kesimpulan

SABABUKA dipresentasikan sebagai **trigger untuk menyepakati tata kelola dan pilot integrasi**, bukan sistem final. Nilai demo terletak pada kemampuan memperlihatkan masa depan yang dapat dicapai bersama, sekaligus menunjukkan bahwa kewenangan, data sumber, dan keputusan tetap berada pada institusi pemerintah.
