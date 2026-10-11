import { Building2, CheckCircle2, CircleAlert, FileText, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, Notice, PageLoading, useAsync } from "../components";

interface OpdReadiness {
  organization_id: string; organization_code: string; organization_name: string;
  id: string | null; response_json: { pic?: { name?: string; email?: string; whatsapp?: string }; website?: { has_website?: string }; integration?: { api_available?: string }; baseline_items?: unknown[] };
  technical_status: "draft" | "submitted" | "returned" | "verified";
  planning_status: "draft" | "submitted" | "returned" | "verified";
  document_count: number; active_account_count: number; indicator_count: number; issue_count: number;
  issue_names: string[]; focus_names: string[]; updated_at: string | null;
}

const statusLabel = (value: OpdReadiness["technical_status"]) => ({ draft: "Belum dikirim", submitted: "Diperiksa", returned: "Perlu perbaikan", verified: "Terverifikasi" }[value]);
const statusTone = (value: OpdReadiness["technical_status"]) => value === "verified" ? "success" : value === "returned" ? "danger" : value === "submitted" ? "warning" : "neutral";

export function OpdMonitoringPage() {
  const result = useAsync(() => api<{ data: OpdReadiness[] }>("/opd-profiles"), []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = useMemo(() => (result.data?.data ?? []).filter((row) => {
    const term = search.trim().toLocaleLowerCase("id");
    const matchesSearch = !term || [row.organization_name, row.organization_code, row.response_json.pic?.name, ...(row.issue_names ?? []), ...(row.focus_names ?? [])].some((value) => value?.toLocaleLowerCase("id").includes(term));
    const matchesFilter = filter === "all" || (filter === "no-account" && !row.active_account_count) || (filter === "no-indicator" && !row.indicator_count) || (filter === "incomplete" && (!row.id || row.technical_status !== "verified" || row.planning_status !== "verified"));
    return matchesSearch && matchesFilter;
  }), [result.data, search, filter]);
  const summary = useMemo(() => {
    const data = result.data?.data ?? [];
    return { total: data.length, registered: data.filter((row) => row.active_account_count > 0).length, mapped: data.filter((row) => row.indicator_count > 0).length, complete: data.filter((row) => row.technical_status === "verified" && row.planning_status === "verified").length };
  }, [result.data]);

  if (result.loading) return <PageLoading label="Memuat kesiapan OPD" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Data kesiapan OPD gagal dimuat."}</Notice>;
  return <div className="opd-monitoring-page">
    <section className="readiness-summary">
      <article><Building2 /><span><strong>{summary.total}</strong><small>OPD terdaftar</small></span></article>
      <article><Users /><span><strong>{summary.registered}</strong><small>PIC sudah aktif</small></span></article>
      <article><FileText /><span><strong>{summary.mapped}</strong><small>Memiliki indikator</small></span></article>
      <article><CheckCircle2 /><span><strong>{summary.complete}</strong><small>Profil terverifikasi</small></span></article>
    </section>
    <section className="panel monitoring-intro"><div><span className="eyebrow">Kendali Developer</span><h2>Kesiapan seluruh OPD</h2><p>Pantau akun PIC, pemetaan indikator, kelompok isu, fokus pembangunan, profil sumber, dan dokumen RPJMD/Renstra dari satu halaman.</p></div></section>
    <div className="toolbar"><div className="table-filters"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari OPD, PIC, isu, atau fokus" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Semua OPD</option><option value="no-account">PIC belum aktif</option><option value="no-indicator">Belum ada indikator</option><option value="incomplete">Profil belum lengkap</option></select></div></div>
    <section className="panel table-panel">{!rows.length ? <EmptyState title="Tidak ada OPD yang sesuai">Ubah kata pencarian atau filter kesiapan.</EmptyState> : <div className="table-scroll"><table className="opd-monitoring-table"><thead><tr><th>OPD</th><th>PIC/Akun</th><th>Relasi RPJMD</th><th>Isu dan fokus</th><th>Profil sumber</th></tr></thead><tbody>{rows.map((row) => <tr key={row.organization_id}><td><div className="identity-cell"><span className="table-icon"><Building2 /></span><span><strong>{row.organization_name}</strong><small>{row.organization_code}</small></span></div></td><td>{row.active_account_count ? <><Badge tone="success">{row.active_account_count} akun aktif</Badge><small className="cell-note">{row.response_json.pic?.name || "PIC profil belum diisi"}</small></> : <><Badge tone="danger">Belum terdaftar</Badge><small className="cell-note">Menunggu pendaftaran PIC</small></>}</td><td><strong>{row.indicator_count} indikator</strong><small className="cell-note">{row.issue_count} kelompok isu · {row.document_count ?? 0} dokumen</small></td><td><div className="topic-list">{(row.focus_names ?? []).slice(0, 2).map((name) => <span key={name}>{name}</span>)}{!(row.focus_names ?? []).length && <span className="empty-topic"><CircleAlert />Belum dipetakan</span>}</div><small className="cell-note">{(row.issue_names ?? []).slice(0, 3).join(" · ") || "Belum ada kelompok isu"}</small></td><td><div className="dual-status"><Badge tone={statusTone(row.technical_status)}>Teknis: {statusLabel(row.technical_status)}</Badge><Badge tone={statusTone(row.planning_status)}>Substansi: {statusLabel(row.planning_status)}</Badge></div><small className="cell-note">{row.updated_at ? `Diperbarui ${new Date(row.updated_at).toLocaleDateString("id-ID")}` : "Belum pernah diisi"}</small></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
