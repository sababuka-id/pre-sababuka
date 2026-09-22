# Register Risiko Awal

Skala: peluang dan dampak dinilai Rendah, Sedang, atau Tinggi. Pemilik final ditetapkan setelah struktur tata kelola disepakati.

| ID | Risiko | Peluang | Dampak | Mitigasi awal |
|---|---|---:|---:|---|
| R-01 | URL atau struktur situs OPD berubah | Tinggi | Tinggi | Konektor modular, contract test, alert, dokumentasi sumber |
| R-02 | Data antar-OPD bertentangan | Tinggi | Tinggi | Kamus data, sumber berwenang, status validasi, audit trail |
| R-03 | Definisi indikator belum disepakati | Tinggi | Tinggi | Persetujuan pemilik data sebelum publikasi |
| R-04 | Data pribadi terkumpul berlebihan | Sedang | Tinggi | Klasifikasi, minimisasi, dasar pemrosesan, kontrol akses |
| R-05 | Scraping melanggar ketentuan atau membebani situs | Sedang | Tinggi | Izin, rate limit, jadwal, prioritaskan API/unduhan resmi |
| R-06 | Kredensial bocor ke kode/log | Sedang | Tinggi | Secret management, scanning, redaksi log, rotasi |
| R-07 | Hak akses salah konfigurasi | Sedang | Tinggi | Deny-by-default, matriks RBAC, uji otorisasi otomatis |
| R-08 | AI memberikan jawaban salah | Tinggi | Tinggi | Retrieval dari API, sumber/periode, guardrail, fallback manusia |
| R-09 | Ketergantungan Fonnte/Claude terganggu atau mahal | Sedang | Sedang | Adapter layanan, batas penggunaan, fallback dan monitoring biaya |
| R-10 | Server Pemkab tidak mencukupi | Sedang | Tinggi | Audit kapasitas, uji beban, opsi deployment bertahap |
| R-11 | Tidak ada PIC operasi setelah serah terima | Sedang | Tinggi | Penunjukan PIC, runbook, pelatihan, masa pendampingan |
| R-12 | Backup tersedia tetapi tidak dapat dipulihkan | Sedang | Tinggi | Uji restore berkala dan bukti hasil |
| R-13 | Prototype dianggap data resmi | Sedang | Tinggi | Label data contoh, lingkungan terpisah, persetujuan publikasi |
| R-14 | Ruang lingkup membesar tanpa kontrol | Tinggi | Sedang | Backlog prioritas, change log, persetujuan dampak |
| R-15 | Ketergantungan pada satu pengembang | Tinggi | Tinggi | Dokumentasi, review, CI, runbook, transfer pengetahuan |

Register ini ditinjau pada akhir setiap fase dan sebelum rilis.
