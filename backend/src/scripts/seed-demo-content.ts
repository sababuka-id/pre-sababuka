import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
if (config.nodeEnv !== "development") throw new Error("Konten demo hanya boleh dibuat pada NODE_ENV=development.");
const db = createDatabase(config.databaseUrl);
const client = await db.connect();
try {
  await client.query("BEGIN");
  const actor = await client.query<{ id: string }>(`SELECT id::text FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1`);
  const actorId = actor.rows[0]?.id ?? null;
  await client.query(`
    INSERT INTO sababuka.policy_focuses (code, name, description, display_order, is_active, created_by)
    VALUES ('DEMO_PRESENTATION', '[DEMO] Paket Presentasi', 'Paket terisolasi untuk ekspose; bukan master RPJMD.', 900, true, $1),
           ('DEMO_PRACTICE', '[DEMO] Paket Latihan Peserta', 'Paket terisolasi untuk latihan alur; bukan master RPJMD.', 901, true, $1)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.categories (code, name, description, policy_focus_id, display_order, is_active, created_by, review_status, decision_notes)
    SELECT x.code, x.name, x.description, pf.id, x.display_order, true, $1, 'draft', x.notes
    FROM (VALUES
      ('DEMO_PRESENTATION_CATEGORY', '[DEMO PRESENTASI] Capaian layanan', 'DEMO_PACKAGE=DEMO_PRESENTATION; tidak terkait kategori RPJMD.', 'DEMO_PRESENTATION', 900, 'Paket presentasi; menunggu keputusan BAPPERIDA.'),
      ('DEMO_PRACTICE_CATEGORY', '[DEMO LATIHAN PESERTA] Capaian layanan', 'DEMO_PACKAGE=DEMO_PRACTICE; tidak terkait kategori RPJMD.', 'DEMO_PRACTICE', 901, 'Paket latihan; menunggu keputusan BAPPERIDA.')
    ) AS x(code, name, description, focus_code, display_order, notes)
    JOIN sababuka.policy_focuses pf ON pf.code = x.focus_code
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, policy_focus_id = EXCLUDED.policy_focus_id, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicators (code, name, category_id, owner_organization_id, is_active, created_by)
    SELECT x.code, x.name, c.id, o.id, true, $1
    FROM (VALUES ('DEMO_PRESENTATION_INDICATOR', '[DEMO PRESENTASI] Nilai capaian layanan', 'DEMO_PRESENTATION_CATEGORY'), ('DEMO_PRACTICE_INDICATOR', '[DEMO LATIHAN PESERTA] Nilai capaian layanan', 'DEMO_PRACTICE_CATEGORY')) AS x(code, name, category_code)
    JOIN sababuka.categories c ON c.code = x.category_code LEFT JOIN sababuka.organizations o ON o.code = 'DKPP'
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, owner_organization_id = EXCLUDED.owner_organization_id, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicator_versions (indicator_id, version_number, definition, unit_id, frequency, data_type, dimension_schema, access_level, effective_from, status, change_notes, created_by)
    SELECT i.id, 1, 'Nilai demonstrasi untuk latihan alur SABABUKA; bukan realisasi resmi.', u.id, 'annual', 'number', '{}'::jsonb, 'internal', DATE '2026-01-01', 'draft', 'Paket demo terisolasi; status workflow dipertahankan saat seed ulang.', $1
    FROM sababuka.indicators i JOIN sababuka.units u ON u.code = 'NUMBER' WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR')
    ON CONFLICT (indicator_id, version_number) DO UPDATE SET definition = EXCLUDED.definition, unit_id = EXCLUDED.unit_id, frequency = EXCLUDED.frequency, data_type = EXCLUDED.data_type, dimension_schema = EXCLUDED.dimension_schema, access_level = EXCLUDED.access_level, effective_from = EXCLUDED.effective_from`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicator_organizations (indicator_version_id, organization_id, responsibility, is_primary)
    SELECT iv.id, o.id, 'primary_producer', true FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id JOIN sababuka.organizations o ON o.code = 'DKPP'
    WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR') AND iv.version_number = 1
    ON CONFLICT (indicator_version_id, organization_id, responsibility) DO UPDATE SET is_primary = true`);
  await client.query(`
    INSERT INTO sababuka.targets (indicator_version_id, period_id, numeric_value, notes, created_by)
    SELECT iv.id, p.id, x.value, 'DEMO_PACKAGE=' || x.package_code || '; target latihan, bukan target RPJMD.', $1
    FROM (VALUES ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRESENTATION', 80::numeric), ('DEMO_PRACTICE_INDICATOR', 'DEMO_PRACTICE', 70::numeric)) AS x(indicator_code, package_code, value)
    JOIN sababuka.indicators i ON i.code = x.indicator_code JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1 JOIN sababuka.periods p ON p.code = '2026'
    ON CONFLICT (indicator_version_id, period_id, geography_id, dimension_hash) DO UPDATE SET numeric_value = EXCLUDED.numeric_value, text_value = NULL, notes = EXCLUDED.notes`, [actorId]);
  await client.query("COMMIT");
  console.log("Paket demo terisolasi siap: presentasi dan latihan. Tidak ada submission atau publikasi yang dibuat.");
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await db.end(); }
