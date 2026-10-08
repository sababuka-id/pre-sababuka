import { FolderTree, Gauge, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, formatCategoryCode, Modal, Notice, Pagination, Spinner, statusLabel, useAsync } from "../components";
import type { Category, Indicator, Organization, PageResponse, Period, PolicyFocus, Unit } from "../types";

export function CategoriesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const categories = useAsync(() => api<PageResponse<Category>>(`/categories?page=${page}&page_size=20${query ? `&q=${encodeURIComponent(query)}` : ""}`), [page, query]);
  const focuses = useAsync(() => api<PageResponse<PolicyFocus>>("/policy-focuses?page_size=100"), []);
  const canManage = user?.permissions.includes("category.manage") ?? false;
  const canApprove = user?.permissions.includes("category.approve") ?? false;
  const transition = async (category: Category, action: "submit" | "approve" | "reject" | "reopen") => {
    setActionError("");
    try {
      await api(`/categories/${category.id}/actions/${action}`, { method: "POST", mutation: true });
      categories.reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Status kategori gagal diubah."); }
  };

  return <>
    <div className="toolbar">
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari kategori" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kategori" /><button className="button secondary">Cari</button></form>
      {canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah kategori</button>}
    </div>
    <Notice tone="warning">Fokus dan kelompok isu RPJMD pada halaman ini berstatus usulan. Bapperida dapat memperbaiki, menyetujui, atau menolaknya sebelum menjadi klasifikasi resmi.</Notice>
    {actionError && <div className="governance-table"><Notice tone="error">{actionError}</Notice></div>}
    <section className="panel table-panel governance-table">
      {categories.loading ? <div className="panel-loading"><Spinner /></div> : !categories.data?.data.length ? <EmptyState title="Belum ada kategori">Tambahkan kategori sebagai kelompok indikator.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Kelompok isu / kategori</th><th>Usulan fokus kebijakan</th><th>Indikator</th><th>Status kategori</th><th>Tindakan</th></tr></thead><tbody>
        {categories.data.data.map((category) => {
          const action = category.review_status === "draft" && canManage ? ["submit", "Ajukan"] as const : category.review_status === "in_review" && canApprove ? ["approve", "Setujui"] as const : category.review_status === "rejected" && canManage ? ["reopen", "Perbaiki"] as const : null;
          return (
            <tr key={category.id}>
              <td><div className="identity-cell"><span className="table-icon"><FolderTree /></span><span><strong>{category.name}</strong><small>{formatCategoryCode(category.code)} · kode teknis {category.code}</small></span></div></td>
              <td>{category.policy_focus_name ?? "-"}</td><td><strong>{category.indicator_count}</strong></td>
              <td><Badge tone={category.review_status === "approved" ? "success" : category.review_status === "rejected" ? "danger" : "warning"}>{statusLabel(category.review_status)}</Badge></td>
              <td>{action ? <span className="table-actions"><button className="button secondary" onClick={() => void transition(category, action[0])}>{action[1]}</button>{category.review_status === "in_review" && canApprove && <button className="button secondary" onClick={() => void transition(category, "reject")}>Tolak</button>}</span> : "-"}</td>
            </tr>
          );
        })}
      </tbody></table></div>}
      {categories.data && <Pagination page={categories.data.meta.page} totalPages={categories.data.meta.total_pages} onChange={setPage} />}
    </section>
    {createOpen && focuses.data && <CategoryForm focuses={focuses.data.data} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); categories.reload(); }} />}
  </>;
}

function CategoryForm({ focuses, onClose, onCreated }: { focuses: PolicyFocus[]; onClose(): void; onCreated(): void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusId, setFocusId] = useState(focuses[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/categories", { method: "POST", mutation: true, body: jsonBody({ code: code.toUpperCase(), name, description: description || null, policy_focus_id: focusId || null }) });
      onCreated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kategori gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal title="Tambah kategori pilot" onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><div className="form-grid"><label className="field"><span>Kode</span><input value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/gu, "_"))} required /></label><label className="field"><span>Fokus kebijakan</span><select value={focusId} onChange={(e) => setFocusId(e.target.value)}><option value="">Tanpa fokus</option>{focuses.map((focus) => <option key={focus.id} value={focus.id}>{focus.name}</option>)}</select></label></div><label className="field"><span>Nama kategori</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="field"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label><footer className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan kategori"}</button></footer></form></Modal>;
}

