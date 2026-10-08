import { Activity, BadgeCheck, Clock3, Gauge, RotateCcw, Send } from "lucide-react";
import { api } from "../api";
import { Badge, capaianStatusLabel, EmptyState, Notice, PageLoading, useAsync } from "../components";

interface OperationsData {
  generated_at: string;
  metrics: { active_indicators: number; draft: number; pending_review: number; returned: number; approved: number };
  organizations: Array<{ organization_id: string; code: string; organization_name: string; total_forms: number; pending_review: number; returned: number; approved: number }>;
  recent: Array<{ id: string; organization_code: string; organization_name: string; period_label: string; status: string; row_count: number; updated_at: string }>;
}

export function OperationsPage() {
  const result = useAsync(() => api<OperationsData>("/operations/dashboard"), []);
  if (result.loading) return <PageLoading label="Memuat dashboard operasional" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error ?? "Dashboard operasional belum dapat dimuat."}</Notice>;
  const cards = [
    ["Indikator aktif", result.data.metrics.active_indicators, Gauge, "blue"], ["Draf form capaian", result.data.metrics.draft, Clock3, "violet"],
    ["Capaian menunggu pemeriksaan", result.data.metrics.pending_review, Send, "amber"], ["Capaian perlu perbaikan", result.data.metrics.returned, RotateCcw, "amber"],
    ["Capaian disetujui", result.data.metrics.approved, BadgeCheck, "teal"],
  ] as const;
  return <><Notice tone="warning">Ringkasan ini menghitung form pelaporan OPD per periode. Status disetujui di sini berarti capaian/realisasi form OPD sudah disetujui BAPPERIDA, bukan persetujuan kategori atau indikator.</Notice><section className="metric-grid operations-metrics">{cards.map(([label, value, Icon, tone]) => <article className="metric-card" key={label}><span className={`metric-icon ${tone}`}><Icon /></span><span><small>{label}</small><strong>{value}</strong></span></article>)}</section>
    <section className="dashboard-grid operations-grid"><article className="panel"><header><div><span className="eyebrow">Perangkat daerah</span><h2>Status pelaporan OPD</h2></div><Activity /></header>{!result.data.organizations.some((item) => item.total_forms) ? <EmptyState title="Belum ada pelaporan">Form capaian OPD akan dirangkum di sini.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>OPD</th><th>Total form</th><th>Menunggu pemeriksaan</th><th>Perlu perbaikan</th><th>Capaian disetujui</th></tr></thead><tbody>{result.data.organizations.filter((item) => item.total_forms).map((item) => <tr key={item.organization_id}><td><strong>{item.organization_name}</strong><small className="table-subtitle">{item.code}</small></td><td>{item.total_forms}</td><td>{item.pending_review}</td><td>{item.returned}</td><td>{item.approved}</td></tr>)}</tbody></table></div>}</article>
      <article className="panel"><header><div><span className="eyebrow">Aktivitas terbaru</span><h2>Pergerakan form capaian</h2></div></header>{!result.data.recent.length ? <EmptyState title="Belum ada aktivitas">Perubahan form capaian akan tampil di sini.</EmptyState> : <div className="operation-feed">{result.data.recent.map((item) => <div key={item.id}><span><strong>{item.organization_name}</strong><small>{item.period_label} · {item.row_count} indikator</small></span><Badge tone={item.status === "approved" ? "success" : item.status === "returned" ? "warning" : "neutral"}>{capaianStatusLabel(item.status)}</Badge></div>)}</div>}</article></section></>;
}
