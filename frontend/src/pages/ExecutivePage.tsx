import { AlertTriangle, CheckCircle2, MapPinned, Newspaper, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, formatDate, Notice, PageLoading, useAsync } from "../components";

interface ExecutiveItem {
  indicator_id: string; indicator_code: string; indicator_name: string; category_name: string;
  policy_focus_name: string | null; period_label: string; unit: string; unit_symbol: string | null;
  numeric_value: string | null; text_value: string | null; publication_title: string;
  effective_at: string; organization_name: string; source: string; source_url: string | null;
  source_status: "demo" | "submitted" | "verified_direct" | "verified_calculated" | null;
}
interface ExecutiveData {
  generated_at: string;
  metrics: { active_indicators: number; approved_submissions: number; covered_organizations: number; active_publications: number };
  items: ExecutiveItem[];
}
interface AnalysisPoint { observation_id: string; period_label: string; period_end: string; value: number; }
interface AnalysisSeries {
  indicator_id: string; indicator_name: string; category_name: string; unit: string; unit_symbol: string | null;
  geography_name: string; geography_level: string; points: AnalysisPoint[];
  performance: "improving" | "worsening" | "stable" | "unclassified" | "insufficient";
}
interface Recommendation { severity: "high" | "medium" | "info"; indicator_id: string; title: string; evidence: string; meaning: string; action: string; }
interface AnalysisData { series: AnalysisSeries[]; reconciliation: Array<{ indicator_id: string }>; recommendations: Recommendation[]; }

