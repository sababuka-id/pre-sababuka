# SABABUKA BERSINAR

SABABUKA BERSINAR adalah rancangan Sistem Analisis Big Data Kabupaten Kapuas. Sistem akan mengumpulkan data dari OPD, menormalisasikannya, menyimpannya pada basis data pusat, lalu menyajikannya melalui Dashboard DIES, WhatsApp Bot khusus Bupati, dan aplikasi Android.

Repository ini masih berada pada tahap fondasi perencanaan. Belum ada teknologi aplikasi yang ditetapkan dan belum ada komponen produksi yang dibangun.

## Prinsip kerja

Keputusan proyek dinilai dengan urutan berikut:

1. Benar dan aman untuk data pemerintah.
2. Sederhana untuk dibangun dan dirawat.
3. Cepat memberikan hasil yang dapat diuji.
4. Hemat biaya pengembangan dan operasional.
5. Memiliki kualitas, dokumentasi, dan jejak audit yang memadai.

## Arsitektur konseptual

```text
Sumber data OPD
      |
      v
Scraper per sumber -> validasi -> normalisasi -> PostgreSQL/PostGIS
                                                    |
                                                    v
                                             Backend API + RBAC
                                              /       |       \
                                             v        v        v
                                      Dashboard   WA Bot   Android wrapper
```

Backend API menjadi jalur data tunggal bagi seluruh kanal. Data mentah, data hasil normalisasi, dan histori perubahan harus dapat ditelusuri.

## Status saat ini

- Dokumen rancang bangun awal telah dipahami.
- Repository belum berisi aplikasi atau data produksi.
- Daftar OPD, URL sumber, indikator, hak akses, dan infrastruktur produksi belum final.
- Tahap berikutnya adalah memilih fondasi teknologi melalui catatan keputusan arsitektur.

## Peta dokumentasi

- [Blueprint teknis](docs/01-blueprint-teknis.md)
- [Ruang lingkup dan asumsi](docs/02-ruang-lingkup-dan-asumsi.md)
- [Backlog fase](docs/03-backlog-fase.md)
- [Kriteria penerimaan](docs/04-kriteria-penerimaan.md)
- [Register risiko](docs/05-register-risiko.md)
- [Kebutuhan data dan akses](docs/06-kebutuhan-data-dan-akses.md)
- [Catatan keputusan](docs/07-catatan-keputusan.md)

## Aturan status pekerjaan

- **Rencana**: belum disetujui untuk dikerjakan.
- **Siap**: input minimum tersedia dan pekerjaan telah disetujui.
- **Berjalan**: sedang dikerjakan.
- **Terblokir**: ada input atau otorisasi yang belum tersedia.
- **Selesai**: bukti uji dan dokumentasi memenuhi kriteria penerimaan.

Sebuah fitur tidak dinyatakan selesai hanya karena tampilannya sudah dapat dibuka.
