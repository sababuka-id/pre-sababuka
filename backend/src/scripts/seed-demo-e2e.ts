import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
if (config.nodeEnv !== "development") throw new Error("Skenario demo hanya boleh dibuat pada NODE_ENV=development.");

const db = createDatabase(config.databaseUrl);
const client = await db.connect();

try {
  await client.query("BEGIN");
  const actor = await client.query<{ id: string }>("SELECT id::text FROM sababuka.users WHERE email = 'superadmin@sababuka.local'");
  const owner = await client.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code = 'DKPP' AND is_active = true");
  const focus = await client.query<{ id: string }>("SELECT id::text FROM sababuka.policy_focuses WHERE code = 'RPJMD_F3' AND is_active = true");
  const unit = await client.query<{ id: string }>("SELECT id::text FROM sababuka.units WHERE code = 'NUMBER' AND is_active = true");
  const period = await client.query<{ id: string }>("SELECT id::text FROM sababuka.periods WHERE code = '2025'");
  if (!actor.rows[0] || !owner.rows[0] || !focus.rows[0] || !unit.rows[0] || !period.rows[0]) {
    throw new Error("Seed demo membutuhkan akun superadmin, DKPP, fokus RPJMD_F3, unit NUMBER, dan periode 2025.");
  }

  const category = await client.query<{ id: string }>(
    `INSERT INTO sababuka.categories
       (code, name, description, policy_focus_id, display_order, is_active, created_by, decision_notes)
     VALUES ('DEMO_E2E_CATEGORY_2026', '[DEMO] Uji Alur Capaian OPD',
       'Data latihan lokal untuk mencoba alur kategori, indikator, OPD, BAPPERIDA, dan pimpinan. Bukan data resmi.',
       $1, 999, true, $2,
       'Skenario demo lokal; kategori harus disetujui BAPPERIDA sebelum indikator diajukan.')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
       policy_focus_id = EXCLUDED.policy_focus_id, is_active = true, updated_at = now()
     RETURNING id::text`,
    [focus.rows[0].id, actor.rows[0].id],
  );

  const indicator = await client.query<{ id: string }>(
    `INSERT INTO sababuka.indicators
       (code, name, category_id, owner_organization_id, is_active, created_by)
     VALUES ('DEMO_E2E_INDICATOR_2026', '[DEMO] Nilai Uji Capaian OPD', $1, $2, true, $3)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id,
       owner_organization_id = EXCLUDED.owner_organization_id, is_active = true, updated_at = now()
     RETURNING id::text`,
    [category.rows[0]!.id, owner.rows[0]!.id, actor.rows[0]!.id],
  );

  const version = await client.query<{ id: string }>(
    `INSERT INTO sababuka.indicator_versions
       (indicator_id, version_number, definition, formula, unit_id, frequency, data_type,
        dimension_schema, direction, source_reference, access_level, effective_from, status,
        change_notes, created_by)
     VALUES ($1, 1, 'Nilai latihan untuk memastikan urutan review dan publikasi berjalan.',
       'Nilai input OPD untuk demo', $2, 'annual', 'number', '{}'::jsonb, 'increase',
       'Skenario demo lokal; bukan realisasi resmi.', 'internal', DATE '2025-01-01', 'draft',
       'Data latihan lokal; jangan dipakai sebagai angka resmi.', $3)
     ON CONFLICT (indicator_id, version_number) DO UPDATE SET definition = EXCLUDED.definition,
       formula = EXCLUDED.formula, unit_id = EXCLUDED.unit_id, frequency = EXCLUDED.frequency,
       data_type = EXCLUDED.data_type, source_reference = EXCLUDED.source_reference,
       change_notes = EXCLUDED.change_notes, updated_at = now()
     RETURNING id::text`,
    [indicator.rows[0]!.id, unit.rows[0]!.id, actor.rows[0]!.id],
  );

  await client.query(
    `INSERT INTO sababuka.indicator_organizations
       (indicator_version_id, organization_id, responsibility, is_primary)
     VALUES ($1, $2, 'primary_producer', true)
     ON CONFLICT (indicator_version_id, organization_id, responsibility)
     DO UPDATE SET is_primary = true`,
    [version.rows[0]!.id, owner.rows[0]!.id],
  );
  await client.query(
    `INSERT INTO sababuka.targets (indicator_version_id, period_id, numeric_value, notes, created_by)
     VALUES ($1, $2, 100, 'Target latihan demo lokal.', $3)
     ON CONFLICT (indicator_version_id, period_id, geography_id, dimension_hash) DO NOTHING`,
    [version.rows[0]!.id, period.rows[0]!.id, actor.rows[0]!.id],
  );
  await client.query("COMMIT");
  console.log("Skenario E2E demo siap: DEMO_E2E_CATEGORY_2026 / DEMO_E2E_INDICATOR_2026, pemilik DKPP.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
