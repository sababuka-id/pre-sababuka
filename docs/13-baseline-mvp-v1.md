# Baseline Spesifikasi MVP v1

Status: dikunci untuk implementasi awal  
Tanggal: 2026-09-29  
Pemilik keputusan: Superadmin SABABUKA

## 1. Tujuan baseline

Dokumen ini menjadi batas resmi pembangunan MVP SABABUKA Bersinar. Perubahan setelah tanggal penguncian harus dicatat pada catatan keputusan, changelog API, dan migration database bila berdampak pada kontrak data.

## 2. Ruang lingkup yang dikunci

- Satu aplikasi web dengan satu mekanisme login.
- Ruang kerja berdasarkan role: Superadmin, BAPPERIDA, Kominfo, OPD, dan Pimpinan.
- Menu dinamis berdasarkan role, permission, lingkup organisasi, dan feature flag.
- Struktur OPD, fokus kebijakan, kategori, indikator, penanggung jawab, target, sumber, dan profil metadata bersifat dinamis.
- Metadata inti kompatibel dengan pola CKAN/Satu Data Kapuas, dengan metadata tambahan melalui JSONB tervalidasi.
- Input data melalui formulir manual, CSV/XLSX, dan satu jalur impor CKAN pada pilot.
- Workflow tetap: draft, validasi, konfirmasi OPD, review BAPPERIDA, persetujuan, dan publikasi.
- Koreksi menghasilkan revisi baru; data terbit tidak ditimpa.
- Dashboard dan Asisten AI hanya membaca publikasi aktif.
- Jawaban AI wajib dapat ditelusuri ke indikator, periode, OPD, dataset, dan item publikasi.
- Audit diterapkan pada autentikasi, konfigurasi, perubahan data, workflow, publikasi, dan penggunaan AI.

## 3. Di luar MVP

- Workflow builder bebas.
- Integrasi seluruh sistem OPD sekaligus.
- Publikasi balik otomatis ke CKAN.
- WhatsApp bot dan aplikasi Android.
- Portal publik penuh.
- Prediksi lanjutan dan analitik preskriptif.
- Vector database sebagai ketergantungan awal Asisten AI.

## 4. Prinsip kewenangan

- Superadmin mengendalikan konfigurasi sistem, akses, menu, integrasi, dan intervensi darurat.
- BAPPERIDA mengelola substansi fokus, kategori, indikator, target, review, dan kelayakan tayang.
- OPD bertanggung jawab atas kebenaran data sektoral dan konfirmasi internal.
- Kominfo mengelola kesehatan teknis dan integrasi sesuai permission.
- Pimpinan memperoleh akses baca ke data aktif dan Asisten AI.
- Penyembunyian menu bukan kontrol keamanan; backend selalu memeriksa permission dan scope.

## 5. Aturan perubahan

Baseline dapat berubah, tetapi tidak secara diam-diam. Perubahan material wajib memiliki:

1. alasan dan pemilik keputusan;
2. dampak terhadap API, database, UI, keamanan, dan dokumen;
3. strategi kompatibilitas atau migrasi;
4. nomor versi dan tanggal berlaku;
5. persetujuan sebelum diterapkan pada produksi.

## 6. Gerbang implementasi

Backend dapat mulai dibangun setelah tersedia:

- matriks permission;
- transition workflow;
- spesifikasi OpenAPI v1;
- migration PostgreSQL;
- data seed role, permission, dan menu;
- bukti validasi migration pada PostgreSQL yang setara dengan server tujuan.
