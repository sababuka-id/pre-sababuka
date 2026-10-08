import { BadgeCheck, Building2, Gauge, Newspaper } from "lucide-react";
import { api } from "../api";
import { EmptyState, formatDate, Notice, PageLoading, useAsync } from "../components";

interface ExecutiveItem {
  indicator_id: string; indicator_code: string; indicator_name: string; category_name: string;
  policy_focus_name: string | null; period_label: string; unit: string; unit_symbol: string | null;
  numeric_value: string | null; text_value: string | null; publication_title: string;
  effective_at: string; organization_name: string; source: string; source_url: string | null;
  source_status: "demo" | "submitted" | "verified_direct" | "verified_calculated" | null;
  source_retrieved_at: string | null;
}
interface ExecutiveData {
  generated_at: string;
  metrics: { active_indicators: number; approved_submissions: number; covered_organizations: number; active_publications: number };
  items: ExecutiveItem[];
}

export function ExecutivePage() {
  const result = useAsync(() => api<ExecutiveData>("/executive/dashboard"), []);
  if (result.loading) return <PageLoading label="Memuat ringkasan pimpinan" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Ringkasan belum dapat dimuat."}</Notice>;
  const containsDemo = result.data.items.some((item) => item.publication_title.startsWith("DEMO"));
  const verifiedCount = result.data.items.filter((item) => item.source_status === "verified_direct" || item.source_status === "verified_calculated").length;
  const categoryStatus = Array.from(result.data.items.reduce((categories, item) => {
    const current = categories.get(item.category_name) ?? { verified: new Set<string>(), demo: new Set<string>() };
    const isVerified = item.source_status === "verified_direct" || item.source_status === "verified_calculated";
    (isVerified ? current.verified : current.demo).add(item.indicator_id);
    categories.set(item.category_name, current);
    return categories;
  }, new Map<string, { verified: Set<string>; demo: Set<string> }>())).map(([name, counts]) => ({
    name,
    verified: counts.verified.size,
    demo: counts.demo.size,
  }));
  const cards = [
    ["Indikator aktif", result.data.metrics.active_indicators, Gauge, "blue"],
    ["Capaian disetujui", result.data.metrics.approved_submissions, BadgeCheck, "teal"],
    ["OPD tercakup", result.data.metrics.covered_organizations, Building2, "violet"],
    ["Publikasi aktif", result.data.metrics.active_publications, Newspaper, "amber"],
  ] as const;
  return <>
    <Notice tone={containsDemo ? "warning" : "success"}>{containsDemo
      ? `Dashboard memisahkan data resmi dan data demo. ${verifiedCount} capaian sudah memiliki sumber resmi; kartu berlabel DEMO tetap bukan realisasi.`
      : "Ringkasan pimpinan hanya menampilkan angka dari publikasi aktif. Draf dan data yang baru dikirim tidak masuk ke kartu capaian."}</Notice>
    <section className="metric-grid executive-metrics">{cards.map(([label, value, Icon, tone]) => <article className="metric-card" key={label}><span className={`metric-icon ${tone}`}><Icon /></span><span><small>{label}</small><strong>{value}</strong></span></article>)}</section>
    <section className="panel category-release-panel"><header><div><span className="eyebrow">Cakupan data strategis</span><h2>Ketersediaan capaian per kelompok isu</h2></div><small>{categoryStatus.filter((category) => category.verified > 0).length} dari {categoryStatus.length} kelompok isu sudah memuat capaian bersumber resmi</small></header>
      <div className="category-release-grid">{categoryStatus.map((category) => <article key={category.name}>
        <span className={`badge ${category.verified > 0 ? "success" : "warning"}`}>{category.verified > 0 ? "Capaian terverifikasi" : "Demo · menunggu OPD"}</span>
        <h3>{category.name}</h3>
        <p>{category.verified > 0 ? `${category.verified} indikator sudah memiliki capaian terverifikasi` : `${category.demo} indikator tersedia untuk demonstrasi alur`}</p>
      </article>)}</div>
    </section>
    <section className="panel executive-panel"><header><div><span className="eyebrow">Data terkurasi</span><h2>Capaian indikator terpublikasi</h2></div><small>Diperbarui {formatDate(result.data.generated_at)} WIB</small></header>
      {!result.data.items.length ? <EmptyState title="Belum ada publikasi aktif">Capaian yang sudah disetujui tetap menunggu proses publikasi sebelum tampil untuk pimpinan.</EmptyState>
        : <div className="executive-cards">{result.data.items.map((item) => {
          const status = item.source_status === "verified_direct" ? "Sumber resmi" : item.source_status === "verified_calculated" ? "Dihitung dari sumber resmi" : "Data demo";
          const tone = item.source_status === "verified_direct" ? "success" : item.source_status === "verified_calculated" ? "info" : "warning";
          return <article key={`${item.publication_title}-${item.indicator_id}-${item.period_label}`}><small>{item.category_name} · {item.period_label}</small><span className={`badge ${tone}`}>{status}</span><h3>{item.indicator_name}</h3><strong>{item.text_value ?? `${Number(item.numeric_value).toLocaleString("id-ID")} ${item.unit_symbol ?? item.unit}`}</strong><p>{item.organization_name} · {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">{item.source}</a> : item.source}</p><footer>{item.publication_title}</footer></article>;
        })}</div>}
    </section>
  </>;
}
