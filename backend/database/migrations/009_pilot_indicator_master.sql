BEGIN;

ALTER TABLE sababuka.indicator_versions
    ADD COLUMN direction varchar(16),
    ADD COLUMN source_reference text;

ALTER TABLE sababuka.indicator_versions
    ADD CONSTRAINT indicator_versions_direction_check
    CHECK (direction IS NULL OR direction IN ('increase', 'decrease', 'maintain'));

INSERT INTO sababuka.organizations (code, name, short_name, organization_type)
VALUES
    ('BAPPERIDA', 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah', 'Bapperida', 'opd'),
    ('DKPP', 'Dinas Ketahanan Pangan dan Perikanan', 'DKPP', 'opd'),
    ('DISTAN', 'Dinas Pertanian', 'Distan', 'opd'),
    ('DPMPTSP', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'DPMPTSP', 'opd'),
    ('DISPERINDAGKOPUKM', 'Dinas Perdagangan, Perindustrian, Koperasi dan UKM', 'Disperindagkop-UKM', 'opd'),
    ('DPMD', 'Dinas Pemberdayaan Masyarakat dan Desa', 'DPMD', 'opd'),
    ('DINSOS', 'Dinas Sosial', 'Dinsos', 'opd'),
    ('DINKES', 'Dinas Kesehatan', 'Dinkes', 'opd'),
    ('DISDIK', 'Dinas Pendidikan', 'Disdik', 'opd'),
    ('DISHUB', 'Dinas Perhubungan', 'Dishub', 'opd'),
    ('DPUPR', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Dinas PUPR', 'opd'),
    ('SETDA_EKO', 'Sekretariat Daerah - Bagian Perekonomian', 'Bagian Perekonomian', 'work_unit'),
    ('KECAMATAN', 'Perwakilan Kecamatan Kabupaten Kapuas', 'Kecamatan', 'organization_group'),
    ('DISNAKERTRANS', 'Dinas Tenaga Kerja dan Transmigrasi', 'Disnakertrans', 'opd'),
    ('DP3APPKB', 'Dinas P3APPKB', 'DP3APPKB', 'opd'),
    ('DISPERKIMTAN', 'Dinas Perumahan, Kawasan Permukiman dan Pertanahan', 'Disperkimtan', 'opd'),
    ('DISARPUS', 'Dinas Kearsipan dan Perpustakaan', 'Disarpus', 'opd'),
    ('PERUMDA_AIR', 'Perumda Air Minum Kabupaten Kapuas', 'Perumda Air Minum', 'regional_enterprise'),
    ('DLHK', 'Dinas Lingkungan Hidup dan Kehutanan', 'DLHK', 'opd')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sababuka.policy_focuses (code, name, description, display_order)
VALUES ('PILOT_ANTARA', 'Indikator Pilot Laporan Antara',
        'Kelompok sampel untuk pengujian struktur metadata dan alur SABABUKA; memerlukan validasi Bapperida dan OPD.', 10)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO sababuka.categories (code, name, description, policy_focus_id, display_order)
SELECT v.code, v.name, v.description, pf.id, v.display_order
FROM sababuka.policy_focuses pf
CROSS JOIN (VALUES
    ('PANGAN_AGRO', 'Ketahanan pangan dan agro-perikanan', 'Ketahanan pangan, pola pangan, dan kontribusi subsektor pertanian.', 10),
    ('INVESTASI_INDUSTRI', 'Investasi dan industri daerah', 'Investasi, industri pengolahan, dan pertumbuhan ekonomi daerah.', 20),
    ('DESA_EKONOMI', 'Desa dan ekonomi rakyat', 'Kemajuan desa, desa mandiri, dan kewirausahaan daerah.', 30),
    ('SDM_SEJAHTERA', 'SDM berkualitas dan sejahtera', 'Kemiskinan, kesehatan, dan kualitas pendidikan dasar.', 40),
    ('KONEKTIVITAS_LAYANAN', 'Konektivitas dan layanan dasar', 'Konektivitas wilayah, air minum, dan sanitasi.', 50)
) AS v(code, name, description, display_order)
WHERE pf.code = 'PILOT_ANTARA'
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description,
    policy_focus_id = EXCLUDED.policy_focus_id, display_order = EXCLUDED.display_order;

INSERT INTO sababuka.units (code, name, symbol, decimal_places)
VALUES
    ('INDEX', 'Indeks', NULL, 4),
    ('SCORE', 'Skor', NULL, 2),
    ('PERCENT', 'Persen', '%', 2),
    ('IDR', 'Rupiah', 'Rp', 2)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, decimal_places = EXCLUDED.decimal_places, is_active = true;

INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
VALUES
    ('annual', '2025', 'Tahun 2025', DATE '2025-01-01', DATE '2025-12-31'),
    ('annual', '2026', 'Tahun 2026', DATE '2026-01-01', DATE '2026-12-31'),
    ('annual', '2027', 'Tahun 2027', DATE '2027-01-01', DATE '2027-12-31'),
    ('annual', '2028', 'Tahun 2028', DATE '2028-01-01', DATE '2028-12-31'),
    ('annual', '2029', 'Tahun 2029', DATE '2029-01-01', DATE '2029-12-31')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sababuka.indicators (code, name, category_id, owner_organization_id)
SELECT v.code, v.name, c.id, o.id
FROM (VALUES
    ('IKP', 'Indeks Ketahanan Pangan (IKP)', 'PANGAN_AGRO', 'DKPP'),
    ('PPH_KETERSEDIAAN', 'Skor Pola Pangan Harapan (PPH) Ketersediaan', 'PANGAN_AGRO', 'DKPP'),
    ('RASIO_PDRB_PERTANIAN', 'Rasio PDRB Subsektor Pertanian', 'PANGAN_AGRO', 'DISTAN'),
    ('NILAI_INVESTASI', 'Jumlah nilai investasi berskala nasional (PMDN/PMA)', 'INVESTASI_INDUSTRI', 'DPMPTSP'),
    ('KONTRIBUSI_INDUSTRI', 'Kontribusi PDRB Industri Pengolahan', 'INVESTASI_INDUSTRI', 'DISPERINDAGKOPUKM'),
    ('PERTUMBUHAN_PDRB_KAPITA', 'Laju Pertumbuhan Ekonomi PDRB per Kapita', 'INVESTASI_INDUSTRI', 'BAPPERIDA'),
    ('INDEKS_DESA', 'Indeks Desa', 'DESA_EKONOMI', 'DPMD'),
    ('DESA_MANDIRI', 'Persentase Desa Mandiri', 'DESA_EKONOMI', 'DPMD'),
    ('RASIO_KEWIRAUSAHAAN', 'Rasio Kewirausahaan Daerah', 'DESA_EKONOMI', 'DISPERINDAGKOPUKM'),
    ('TINGKAT_KEMISKINAN', 'Tingkat Kemiskinan', 'SDM_SEJAHTERA', 'DINSOS'),
    ('PREVALENSI_STUNTING', 'Prevalensi Stunting (pendek dan sangat pendek)', 'SDM_SEJAHTERA', 'DINKES'),
    ('LITERASI_DASAR', 'Kemampuan Literasi Pendidikan Dasar', 'SDM_SEJAHTERA', 'DISDIK'),
    ('INDEKS_KONEKTIVITAS', 'Indeks Konektivitas Wilayah', 'KONEKTIVITAS_LAYANAN', 'DISHUB'),
    ('AKSES_AIR_MINUM', 'Persentase penduduk berakses air minum', 'KONEKTIVITAS_LAYANAN', 'DPUPR'),
    ('RUMAH_BERSANITASI', 'Persentase rumah tinggal bersanitasi', 'KONEKTIVITAS_LAYANAN', 'DPUPR')
) AS v(code, name, category_code, owner_code)
JOIN sababuka.categories c ON c.code = v.category_code
JOIN sababuka.organizations o ON o.code = v.owner_code
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, owner_organization_id = EXCLUDED.owner_organization_id;

INSERT INTO sababuka.indicator_versions
    (indicator_id, version_number, definition, formula, unit_id, frequency, data_type,
     direction, source_reference, access_level, effective_from, status, change_notes)
SELECT i.id, 1, v.definition, NULL, u.id, 'annual', v.data_type, v.direction,
       v.source_reference, 'internal', DATE '2025-01-01', 'draft',
       'Data sampel laporan antara. Definisi, rumus, sumber, target, dan pemetaan OPD wajib divalidasi sebelum aktivasi.'
FROM (VALUES
    ('IKP', 'Ukuran komposit kondisi ketahanan pangan wilayah sesuai metodologi instansi penerbit.', 'INDEX', 'number', 'increase', 'Badan Pangan Nasional (rilis IKP)'),
    ('PPH_KETERSEDIAAN', 'Susunan ketersediaan pangan yang beragam berdasarkan proporsi keseimbangan energi.', 'SCORE', 'number', 'increase', 'DKPP (Neraca Bahan Makanan)'),
    ('RASIO_PDRB_PERTANIAN', 'Persentase kontribusi subsektor pertanian terhadap PDRB Kabupaten Kapuas.', 'PERCENT', 'percentage', 'increase', 'BPS (PDRB lapangan usaha)'),
    ('NILAI_INVESTASI', 'Total nilai realisasi investasi PMDN dan PMA berskala nasional.', 'IDR', 'currency', 'increase', 'Kementerian Investasi/BKPM (LKPM, OSS)'),
    ('KONTRIBUSI_INDUSTRI', 'Persentase kontribusi lapangan usaha industri pengolahan terhadap PDRB.', 'PERCENT', 'percentage', 'increase', 'BPS (PDRB lapangan usaha)'),
    ('PERTUMBUHAN_PDRB_KAPITA', 'Laju pertumbuhan ekonomi yang direpresentasikan melalui PDRB per kapita.', 'PERCENT', 'percentage', 'increase', 'BPS'),
    ('INDEKS_DESA', 'Indeks komposit yang menggambarkan tingkat kemajuan dan kemandirian desa.', 'INDEX', 'number', 'increase', 'Kementerian Desa PDT (Indeks Desa)'),
    ('DESA_MANDIRI', 'Persentase desa dengan klasifikasi mandiri dibandingkan seluruh desa.', 'PERCENT', 'percentage', 'increase', 'Kementerian Desa PDT (Indeks Desa)'),
    ('RASIO_KEWIRAUSAHAAN', 'Persentase penduduk atau angkatan kerja yang berwirausaha sesuai definisi sumber resmi.', 'PERCENT', 'percentage', 'increase', 'BPS (Sakernas) / data Disperindagkop-UKM'),
    ('TINGKAT_KEMISKINAN', 'Persentase penduduk yang berada di bawah garis kemiskinan.', 'PERCENT', 'percentage', 'decrease', 'BPS (Susenas)'),
    ('PREVALENSI_STUNTING', 'Persentase balita dengan kondisi pendek dan sangat pendek menurut standar yang berlaku.', 'PERCENT', 'percentage', 'decrease', 'Kemenkes (SSGI/SKI) / e-PPGBM'),
    ('LITERASI_DASAR', 'Persentase kemampuan literasi peserta didik pada jenjang pendidikan dasar.', 'PERCENT', 'percentage', 'increase', 'Kemendikdasmen (Rapor Pendidikan/Asesmen Nasional)'),
    ('INDEKS_KONEKTIVITAS', 'Indeks yang menggambarkan tingkat keterhubungan antarwilayah; metode perlu ditetapkan.', 'INDEX', 'number', 'increase', 'Dishub/Bapperida (metode perlu dipastikan)'),
    ('AKSES_AIR_MINUM', 'Persentase penduduk yang memiliki akses terhadap layanan air minum.', 'PERCENT', 'percentage', 'increase', 'BPS (Susenas) / Dinas PUPR'),
    ('RUMAH_BERSANITASI', 'Persentase rumah tinggal yang memiliki akses sanitasi sesuai definisi resmi.', 'PERCENT', 'percentage', 'increase', 'BPS (Susenas) / Dinas PUPR')
) AS v(indicator_code, definition, unit_code, data_type, direction, source_reference)
JOIN sababuka.indicators i ON i.code = v.indicator_code
JOIN sababuka.units u ON u.code = v.unit_code
WHERE NOT EXISTS (SELECT 1 FROM sababuka.indicator_versions iv WHERE iv.indicator_id = i.id);

INSERT INTO sababuka.indicator_organizations (indicator_version_id, organization_id, responsibility, is_primary)
SELECT iv.id, o.id, v.responsibility, v.is_primary
FROM (VALUES
    ('IKP','DKPP','primary_producer',true), ('IKP','DISTAN','supporter',false), ('IKP','DISPERINDAGKOPUKM','supporter',false),
    ('PPH_KETERSEDIAAN','DKPP','primary_producer',true), ('PPH_KETERSEDIAAN','DISTAN','supporter',false),
    ('RASIO_PDRB_PERTANIAN','DISTAN','primary_producer',true), ('RASIO_PDRB_PERTANIAN','DKPP','supporter',false), ('RASIO_PDRB_PERTANIAN','BAPPERIDA','curator',false),
    ('NILAI_INVESTASI','DPMPTSP','primary_producer',true), ('NILAI_INVESTASI','DISPERINDAGKOPUKM','supporter',false), ('NILAI_INVESTASI','SETDA_EKO','supporter',false),
    ('KONTRIBUSI_INDUSTRI','DISPERINDAGKOPUKM','primary_producer',true), ('KONTRIBUSI_INDUSTRI','DPMPTSP','supporter',false), ('KONTRIBUSI_INDUSTRI','BAPPERIDA','curator',false),
    ('PERTUMBUHAN_PDRB_KAPITA','BAPPERIDA','primary_producer',true), ('PERTUMBUHAN_PDRB_KAPITA','SETDA_EKO','supporter',false),
    ('INDEKS_DESA','DPMD','primary_producer',true), ('INDEKS_DESA','KECAMATAN','supporter',false), ('INDEKS_DESA','BAPPERIDA','curator',false),
    ('DESA_MANDIRI','DPMD','primary_producer',true), ('DESA_MANDIRI','KECAMATAN','supporter',false), ('DESA_MANDIRI','BAPPERIDA','curator',false),
    ('RASIO_KEWIRAUSAHAAN','DISPERINDAGKOPUKM','primary_producer',true), ('RASIO_KEWIRAUSAHAAN','DISNAKERTRANS','supporter',false),
    ('TINGKAT_KEMISKINAN','DINSOS','primary_producer',true), ('TINGKAT_KEMISKINAN','BAPPERIDA','curator',false), ('TINGKAT_KEMISKINAN','DPMD','supporter',false), ('TINGKAT_KEMISKINAN','DISNAKERTRANS','supporter',false),
    ('PREVALENSI_STUNTING','DINKES','primary_producer',true), ('PREVALENSI_STUNTING','DP3APPKB','supporter',false), ('PREVALENSI_STUNTING','BAPPERIDA','curator',false), ('PREVALENSI_STUNTING','DKPP','supporter',false), ('PREVALENSI_STUNTING','DPUPR','supporter',false), ('PREVALENSI_STUNTING','DISPERKIMTAN','supporter',false), ('PREVALENSI_STUNTING','DPMD','supporter',false),
    ('LITERASI_DASAR','DISDIK','primary_producer',true), ('LITERASI_DASAR','DISARPUS','supporter',false),
    ('INDEKS_KONEKTIVITAS','DISHUB','primary_producer',true), ('INDEKS_KONEKTIVITAS','DPUPR','supporter',false),
    ('AKSES_AIR_MINUM','DPUPR','primary_producer',true), ('AKSES_AIR_MINUM','PERUMDA_AIR','supporter',false), ('AKSES_AIR_MINUM','DINKES','supporter',false),
    ('RUMAH_BERSANITASI','DPUPR','primary_producer',true), ('RUMAH_BERSANITASI','DISPERKIMTAN','supporter',false), ('RUMAH_BERSANITASI','DINKES','supporter',false), ('RUMAH_BERSANITASI','DLHK','supporter',false)
) AS v(indicator_code, organization_code, responsibility, is_primary)
JOIN sababuka.indicators i ON i.code = v.indicator_code
JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
JOIN sababuka.organizations o ON o.code = v.organization_code
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.targets (indicator_version_id, period_id, numeric_value, notes)
SELECT iv.id, p.id, v.target_value,
       'Target draft pilot berdasarkan bahan laporan antara; wajib divalidasi sebelum indikator diaktifkan.'
FROM (VALUES
    ('IKP',83.49,84.32,85.16,86.02,86.88),
    ('PPH_KETERSEDIAAN',88.78,90.56,92.37,94.21,96.10),
    ('RASIO_PDRB_PERTANIAN',24.69,24.89,25.09,25.29,25.49),
    ('NILAI_INVESTASI',1608057928154.29,1704541404843.55,1806814889134.16,1915223782482.21,2030137209431.14),
    ('KONTRIBUSI_INDUSTRI',14.57,15.20,15.82,16.45,17.14),
    ('PERTUMBUHAN_PDRB_KAPITA',5.20,5.50,5.70,5.80,6.00),
    ('INDEKS_DESA',0.7048,0.7255,0.7462,0.7669,0.7876),
    ('DESA_MANDIRI',12.15,12.62,13.08,13.55,14.02),
    ('RASIO_KEWIRAUSAHAAN',4.50,4.63,4.75,4.88,5.00),
    ('TINGKAT_KEMISKINAN',5.00,4.88,4.76,4.63,4.50),
    ('PREVALENSI_STUNTING',19.20,18.50,17.60,15.90,14.20),
    ('LITERASI_DASAR',59.97,61.77,63.57,65.37,67.17),
    ('INDEKS_KONEKTIVITAS',65.00,66.00,67.00,68.00,69.00),
    ('AKSES_AIR_MINUM',41.00,44.00,47.00,50.00,53.00),
    ('RUMAH_BERSANITASI',67.90,70.00,72.00,74.00,76.00)
) AS x(indicator_code, y2025, y2026, y2027, y2028, y2029)
CROSS JOIN LATERAL (VALUES
    ('2025', x.y2025), ('2026', x.y2026), ('2027', x.y2027), ('2028', x.y2028), ('2029', x.y2029)
) AS v(period_code, target_value)
JOIN sababuka.indicators i ON i.code = x.indicator_code
JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
JOIN sababuka.periods p ON p.code = v.period_code
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('009', 'pilot indicator master, metadata, organizations, and annual targets')
ON CONFLICT (version) DO NOTHING;

COMMIT;
