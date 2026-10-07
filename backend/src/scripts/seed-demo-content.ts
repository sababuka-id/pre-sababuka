import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
if (config.nodeEnv !== "development") {
  throw new Error("Konten demo hanya boleh dibuat pada NODE_ENV=development.");
}

const db = createDatabase(config.databaseUrl);
const client = await db.connect();

try {
  await client.query("BEGIN");
  const actorResult = await client.query<{ id: string }>(
    `SELECT id::text FROM sababuka.users WHERE email = 'superadmin@sababuka.local'`,
  );
  const actorId = actorResult.rows[0]?.id;
  if (!actorId) throw new Error("Jalankan dev:seed-users sebelum dev:seed-content.");

  await client.query(
    `UPDATE sababuka.indicator_versions iv
     SET status = 'active', submitted_by = $1, submitted_at = COALESCE(submitted_at, now()),
         approved_by = $1, approved_at = COALESCE(approved_at, now()),
         change_notes = 'DEMO laporan antara; metadata dan target memerlukan validasi Bapperida/OPD.',
         source_reference = CASE
           WHEN source_reference LIKE 'Rujukan rancangan (belum diverifikasi): %' THEN source_reference
           ELSE 'Rujukan rancangan (belum diverifikasi): ' || source_reference
         END
     FROM sababuka.indicators i JOIN sababuka.categories c ON c.id = i.category_id
     JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
     WHERE iv.indicator_id = i.id AND pf.code = 'PILOT_ANTARA'`,
    [actorId],
  );

  const batchResult = await client.query<{ id: string; organization_id: string }>(
    `WITH context AS (
       SELECT dv.id AS dataset_version_id, p.id AS period_id
       FROM sababuka.datasets d
       JOIN sababuka.dataset_versions dv ON dv.dataset_id = d.id AND dv.version_number = 1
       JOIN sababuka.periods p ON p.code = '2025'
       WHERE d.code = 'SABABUKA.CAPAIAN_MANUAL'
     ), owners AS (
       SELECT DISTINCT i.owner_organization_id AS organization_id
       FROM sababuka.indicators i
       JOIN sababuka.categories c ON c.id = i.category_id
       JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
       WHERE pf.code = 'PILOT_ANTARA'
     )
     INSERT INTO sababuka.data_batches
       (dataset_version_id, organization_id, reporting_period_id, submission_method,
        source_metadata, row_count, status, submitted_by, submitted_at,
        approved_by, approved_at, created_by)
     SELECT context.dataset_version_id, owners.organization_id, context.period_id, 'manual',
            '{"demo":true,"basis":"target RPJMD 2025","disclaimer":"bukan realisasi resmi"}'::jsonb,
            0, 'approved', $1, now(), $1, now(), $1
     FROM context CROSS JOIN owners
     ON CONFLICT (dataset_version_id, organization_id, reporting_period_id)
       WHERE submission_method = 'manual' AND status <> 'cancelled' AND reporting_period_id IS NOT NULL
     DO UPDATE SET status = 'approved', approved_by = $1, approved_at = now(),
                   source_metadata = EXCLUDED.source_metadata
     RETURNING id::text, organization_id::text`,
    [actorId],
  );
  const batchByOrganization = new Map(batchResult.rows.map((row) => [row.organization_id, row.id]));

  const pilotRows = await client.query<{
    indicator_version_id: string;
    organization_id: string;
    period_id: string;
    numeric_value: string;
  }>(
    `SELECT iv.id::text AS indicator_version_id, i.owner_organization_id::text AS organization_id,
            t.period_id::text, t.numeric_value::text
     FROM sababuka.indicators i
     JOIN sababuka.categories c ON c.id = i.category_id
     JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id AND pf.code = 'PILOT_ANTARA'
     JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
     JOIN sababuka.targets t ON t.indicator_version_id = iv.id
     JOIN sababuka.periods p ON p.id = t.period_id AND p.code = '2025'
     ORDER BY c.display_order, i.name`,
  );

  for (const row of pilotRows.rows) {
    const batchId = batchByOrganization.get(row.organization_id);
    if (!batchId) throw new Error(`Batch demo tidak tersedia untuk organisasi ${row.organization_id}.`);
    await client.query(
      `INSERT INTO sababuka.observations
         (batch_id, indicator_version_id, period_id, numeric_value, quality_status, notes, created_by,
          source_name, source_status, source_retrieved_at)
       VALUES ($1, $2, $3, $4, 'warning',
         'DATA DEMO: nilai menggunakan target RPJMD 2025 sebagai placeholder tampilan, bukan realisasi resmi.', $5,
         'Target draft Laporan Antara', 'demo', now())
       ON CONFLICT (batch_id, indicator_version_id, period_id, geography_id, dimension_hash)
         DO NOTHING`,
      [batchId, row.indicator_version_id, row.period_id, row.numeric_value, actorId],
    );
  }

  await client.query(
    `UPDATE sababuka.data_batches b SET row_count = x.total
     FROM (SELECT batch_id, count(*)::int AS total FROM sababuka.observations GROUP BY batch_id) x
     WHERE b.id = x.batch_id AND b.id = ANY($1::uuid[])`,
    [[...batchByOrganization.values()]],
  );

  const existingPublication = await client.query<{ id: string; status: string }>(
    `SELECT id::text, status FROM sababuka.publications
     WHERE publication_key = 'DEMO_LAPORAN_ANTARA_2025' ORDER BY version_number DESC LIMIT 1`,
  );
  if (!existingPublication.rows[0]) {
    const publication = await client.query<{ id: string }>(
      `INSERT INTO sababuka.publications
         (publication_key, version_number, publication_number, title, description,
          status, effective_at, change_notes, created_by)
       VALUES ('DEMO_LAPORAN_ANTARA_2025', 1, 'DEMO-LA-2025-V1',
         'DEMO Laporan Antara - Target Pilot 2025 (Bukan Realisasi)',
         'Data demonstrasi untuk memperlihatkan isi dan alur SABABUKA. Nilai memakai target 2025 sebagai placeholder, bukan capaian resmi.',
         'draft', now(), 'Konten lokal untuk demonstrasi laporan antara.', $1)
       RETURNING id::text`,
      [actorId],
    );
    const publicationId = publication.rows[0]!.id;
    await client.query(
      `INSERT INTO sababuka.publication_items
         (publication_id, observation_id, dataset_version_id, display_order)
       SELECT $1, obs.id, b.dataset_version_id,
              row_number() OVER (ORDER BY c.display_order, i.name)::int
       FROM sababuka.observations obs
       JOIN sababuka.data_batches b ON b.id = obs.batch_id
       JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
       JOIN sababuka.indicators i ON i.id = iv.indicator_id
       JOIN sababuka.categories c ON c.id = i.category_id
       JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
       JOIN sababuka.periods p ON p.id = obs.period_id
       WHERE pf.code = 'PILOT_ANTARA' AND p.code = '2025'`,
      [publicationId],
    );
    await client.query(
      `UPDATE sababuka.publications
       SET status = 'active', activated_by = $2, activated_at = now(), updated_at = now()
       WHERE id = $1`,
      [publicationId, actorId],
    );
  }

  await client.query(
    `INSERT INTO sababuka.audit_events
       (actor_id, event_type, entity_type, metadata)
     VALUES ($1, 'development.demo_content_seeded', 'system',
       '{"categories":5,"indicators":15,"period":"2025","official":false}'::jsonb)`,
    [actorId],
  );
  await client.query("COMMIT");
  console.log(`Konten demo siap: 5 kategori, ${pilotRows.rowCount ?? 0} indikator, dan publikasi demo 2025.`);
  console.warn("Nilai demo memakai target 2025 sebagai placeholder dan bukan realisasi resmi.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
