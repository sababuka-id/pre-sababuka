BEGIN;

WITH directory(code, name, short_name, organization_type, source_order) AS (
    VALUES
        ('SETDA', 'Sekretariat Daerah Kabupaten Kapuas', 'Setda', 'opd', 1),
        ('INSPEKTORAT', 'Inspektorat Kabupaten Kapuas', 'Inspektorat', 'opd', 2),
        ('BAPPERIDA', 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah', 'Bapperida', 'opd', 3),
        ('SETWAN', 'Sekretariat DPRD Kabupaten Kapuas', 'Sekretariat DPRD', 'opd', 4),
        ('DISDIK', 'Dinas Pendidikan', 'Disdik', 'opd', 5),
        ('DINKES', 'Dinas Kesehatan', 'Dinkes', 'opd', 6),
        ('DPUPR', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Dinas PUPR', 'opd', 7),
        ('DISPERKIMTAN', 'Dinas Perumahan, Kawasan Permukiman dan Pertanahan', 'Disperkimtan', 'opd', 8),
        ('DLHK', 'Dinas Lingkungan Hidup dan Kehutanan', 'DLHK', 'opd', 9),
        ('DPMD', 'Dinas Pemberdayaan Masyarakat dan Desa', 'DPMD', 'opd', 10),
        ('DP3APPKB', 'Dinas Pemberdayaan Perempuan, Perlindungan Anak, Pengendalian Penduduk dan Keluarga Berencana', 'DP3APPKB', 'opd', 11),
        ('DKPP', 'Dinas Ketahanan Pangan dan Perikanan', 'DKPP', 'opd', 12),
        ('DINSOS', 'Dinas Sosial', 'Dinsos', 'opd', 13),
        ('DISPERINDAGKOPUKM', 'Dinas Perdagangan, Perindustrian, Koperasi dan Usaha Kecil Menengah', 'Disperindagkop UKM', 'opd', 14),
        ('DISNAKERTRANS', 'Dinas Transmigrasi dan Tenaga Kerja', 'Disnakertrans', 'opd', 15),
        ('DISTAN', 'Dinas Pertanian', 'Distan', 'opd', 16),
        ('DPMPTSP', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'DPMPTSP', 'opd', 17),
        ('BAPENDA', 'Badan Pendapatan Daerah', 'Bapenda', 'opd', 18),
        ('BKPSDM', 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia', 'BKPSDM', 'opd', 19),
        ('BKAD', 'Badan Keuangan dan Aset Daerah', 'BKAD', 'opd', 20),
        ('DISHUB', 'Dinas Perhubungan', 'Dishub', 'opd', 21),
        ('DISARPUS', 'Dinas Kearsipan dan Perpustakaan', 'Disarpus', 'opd', 22),
        ('BPBD', 'Badan Penanggulangan Bencana Daerah', 'BPBD', 'opd', 23),
        ('DAMKAR', 'Dinas Pemadam Kebakaran dan Penyelamatan', 'Damkar', 'opd', 24),
        ('SATPOLPP', 'Satuan Polisi Pamong Praja', 'Satpol PP', 'opd', 25),
        ('DISKOMINFOSANTIK', 'Dinas Komunikasi, Informatika, Persandian dan Statistik', 'Diskominfosantik', 'opd', 26),
        ('DUKCAPIL', 'Dinas Kependudukan dan Pencatatan Sipil', 'Dukcapil', 'opd', 27),
        ('BAKESBANGPOL', 'Badan Kesatuan Bangsa dan Politik', 'Bakesbangpol', 'opd', 28),
        ('KEC_SELAT', 'Kecamatan Selat', 'Selat', 'district', 29),
        ('KEC_KAPUAS_HILIR', 'Kecamatan Kapuas Hilir', 'Kapuas Hilir', 'district', 30),
        ('KEC_KAPUAS_BARAT', 'Kecamatan Kapuas Barat', 'Kapuas Barat', 'district', 31),
        ('KEC_BASARANG', 'Kecamatan Basarang', 'Basarang', 'district', 32),
        ('KEC_KAPUAS_TIMUR', 'Kecamatan Kapuas Timur', 'Kapuas Timur', 'district', 33),
        ('KEC_PULAU_PETAK', 'Kecamatan Pulau Petak', 'Pulau Petak', 'district', 34),
        ('KEC_KAPUAS_KUALA', 'Kecamatan Kapuas Kuala', 'Kapuas Kuala', 'district', 35),
        ('KEC_MANTANGAI', 'Kecamatan Mantangai', 'Mantangai', 'district', 36),
        ('KEC_KAPUAS_MURUNG', 'Kecamatan Kapuas Murung', 'Kapuas Murung', 'district', 37),
        ('KEC_BATAGUH', 'Kecamatan Bataguh', 'Bataguh', 'district', 38),
        ('KEC_TAMBAN_CATUR', 'Kecamatan Tamban Catur', 'Tamban Catur', 'district', 39),
        ('KEC_DADAHUP', 'Kecamatan Dadahup', 'Dadahup', 'district', 40),
        ('KEC_KAPUAS_TENGAH', 'Kecamatan Kapuas Tengah', 'Kapuas Tengah', 'district', 41),
        ('KEC_TIMPAH', 'Kecamatan Timpah', 'Timpah', 'district', 42),
        ('KEC_KAPUAS_HULU', 'Kecamatan Kapuas Hulu', 'Kapuas Hulu', 'district', 43),
        ('KEC_PASAK_TALAWANG', 'Kecamatan Pasak Talawang', 'Pasak Talawang', 'district', 44),
        ('KEC_MANDAU_TALAWANG', 'Kecamatan Mandau Talawang', 'Mandau Talawang', 'district', 45)
)
INSERT INTO sababuka.organizations (code, name, short_name, organization_type, metadata)
SELECT code, name, short_name, organization_type,
       jsonb_build_object('directory', 'lampiran_skpd_camat_2026', 'source_order', source_order)
FROM directory
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    organization_type = EXCLUDED.organization_type,
    metadata = sababuka.organizations.metadata || EXCLUDED.metadata,
    is_active = true,
    archived_at = NULL,
    updated_at = now();

UPDATE sababuka.organizations child
SET parent_id = parent.id, updated_at = now()
FROM sababuka.organizations parent
WHERE child.code = 'SETDA_EKO' AND parent.code = 'SETDA';

UPDATE sababuka.organizations child
SET parent_id = parent.id, updated_at = now()
FROM sababuka.organizations parent
WHERE child.organization_type = 'district' AND parent.code = 'KECAMATAN';

COMMIT;