export function IndicatorsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [deepLinkId] = useState(() => new URLSearchParams(window.location.search).get("id"));
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [actionError, setActionError] = useState("");
  const url = `/indicators?page=${page}&page_size=20${query ? `&q=${encodeURIComponent(query)}` : ""}${categoryId ? `&category_id=${categoryId}` : ""}${status ? `&status=${status}` : ""}`;
  const indicators = useAsync(() => api<PageResponse<Indicator>>(url), [url]);
  const refs = useAsync(async () => {
    const [categories, units, periods, organizations] = await Promise.all([
      api<PageResponse<Category>>("/categories?page_size=100"), api<{ data: Unit[] }>("/units"),
      api<{ data: Period[] }>("/periods"), api<PageResponse<Organization>>("/organizations?page_size=100&active=true"),
    ]);
    return { categories: categories.data, units: units.data, periods: periods.data, organizations: organizations.data };
  }, []);
  const canManage = user?.permissions.includes("indicator.manage") ?? false;
  const canSubmit = (user?.permissions.includes("indicator.submit") ?? false)
    && (user?.roles.some((role) => role.code === "superadmin" || role.code === "indicator_author") ?? false);
  useEffect(() => {
    if (deepLinkId && indicators.data?.data) setSelected(indicators.data.data.find((item) => item.id === deepLinkId) ?? null);
  }, [deepLinkId, indicators.data]);
  const transition = async (indicator: Indicator, action: "submit" | "approve" | "verify" | "activate" | "retire") => {
    setActionError("");
    try {
      await api(`/indicator-versions/${indicator.version_id}/actions/${action}`, { method: "POST", mutation: true });
      setSelected(null); indicators.reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Status indikator gagal diubah."); }
  };

  return <>
    <div className="toolbar indicator-toolbar">
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari indikator" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama indikator" /><button className="button secondary">Cari</button></form>
      <select aria-label="Filter kategori indikator" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Semua kategori</option>{refs.data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <select aria-label="Filter status indikator" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="draft">Draf</option><option value="in_review">Pemeriksaan BAPPERIDA</option><option value="opd_verification">Verifikasi OPD</option><option value="approved">Siap diaktifkan</option><option value="active">Aktif</option><option value="retired">Diarsipkan</option></select>
      {canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah indikator</button>}
    </div>
    <Notice tone="warning">Indikator hasil inventarisasi RPJMD disimpan sebagai draf Bapperida. Draf belum aktif dan belum tampil pada dashboard pimpinan.</Notice>
    {actionError && <div className="governance-table"><Notice tone="error">{actionError}</Notice></div>}
    <section className="panel table-panel governance-table">
      {indicators.loading ? <div className="panel-loading"><Spinner /></div> : !indicators.data?.data.length ? <EmptyState title="Belum ada indikator">Tambahkan indikator dan metadata pertamanya.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Indikator</th><th>Kategori</th><th>OPD utama</th><th>Arah</th><th>Target</th><th>Status</th></tr></thead><tbody>{indicators.data.data.map((indicator) => <tr key={indicator.id} className="clickable-row" tabIndex={0} aria-label={`Buka detail ${indicator.name}`} onClick={() => setSelected(indicator)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(indicator); } }}><td><div className="identity-cell"><span className="table-icon"><Gauge /></span><span><strong>{indicator.name}</strong><small>{indicator.code} · {indicator.unit_symbol ?? indicator.unit_name}</small></span></div></td><td><strong>{indicator.category_name}</strong><small className="table-subtitle">{formatCategoryCode(indicator.category_code)} · kode teknis {indicator.category_code}</small></td><td>{indicator.owner_organization_name ?? "Belum ditetapkan"}</td><td>{directionLabel(indicator.direction)}</td><td>{indicator.targets.length} tahun</td><td><Badge tone={indicator.status === "active" ? "success" : "warning"}>{statusLabel(indicator.status)}</Badge></td></tr>)}</tbody></table></div>}
      {indicators.data && <Pagination page={indicators.data.meta.page} totalPages={indicators.data.meta.total_pages} onChange={setPage} />}
    </section>
    {createOpen && refs.data && <IndicatorForm references={refs.data} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); indicators.reload(); }} />}
    {editing && refs.data && <IndicatorForm references={refs.data} initial={editing} onClose={() => setEditing(null)} onCreated={() => { setEditing(null); indicators.reload(); }} />}
    {selected && <IndicatorDetail indicator={selected} permissions={user?.permissions ?? []} canSubmit={canSubmit} canEdit={canManage && selected.status === "draft"} onEdit={() => { setEditing(selected); setSelected(null); }} onAction={(action) => transition(selected, action)} onClose={() => setSelected(null)} />}
  </>;
}

