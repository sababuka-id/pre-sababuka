import { Activity, BadgeCheck, Clock3, Gauge, RotateCcw, Send } from "lucide-react";
import { api } from "../api";
import { Badge, EmptyState, Notice, PageLoading, statusLabel, useAsync } from "../components";

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
    ["Indikator aktif", result.data.metrics.active_indicators, Gauge, "blue"], ["Draf OPD", result.data.metrics.draft, Clock3, "violet"],
    ["Menunggu pemeriksaan", result.data.metrics.pending_review, Send, "amber"], ["Dikembalikan", result.data.metrics.returned, RotateCcw, "amber"],
    ["Disetujui", result.data.metrics.approved, BadgeCheck, "teal"],
  ] as const;
  return <><section className="metric-grid operations-metrics">{cards.map(([label, value, Icon, tone]) => <article className="metric-card" key={label}><span className={`metric-icon ${tone}`}><Icon /></span><span><small>{label}</small><strong>{value}</strong></span></article>)}</section>
    <section className="dashboard-grid operations-grid"><article className="panel"><header><div><span className="eyebrow">Perangkat daerah</span><h2>Status pelaporan OPD</h2></div><Activity /></header>{!result.data.organizations.some((item) => item.total_forms) ? <EmptyState title="Belum ada pelaporan">Form capaian OPD akan dirangkum di sini.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>OPD</th><th>Total</th><th>Review</th><th>Kembali</th><th>Disetujui</th></tr></thead><tbody>{result.data.organizations.filter((item) => item.total_forms).map((item) => <tr key={item.organization_id}><td><strong>{item.organization_name}</strong><small className="table-subtitle">{item.code}</small></td><td>{item.total_forms}</td><td>{item.pending_review}</td><td>{item.returned}</td><td>{item.approved}</td></tr>)}</tbody></table></div>}</article>
      <article className="panel"><header><div><span className="eyebrow">Aktivitas terbaru</span><h2>Pergerakan pengiriman</h2></div></header>{!result.data.recent.length ? <EmptyState title="Belum ada aktivitas">Perubahan form akan tampil di sini.</EmptyState> : <div className="operation-feed">{result.data.recent.map((item) => <div key={item.id}><span><strong>{item.organization_name}</strong><small>{item.period_label} · {item.row_count} indikator</small></span><Badge tone={item.status === "approved" ? "success" : item.status === "returned" ? "warning" : "neutral"}>{statusLabel(item.status)}</Badge></div>)}</div>}</article></section></>;
}
