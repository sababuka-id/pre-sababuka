# Alur kerja SABABUKA

Dokumen ini menjelaskan alur data dari master indikator sampai Dashboard Pimpinan. Dua paket demo (`DEMO_PRESENTATION` dan `DEMO_PRACTICE`) memakai indikator dan kategori sendiri; objek RPJMD resmi tidak dipakai sebagai transaksi latihan.

## Swimlane per role

| Tahap | Superadmin | BAPPERIDA | OPD pemilik | Kominfo | Pimpinan |
|---|---|---|---|---|---|
| Master kategori | Menyiapkan atau mengelola draf | Meninjau, menyetujui, atau menolak kategori | Melihat bila diberi akses | Melihat | Melihat ringkasan yang relevan |
| Master indikator | Menyiapkan metadata dan mengajukan bila berwenang | Menyetujui definisi perencanaan | Memverifikasi teknis indikator miliknya | Melihat | Melihat indikator aktif |
| Aktivasi indikator | Dapat mengaktifkan | Dapat mengaktifkan | Tidak mengaktifkan | Tidak mengaktifkan | Tidak mengubah |
| Form capaian | Membantu bila diperlukan | Memeriksa lintas OPD | Membuat form per OPD+periode, mengisi realisasi dan bukti, lalu mengirim | Melihat sesuai permission | Tidak mengisi |
| Pemeriksaan capaian | Dapat meninjau dan menyetujui | Memulai review, mengembalikan, atau menyetujui | Memperbaiki form yang dikembalikan | Tidak menyetujui pada RBAC saat ini | Tidak mengubah |
| Publikasi | Dapat menyusun dan mengaktifkan | Dapat menyusun dan mengaktifkan | Tidak mengelola | Saat ini belum memiliki permission publikasi; hanya melihat ringkasan eksekutif | Melihat publikasi aktif |

RBAC saat ini tidak memberi Kominfo `publication.view`, `publication.manage`, atau `publication.activate`; Kominfo memiliki akses submission/dataset dan dashboard eksekutif. Karena itu sistem memperlakukan BAPPERIDA/Superadmin sebagai kurator dan pengaktif publikasi. Perubahan kewenangan Kominfo perlu keputusan desain dan permission baru sebelum diaktifkan.

## State machine

### Kategori

`draft` → `in_review` → `approved` atau `rejected` → `draft` bila perlu diperbaiki.

Kategori harus disetujui BAPPERIDA sebelum indikator di bawahnya diajukan.

### Indikator

`draft` → `in_review` → `opd_verification` → `approved` → `active` → `retired`.

`approved` pada indikator berarti definisi dan verifikasi teknis sudah selesai dan siap diaktifkan. Status ini berbeda dari status form capaian.

### Form capaian OPD

`draft` → `submitted` → `under_review` → `approved` atau `returned` → `submitted`.

`Capaian disetujui` berarti BAPPERIDA menyetujui realisasi dan bukti dukung pada form OPD untuk periode tersebut. Itu tidak mengubah status kategori atau indikator.

### Publikasi

Publikasi dibuat sebagai `draft`, hanya boleh memilih observasi dari form capaian `approved`, lalu menjadi `active` setelah pengguna dengan `publication.activate` mengaktifkannya. Dashboard Pimpinan hanya mengambil publikasi aktif.

## Notifikasi dan reset demo

Notifikasi menyimpan entity polymorphic dan bersifat sementara. Saat target sudah dihapus atau di-reset, notifikasi dibersihkan oleh repair idempoten. Riwayat `audit_events` dan workflow append-only tidak ikut dihapus. Jika pengguna membuka tautan lama, aplikasi menandai notifikasi dibaca dan menampilkan bahwa data sudah di-reset atau tidak tersedia, lalu kembali ke daftar yang sesuai.