const directionLabel = (value: Indicator["direction"]) => value === "increase" ? "Naik" : value === "decrease" ? "Turun" : value === "maintain" ? "Dipertahankan" : "-";
const frequencyLabel = (value: string) => ({ annual: "Tahunan", quarterly: "Triwulanan", monthly: "Bulanan" }[value] ?? value.replaceAll("_", " "));
const responsibilityLabel = (value: string) => ({ owner: "Penanggung jawab", contributor: "Kontributor", validator: "Pemeriksa" }[value] ?? value.replaceAll("_", " "));

function formatTarget(target: Indicator["targets"][number], indicator: Indicator) {
  if (target.text_value) return target.text_value;
  const value = Number(target.numeric_value);
  if (indicator.data_type === "currency") return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(value);
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(value)}${indicator.unit_symbol ?? ""}`;
}

function IndicatorDetail({ indicator, permissions, canSubmit, canEdit, onEdit, onAction, onClose }: { indicator: Indicator; permissions: string[]; canSubmit: boolean; canEdit: boolean; onEdit(): void; onAction(action: "submit" | "approve" | "verify" | "activate" | "retire"): void; onClose(): void }) {
  const action = indicator.status === "draft" && canSubmit ? ["submit", "Ajukan ke BAPPERIDA"] as const
    : indicator.status === "in_review" && permissions.includes("indicator.approve") ? ["approve", "Kirim ke OPD untuk verifikasi"] as const
    : indicator.status === "opd_verification" && permissions.includes("indicator.verify") ? ["verify", "Konfirmasi teknis indikator"] as const
    : indicator.status === "approved" && permissions.includes("indicator.activate") ? ["activate", "Aktifkan indikator"] as const
    : indicator.status === "active" && permissions.includes("indicator.activate") ? ["retire", "Arsipkan indikator"] as const : null;
  return <Modal title={indicator.name} onClose={onClose} wide><div className="indicator-detail"><Notice tone="warning">Versi {indicator.version_number} berstatus {statusLabel(indicator.status)}. Metadata dan target perlu validasi resmi.</Notice><div className="detail-grid"><div><span>Kode</span><strong>{indicator.code}</strong></div><div><span>Kategori</span><strong>{indicator.category_name}</strong></div><div><span>OPD utama</span><strong>{indicator.owner_organization_name ?? "-"}</strong></div><div><span>Frekuensi</span><strong>{frequencyLabel(indicator.frequency)}</strong></div><div><span>Satuan</span><strong>{indicator.unit_name}</strong></div><div><span>Arah capaian</span><strong>{directionLabel(indicator.direction)}</strong></div></div><section><h3>Definisi</h3><p>{indicator.definition}</p></section><section><h3>Sumber rujukan</h3><p>{indicator.source_reference ?? "Belum ditetapkan"}</p></section><section><h3>Target tahunan</h3><div className="target-grid">{indicator.targets.map((target) => <div key={target.id}><small>{target.period_code}</small><strong>{formatTarget(target, indicator)}</strong></div>)}</div></section><section><h3>Perangkat daerah terkait</h3><div className="chip-list">{indicator.organizations.map((organization) => <span key={`${organization.organization_id}-${organization.responsibility}`}>{organization.organization_name} - {responsibilityLabel(organization.responsibility)}</span>)}</div></section>{(canEdit || action) && <footer className="detail-actions">{canEdit && <button className="button secondary" onClick={onEdit}>Ubah metadata draf</button>}{action && <button className="button primary" onClick={() => onAction(action[0])}>{action[1]}</button>}</footer>}</div></Modal>;
}

interface IndicatorRefs { categories: Category[]; units: Unit[]; periods: Period[]; organizations: Organization[] }

function IndicatorForm({ references, initial, onClose, onCreated }: { references: IndicatorRefs; initial?: Indicator; onClose(): void; onCreated(): void }) {
  const annualPeriods = useMemo(() => references.periods.filter((period) => period.period_type === "annual").sort((a, b) => a.code.localeCompare(b.code)), [references.periods]);
  const [form, setForm] = useState({ code: initial?.code ?? "", name: initial?.name ?? "", category_id: initial?.category_id ?? references.categories[0]?.id ?? "", owner_organization_id: initial?.owner_organization_id ?? references.organizations[0]?.id ?? "", definition: initial?.definition ?? "", formula: initial?.formula ?? "", unit_id: initial?.unit_id ?? references.units[0]?.id ?? "", frequency: initial?.frequency ?? "annual", data_type: initial?.data_type ?? "number", direction: initial?.direction ?? "increase", source_reference: initial?.source_reference ?? "", effective_from: initial?.effective_from ?? "2025-01-01" });
  const [targets, setTargets] = useState<Record<string, string>>(() => Object.fromEntries((initial?.targets ?? []).map((target) => [target.period_id, target.numeric_value ?? target.text_value ?? ""])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const organizations = initial?.organizations.length
        ? initial.organizations.map(({ organization_id, responsibility, is_primary }) => ({ organization_id, responsibility, is_primary }))
        : form.owner_organization_id ? [{ organization_id: form.owner_organization_id, responsibility: "primary_producer", is_primary: true }] : [];
      const primary = organizations.find((organization) => organization.is_primary);
      if (primary && primary.organization_id !== form.owner_organization_id) primary.organization_id = form.owner_organization_id;
      await api(initial ? `/indicators/${initial.id}` : "/indicators", { method: initial ? "PATCH" : "POST", mutation: true, body: jsonBody({ ...form, code: form.code.toUpperCase(), formula: form.formula || null, source_reference: form.source_reference || null, access_level: "internal", change_notes: initial ? "Metadata draft diperbarui melalui formulir." : "Dibuat melalui formulir master indikator.", organizations, targets: annualPeriods.filter((period) => targets[period.id]?.trim()).map((period) => ({ period_id: period.id, numeric_value: Number(targets[period.id]), notes: "Target draft; menunggu validasi." })) }) });
      onCreated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Indikator gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal title={initial ? "Ubah indikator draft" : "Tambah indikator"} onClose={onClose} wide>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><Notice tone="warning">{initial ? "Perubahan hanya diterapkan pada versi draft dan dicatat dalam audit." : "Indikator baru disimpan sebagai draft dan tidak langsung dipublikasikan."}</Notice><div className="form-grid"><label className="field"><span>Kode</span><input value={form.code} onChange={(e) => update("code", e.target.value.replace(/\s+/gu, "_"))} required /></label><label className="field"><span>Nama indikator</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label><label className="field"><span>Kategori</span><select value={form.category_id} onChange={(e) => update("category_id", e.target.value)} required>{references.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>OPD utama</span><select value={form.owner_organization_id} onChange={(e) => update("owner_organization_id", e.target.value)} required>{references.organizations.map((item) => <option key={item.id} value={item.id}>{item.short_name ?? item.name}</option>)}</select></label><label className="field"><span>Satuan</span><select value={form.unit_id} onChange={(e) => update("unit_id", e.target.value)} required>{references.units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Tipe data</span><select value={form.data_type} onChange={(e) => update("data_type", e.target.value)}><option value="number">Angka</option><option value="integer">Bilangan bulat</option><option value="percentage">Persentase</option><option value="currency">Mata uang</option></select></label><label className="field"><span>Arah capaian</span><select value={form.direction} onChange={(e) => update("direction", e.target.value)}><option value="increase">Naik</option><option value="decrease">Turun</option><option value="maintain">Dipertahankan</option></select></label><label className="field"><span>Berlaku mulai</span><input type="date" value={form.effective_from} onChange={(e) => update("effective_from", e.target.value)} required /></label></div><label className="field"><span>Definisi operasional</span><textarea rows={3} value={form.definition} onChange={(e) => update("definition", e.target.value)} required /></label><label className="field"><span>Rumus perhitungan</span><textarea rows={2} value={form.formula} onChange={(e) => update("formula", e.target.value)} /></label><label className="field"><span>Sumber rujukan</span><input value={form.source_reference} onChange={(e) => update("source_reference", e.target.value)} /></label><fieldset className="target-fields"><legend>Target tahunan draft</legend><div>{annualPeriods.map((period) => <label className="field" key={period.id}><span>{period.code}</span><input type="number" step="any" value={targets[period.id] ?? ""} onChange={(e) => setTargets((current) => ({ ...current, [period.id]: e.target.value }))} /></label>)}</div></fieldset><footer className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan sebagai draft"}</button></footer></form></Modal>;
}
