import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

if (process.env.NODE_ENV !== "development" || process.env.CONFIRM_LOCAL_OPD_WEBSITES !== "LOCAL_ONLY") {
  throw new Error("Registrasi website OPD hanya boleh dijalankan lokal dengan konfirmasi LOCAL_ONLY.");
}

type Entry = { code: string; url: string; datasetCount: number; grade: "A" | "B" | "C" | "D"; confidence: "official" | "needs_confirmation"; note?: string };
const entries: Entry[] = [
  { code: "BAKESBANGPOL", url: "https://kesbangpol.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "BAPENDA", url: "https://bapenda.kapuaskab.go.id", datasetCount: 2, grade: "B", confidence: "official" },
  { code: "BAPPERIDA", url: "https://bapperida.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "BKAD", url: "https://perbendaharaan.kapuaskab.go.id", datasetCount: 2, grade: "B", confidence: "needs_confirmation", note: "Domain BPKAD pada direktori tidak aktif; memakai kandidat layanan perbendaharaan." },
  { code: "BKPSDM", url: "https://bkpsdm.kapuaskab.go.id", datasetCount: 2, grade: "B", confidence: "official" },
  { code: "BPBD", url: "https://bpbd.kapuaskab.go.id", datasetCount: 2, grade: "B", confidence: "official" },
  { code: "DAMKAR", url: "https://polppdamkar.kapuaskab.go.id", datasetCount: 0, grade: "D", confidence: "needs_confirmation", note: "Kandidat domain lama gabungan Satpol PP dan Damkar." },
  { code: "DINKES", url: "https://dinkes.kapuaskab.go.id/web/", datasetCount: 13, grade: "A", confidence: "official" },
  { code: "DINSOS", url: "https://dissos.kapuaskab.go.id", datasetCount: 1, grade: "B", confidence: "official" },
  { code: "DISARPUS", url: "https://disarpustaka.kapuaskab.go.id", datasetCount: 4, grade: "B", confidence: "official" },
  { code: "DISBUDPARPORA", url: "https://disparbudpora.kapuaskab.go.id", datasetCount: 6, grade: "B", confidence: "needs_confirmation", note: "Perlu konfirmasi pengganti domain Disp​ora lama." },
  { code: "DISDIK", url: "https://disdik.kapuaskab.go.id", datasetCount: 6, grade: "B", confidence: "official" },
  { code: "DISHUB", url: "https://dishub.kapuaskab.go.id", datasetCount: 1, grade: "B", confidence: "official" },
  { code: "DISKOMINFOSANTIK", url: "https://diskominfosantik.kapuaskab.go.id", datasetCount: 3, grade: "B", confidence: "official" },
  { code: "DISNAKERTRANS", url: "https://distransnaker.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "DISPERINDAGKOPUKM", url: "https://dppkukm.kapuaskab.go.id", datasetCount: 4, grade: "B", confidence: "official" },
  { code: "DISPERKIMTAN", url: "https://perkimtan.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "DISTAN", url: "https://distan.kapuaskab.go.id", datasetCount: 3, grade: "B", confidence: "official" },
  { code: "DKPP", url: "https://dkpp.kapuaskab.go.id", datasetCount: 7, grade: "A", confidence: "official" },
  { code: "DLHK", url: "https://dlhk.kapuaskab.go.id", datasetCount: 6, grade: "B", confidence: "needs_confirmation", note: "Perlu konfirmasi pengganti domain DLH lama." },
  { code: "DP3APPKB", url: "https://dp3appkb.kapuaskab.go.id", datasetCount: 5, grade: "B", confidence: "official" },
  { code: "DPMD", url: "https://dpmd.kapuaskab.go.id", datasetCount: 3, grade: "B", confidence: "official" },
  { code: "DPMPTSP", url: "https://dpmptsp.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "DPUPR", url: "https://dpuprpkp.kapuaskab.go.id", datasetCount: 21, grade: "B", confidence: "official" },
  { code: "DUKCAPIL", url: "https://disdukcapil.kapuaskab.go.id", datasetCount: 3, grade: "C", confidence: "official" },
  { code: "INSPEKTORAT", url: "https://inspektorat.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "SATPOLPP", url: "https://polpp.kapuaskab.go.id", datasetCount: 0, grade: "D", confidence: "official" },
  { code: "SETDA", url: "https://setda.kapuaskab.go.id", datasetCount: 0, grade: "C", confidence: "official" },
  { code: "SETWAN", url: "https://setwan.kapuaskab.go.id", datasetCount: 0, grade: "D", confidence: "official" },
];

const db = createDatabase(loadConfig().databaseUrl);
try {
  const actor = await db.query<{ id: string }>("SELECT id::text FROM sababuka.users WHERE status='active' ORDER BY CASE WHEN email='developer@sababuka.com' THEN 0 ELSE 1 END LIMIT 1");
  if (!actor.rows[0]) throw new Error("Akun lokal aktif belum tersedia.");
  let saved = 0;
  for (const entry of entries) {
    const organization = await db.query<{ id: string; name: string; indicator_count: number; category_count: number; pic_count: number }>(
      `SELECT o.id::text,o.name,
              (SELECT count(DISTINCT i.id)::int FROM sababuka.indicators i
               LEFT JOIN sababuka.indicator_versions iv ON iv.indicator_id=i.id
               LEFT JOIN sababuka.indicator_organizations io ON io.indicator_version_id=iv.id
               WHERE i.is_active=true AND (i.owner_organization_id=o.id OR io.organization_id=o.id)) AS indicator_count,
              (SELECT count(DISTINCT i.category_id)::int FROM sababuka.indicators i
               LEFT JOIN sababuka.indicator_versions iv ON iv.indicator_id=i.id
               LEFT JOIN sababuka.indicator_organizations io ON io.indicator_version_id=iv.id
               WHERE i.is_active=true AND (i.owner_organization_id=o.id OR io.organization_id=o.id)) AS category_count,
              (SELECT count(DISTINCT om.user_id)::int FROM sababuka.organization_memberships om
               JOIN sababuka.users u ON u.id=om.user_id AND u.status='active'
               WHERE om.organization_id=o.id AND om.ends_at IS NULL) AS pic_count
       FROM sababuka.organizations o WHERE o.code=$1 AND o.is_active=true`, [entry.code]);
    const org = organization.rows[0];
    if (!org) throw new Error(`OPD ${entry.code} tidak ditemukan.`);
    const config = {
      environment: "local", connector_kind: "html_scrape", data_format: "html", website_url_confidence: entry.confidence,
      website_audit_status: "not_checked", ckan_dataset_count: entry.datasetCount, data_readiness_grade: entry.grade,
      rpjmd_indicator_count: org.indicator_count, rpjmd_category_count: org.category_count, pic_account_count: org.pic_count,
      scrape_policy: "public_only_preview_required_no_bypass",
    };
    const source = await db.query<{ id: string }>(
      `INSERT INTO sababuka.data_sources (code,name,source_type,base_url,owner_organization_id,connection_config,is_active,created_by)
       VALUES ($1,$2,'other',$3,$4,$5::jsonb,true,$6)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,source_type='other',base_url=EXCLUDED.base_url,
         owner_organization_id=EXCLUDED.owner_organization_id,connection_config=sababuka.data_sources.connection_config || EXCLUDED.connection_config,
         is_active=true,updated_at=now() RETURNING id::text`,
      [`WEB_${entry.code}`, `Website resmi ${org.name}`, entry.url, org.id, JSON.stringify(config), actor.rows[0].id]);
    const note = ["Pemeriksaan halaman publik saja; wajib preview Walidata dan tidak boleh melewati proteksi website.", entry.note].filter(Boolean).join(" ");
    await db.query(
      `INSERT INTO sababuka.data_source_integrations (data_source_id,connector_kind,auth_type,data_format,sync_mode,verification_mode,status,notes,created_by,updated_by)
       VALUES ($1,'html_scrape','none','html','manual','preview_required',$2,$3,$4,$4)
       ON CONFLICT (data_source_id) DO UPDATE SET connector_kind='html_scrape',auth_type='none',data_format='html',sync_mode='manual',
         sync_interval_minutes=NULL,verification_mode='preview_required',status=EXCLUDED.status,notes=EXCLUDED.notes,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      [source.rows[0]!.id, entry.confidence === "official" ? "testing" : "draft", note, actor.rows[0].id]);
    await db.query(`UPDATE sababuka.organizations SET metadata=metadata || $2::jsonb,updated_at=now() WHERE id=$1`, [org.id, JSON.stringify({ website_url: entry.url, website_url_confidence: entry.confidence, website_audit_status: "not_checked", ckan_dataset_count: entry.datasetCount, data_readiness_grade: entry.grade, rpjmd_indicator_count: org.indicator_count, rpjmd_category_count: org.category_count, pic_account_count: org.pic_count })]);
    saved += 1;
  }
  console.log(JSON.stringify({ environment: "local", saved, profiles: entries.length, scheduled: 0, auto_import: 0 }, null, 2));
} finally { await db.end(); }