const cleanUnit = (unit: string | null | undefined) => unit && unit.toLowerCase() !== "angka" ? unit : "";
const valueLabel = (value: number, unit: string | null | undefined) => `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}${cleanUnit(unit) ? ` ${cleanUnit(unit)}` : ""}`;
const changeLabel = (series: AnalysisSeries) => {
  if (series.points.length < 2) return "Belum cukup periode";
  const first = series.points[0].value; const latest = series.points.at(-1)!.value;
  if (first === 0) return `${latest >= first ? "+" : ""}${(latest - first).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
  const change = ((latest - first) / Math.abs(first)) * 100;
  return `${change >= 0 ? "+" : ""}${change.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
};

export function ExecutivePage() {
  const result = useAsync(() => Promise.all([
    api<ExecutiveData>("/executive/dashboard"),
    api<AnalysisData>("/executive/analysis"),
  ]).then(([dashboard, analysis]) => ({ dashboard, analysis })), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  if (result.loading) return <PageLoading label="Memuat kondisi Kabupaten Kapuas" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Ringkasan belum dapat dimuat."}</Notice>;
  const { dashboard, analysis } = result.data;
  const headlineSeries = Array.from(new Map([...analysis.series]
    .sort((a, b) => Number(b.geography_level === "regency") - Number(a.geography_level === "regency"))
    .map((series) => [series.indicator_id, series])).values());
  const categories = Array.from(new Set(headlineSeries.map((item) => item.category_name))).sort((a, b) => a.localeCompare(b, "id"));
  const visible = headlineSeries.filter((item) => (!category || item.category_name === category) && (!query || `${item.indicator_name} ${item.category_name}`.toLowerCase().includes(query.toLowerCase())));
  const improving = headlineSeries.filter((item) => item.performance === "improving").length;
  const attentionIds = new Set([
    ...headlineSeries.filter((item) => item.performance === "worsening").map((item) => item.indicator_id),
    ...analysis.reconciliation.map((item) => item.indicator_id),
    ...analysis.recommendations.filter((item) => item.severity === "high").map((item) => item.indicator_id),
  ]);
  const districtCoverage = new Set(analysis.series.filter((item) => item.geography_level === "district").map((item) => item.geography_name)).size;
  const priorities = analysis.recommendations.filter((item) => item.severity === "high").slice(0, 3);

  return <div className="executive-page">
    <section className="panel executive-brief"><div><span className="eyebrow">KONDISI KABUPATEN KAPUAS</span><h2>Ringkasan untuk pengambilan keputusan</h2><p>Angka yang tampil berasal dari data terpublikasi. Baca kondisi terbaru, perubahan antarperiode, lalu fokuskan perhatian pada sinyal prioritas.</p></div><span className={`executive-signal ${attentionIds.size ? "attention" : "good"}`}><AlertTriangle /><strong>{attentionIds.size}</strong><small>indikator perlu perhatian</small></span></section>

    <section className="metric-grid executive-metrics">
      <article className="metric-card"><span className="metric-icon teal"><TrendingUp /></span><span><small>Tren membaik</small><strong>{improving} <em>dari {headlineSeries.length}</em></strong></span></article>
      <article className="metric-card"><span className="metric-icon amber"><AlertTriangle /></span><span><small>Perlu perhatian</small><strong>{attentionIds.size}</strong></span></article>
      <article className="metric-card"><span className="metric-icon violet"><MapPinned /></span><span><small>Cakupan kecamatan</small><strong>{districtCoverage} <em>dari 17</em></strong></span></article>
      <article className="metric-card"><span className="metric-icon blue"><Newspaper /></span><span><small>Rilis resmi aktif</small><strong>{dashboard.metrics.active_publications}</strong></span></article>
    </section>

    {priorities.length > 0 && <section className="panel executive-priorities"><header><div><span className="eyebrow">PRIORITAS TINDAK LANJUT</span><h2>Hal yang perlu dilihat lebih dahulu</h2></div></header><div>{priorities.map((item) => <article key={`${item.indicator_id}-${item.title}`}><Badge tone="danger">Prioritas</Badge><h3>{item.title}</h3><p>{item.meaning}</p><strong>{item.action}</strong></article>)}</div></section>}

    {headlineSeries.length > 0 && <div className="toolbar executive-filters"><label className="search-field"><Search /><input aria-label="Cari indikator" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kondisi atau indikator" /></label><select aria-label="Filter kelompok isu" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kelompok isu</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>{(query || category) && <button className="button secondary" onClick={() => { setQuery(""); setCategory(""); }}>Hapus filter</button>}<span className="filter-result">{visible.length} indikator</span></div>}

    <section className="panel executive-panel"><header><div><span className="eyebrow">PERKEMBANGAN INDIKATOR</span><h2>Kondisi terbaru dan perubahannya</h2></div><small>Diperbarui {formatDate(dashboard.generated_at)} WIB</small></header>
      {!headlineSeries.length ? <EmptyState title="Belum ada data terpublikasi">Data akan tampil setelah capaian disetujui dan diterbitkan.</EmptyState> : !visible.length ? <EmptyState title="Indikator tidak ditemukan">Ubah kata pencarian atau hapus filter.</EmptyState> : <div className="executive-cards executive-series-cards">{visible.map((series) => {
        const latest = series.points.at(-1); const unit = series.unit_symbol ?? series.unit;
        const tone = series.performance === "improving" ? "success" : series.performance === "worsening" ? "danger" : "warning";
        const status = series.performance === "improving" ? "Membaik" : series.performance === "worsening" ? "Memburuk" : series.performance === "stable" ? "Stabil" : "Data awal";
        return <article key={series.indicator_id}><small>{series.category_name}</small><Badge tone={tone}>{status}</Badge><h3>{series.indicator_name}</h3><strong>{latest ? valueLabel(latest.value, unit) : "-"}</strong><div className="executive-change"><span>Perubahan</span><b>{changeLabel(series)}</b><small>{series.points.length > 1 ? `${series.points[0].period_label}–${latest?.period_label}` : latest?.period_label}</small></div><footer>{series.geography_name} · {series.points.length} periode</footer></article>;
      })}</div>}
    </section>
    {districtCoverage === 0 && <Notice tone="success"><CheckCircle2 /> Peta kecamatan tidak ditampilkan pada ringkasan ini karena data yang tersedia masih tingkat kabupaten. Peta akan aktif otomatis saat sumber resmi memiliki kode kecamatan.</Notice>}
  </div>;
}
