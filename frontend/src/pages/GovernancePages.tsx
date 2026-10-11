import { AlertTriangle, CheckCircle2, FolderTree, Gauge, ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, formatCategoryCode, Modal, Notice, Pagination, SortableHeader, Spinner, statusLabel, useAsync, type SortDirection } from "../components";
import type { BulkTransitionResult, Category, Indicator, Organization, PageResponse, Period, PolicyFocus, Unit } from "../types";

const categorySortLabels: Record<string, string> = {
  hierarchy: "Urutan RPJMD", name: "Nama kelompok isu", focus: "Fokus pembangunan",
  count: "Jumlah indikator", status: "Status", updated_at: "Terakhir diperbarui",
};
const indicatorSortLabels: Record<string, string> = {
  hierarchy: "Urutan RPJMD", name: "Nama indikator", focus: "Fokus pembangunan",
  owner: "OPD penanggung jawab", metadata: "Kesiapan metadata", targets: "Jumlah target",
  status: "Tahap", updated_at: "Terakhir diperbarui",
};

export function CategoriesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sortBy, setSortBy] = useState("hierarchy");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");
  const categories = useAsync(() => api<PageResponse<Category>>(`/categories?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}${query ? `&q=${encodeURIComponent(query)}` : ""}`), [page, pageSize, query, sortBy, sortOrder]);
  const changeSort = (column: string, direction: SortDirection) => { setSortBy(column); setSortOrder(direction); setPage(1); };
  const focuses = useAsync(() => api<PageResponse<PolicyFocus>>("/policy-focuses?page_size=100"), []);
  const canManage = user?.permissions.includes("category.manage") ?? false;
  const canSubmit = user?.permissions.includes("category.submit") ?? false;
  const canApprove = user?.permissions.includes("category.approve") ?? false;
  const categoryActionable = (category: Category) => (category.review_status === "draft" && canSubmit)
    || (category.review_status === "in_review" && canApprove && category.submitted_by !== user?.id);
  const selectedCategories = (categories.data?.data ?? []).filter((item) => selectedIds.includes(item.id));
  const selectedDraftCount = selectedCategories.filter((item) => item.review_status === "draft").length;
  const selectedReviewCount = selectedCategories.filter((item) => item.review_status === "in_review" && item.submitted_by !== user?.id).length;
  const bulkTransition = async (action: "submit" | "approve") => {
    setBulkBusy(true); setActionError(""); setBulkMessage("");
    try {
      const result = await api<BulkTransitionResult>(`/categories/bulk-actions/${action}`, { method: "POST", mutation: true, body: jsonBody({ ids: selectedIds }) });
      setBulkMessage(`${result.processed.length} kelompok isu berhasil diproses${result.skipped.length ? `, ${result.skipped.length} dilewati karena belum memenuhi aturan.` : "."}`);
      setSelectedIds([]); categories.reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Aksi massal gagal diproses."); }
    finally { setBulkBusy(false); }
  };
  const transition = async (category: Category, action: "submit" | "approve" | "reject" | "reopen") => {
    setActionError("");
    setRowError((current) => ({ ...current, [category.id]: "" }));
    setBusyCategoryId(category.id);
    try {
      await api(`/categories/${category.id}/actions/${action}`, { method: "POST", mutation: true });
      categories.reload();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Status kelompok isu gagal diubah.";
      setActionError(message);
      setRowError((current) => ({ ...current, [category.id]: message }));
    } finally { setBusyCategoryId(null); }
  };

  return <>
    <div className="toolbar">
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari kelompok isu" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kelompok isu" /><button className="button secondary">Cari</button></form>
      {canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah kelompok isu</button>}
    </div>
    <Notice tone="warning">Kelompok Isu RPJMD berada di bawah Fokus Pembangunan. BAPPERIDA menyetujui kelompok isu terlebih dahulu sebelum indikator di dalamnya dapat diajukan.</Notice>
    {selectedIds.length > 0 && <div className="bulk-action-bar"><span><ListChecks /><strong>{selectedIds.length} kelompok isu dipilih</strong><small>{selectedDraftCount} draf dapat diajukan · {selectedReviewCount} menunggu keputusan</small></span><div>{canSubmit && selectedDraftCount > 0 && <button className="button secondary" disabled={bulkBusy} onClick={() => void bulkTransition("submit")}>Ajukan {selectedDraftCount} draf</button>}{canApprove && selectedReviewCount > 0 && <button className="button primary" disabled={bulkBusy} onClick={() => void bulkTransition("approve")}>Setujui {selectedReviewCount} yang menunggu</button>}<button className="button secondary" onClick={() => setSelectedIds([])}>Bersihkan pilihan</button></div></div>}
    {bulkMessage && <div className="governance-table"><Notice tone="success">{bulkMessage}</Notice></div>}
    {actionError && <div className="governance-table"><Notice tone="error">{actionError}</Notice></div>}
    <section className="panel table-panel governance-table">
      {categories.loading ? <div className="panel-loading"><Spinner /></div> : !categories.data?.data.length ? <EmptyState title="Belum ada kelompok isu">Tambahkan kelompok isu sebagai pengelompokan indikator RPJMD.</EmptyState> : <div className="table-scroll"><table><thead><tr><th className="select-column"><input type="checkbox" aria-label="Pilih semua tugas kelompok isu pada halaman ini" disabled={!categories.data.data.some(categoryActionable)} checked={categories.data.data.some(categoryActionable) && categories.data.data.filter(categoryActionable).every((item) => selectedIds.includes(item.id))} onChange={(event) => setSelectedIds(event.target.checked ? categories.data!.data.filter(categoryActionable).map((item) => item.id) : [])} /></th><SortableHeader label="Kelompok Isu RPJMD" column="name" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Fokus Pembangunan" column="focus" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Indikator" column="count" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Status" column="status" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><th>Tindakan</th></tr></thead><tbody>
        {categories.data.data.map((category) => {
          const selfSubmitted = category.submitted_by === user?.id;
          const action = category.review_status === "draft" && canSubmit ? ["submit", "Ajukan ke BAPPERIDA"] as const
            : category.review_status === "in_review" && canApprove && !selfSubmitted ? ["approve", "Setujui"] as const
            : category.review_status === "rejected" && canSubmit ? ["reopen", "Perbaiki"] as const : null;
          return (
            <tr key={category.id}>
              <td className="select-column"><input type="checkbox" aria-label={categoryActionable(category) ? `Pilih ${category.name}` : `${category.name} belum menjadi tugas pada tahap ini`} disabled={!categoryActionable(category)} checked={selectedIds.includes(category.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} /></td>
              <td><div className="identity-cell"><span className="table-icon"><FolderTree /></span><span><strong>{category.name}</strong><small>{formatCategoryCode(category.code)} · kode teknis {category.code}</small></span></div></td>
              <td>{category.policy_focus_name ?? "Belum dipetakan"}</td><td><strong>{category.indicator_count}</strong></td>
              <td><Badge tone={category.review_status === "approved" ? "success" : category.review_status === "rejected" ? "danger" : "warning"}>{statusLabel(category.review_status)}</Badge></td>
              <td>{action ? <><span className="table-actions"><button className="button secondary" disabled={busyCategoryId === category.id} onClick={() => void transition(category, action[0])}>{busyCategoryId === category.id ? "Memproses…" : action[1]}</button>{category.review_status === "in_review" && canApprove && !selfSubmitted && <button className="button secondary" disabled={busyCategoryId === category.id} onClick={() => void transition(category, "reject")}>Tolak</button>}</span>{rowError[category.id] && <small className="field-error">{rowError[category.id]}</small>}</> : selfSubmitted && category.review_status === "in_review" ? <small className="table-subtitle">Menunggu keputusan akun BAPPERIDA lain.</small> : "-"}</td>
            </tr>
          );
        })}
      </tbody></table></div>}
      {categories.data && <Pagination page={categories.data.meta.page} pageSize={categories.data.meta.page_size} totalItems={categories.data.meta.total_items} totalPages={categories.data.meta.total_pages} sortLabel={`${categorySortLabels[sortBy] ?? "Urutan RPJMD"} ${sortOrder === "asc" ? "menaik" : "menurun"}`} onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kelompok isu gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal title="Tambah Kelompok Isu RPJMD" onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><div className="form-grid"><label className="field"><span>Kode</span><input value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/gu, "_"))} required /></label><label className="field"><span>Fokus Pembangunan</span><select value={focusId} onChange={(e) => setFocusId(e.target.value)}><option value="">Pilih fokus pembangunan</option>{focuses.map((focus) => <option key={focus.id} value={focus.id}>{focus.name}</option>)}</select></label></div><label className="field"><span>Nama Kelompok Isu</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="field"><span>Deskripsi</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label><footer className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan kelompok isu"}</button></footer></form></Modal>;
}

export function IndicatorsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") ?? "");
  const [completeness, setCompleteness] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deepLinkId] = useState(() => new URLSearchParams(window.location.search).get("id"));
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [actionError, setActionError] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sortBy, setSortBy] = useState("hierarchy");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");
  const url = `/indicators?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}${query ? `&q=${encodeURIComponent(query)}` : ""}${focusId ? `&policy_focus_id=${focusId}` : ""}${categoryId ? `&category_id=${categoryId}` : ""}${organizationId ? `&organization_id=${organizationId}` : ""}${status ? `&status=${status}` : ""}${completeness ? `&completeness=${completeness}` : ""}`;
  const indicators = useAsync(() => api<PageResponse<Indicator>>(url), [url]);
  const changeSort = (column: string, direction: SortDirection) => { setSortBy(column); setSortOrder(direction); setPage(1); };
  const refs = useAsync(async () => {
    const [focuses, categories, units, periods, organizations] = await Promise.all([
      api<PageResponse<PolicyFocus>>("/policy-focuses?page_size=100"),
      api<PageResponse<Category>>("/categories?page_size=100"), api<{ data: Unit[] }>("/units"),
      api<{ data: Period[] }>("/periods"), api<PageResponse<Organization>>("/organizations?page_size=100&active=true"),
    ]);
    return { focuses: focuses.data, categories: categories.data, units: units.data, periods: periods.data, organizations: organizations.data };
  }, []);
  const canManage = user?.permissions.includes("indicator.manage") ?? false;
  const canSubmit = (user?.permissions.includes("indicator.submit") ?? false)
    && (user?.roles.some((role) => role.code === "superadmin" || role.code === "indicator_author") ?? false);
  useEffect(() => {
    if (deepLinkId && indicators.data?.data) {
      setSelected(indicators.data.data.find((item) => item.id === deepLinkId || item.version_id === deepLinkId) ?? null);
    }
  }, [deepLinkId, indicators.data]);
  const transition = async (indicator: Indicator, action: "submit" | "approve" | "verify" | "activate" | "retire") => {
    setActionError("");
    try {
      await api(`/indicator-versions/${indicator.version_id}/actions/${action}`, { method: "POST", mutation: true });
      setSelected(null); indicators.reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Status indikator gagal diubah."); }
  };
  const bulkTransition = async (action: "submit" | "approve" | "verify" | "activate") => {
    setBulkBusy(true); setActionError(""); setBulkMessage("");
    try {
      const result = await api<BulkTransitionResult>(`/indicator-versions/bulk-actions/${action}`, { method: "POST", mutation: true, body: jsonBody({ ids: selectedIds }) });
      const reason = result.skipped[0]?.reason;
      setBulkMessage(`${result.processed.length} indikator berhasil diproses${result.skipped.length ? `, ${result.skipped.length} dilewati${reason ? ` (${reason})` : ""}.` : "."}`);
      setSelectedIds([]); indicators.reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Aksi massal indikator gagal diproses."); }
    finally { setBulkBusy(false); }
  };
  const visible = indicators.data?.data ?? [];
  const completeCount = visible.filter((item) => item.metadata_complete).length;
  const activeCount = visible.filter((item) => item.status === "active").length;
  const filteredCategories = refs.data?.categories.filter((category) => !focusId || category.policy_focus_id === focusId) ?? [];
  const canApprove = user?.permissions.includes("indicator.approve") ?? false;
  const canVerify = user?.permissions.includes("indicator.verify") ?? false;
  const canActivate = user?.permissions.includes("indicator.activate") ?? false;
  const isActionable = (indicator: Indicator) =>
    (indicator.status === "draft" && canSubmit && indicator.metadata_complete && indicator.category_review_status === "approved")
    || (indicator.status === "in_review" && canApprove)
    || (indicator.status === "opd_verification" && canVerify)
    || (indicator.status === "approved" && canActivate);
  const actionableVisible = visible.filter(isActionable);
  const selectedIndicators = visible.filter((item) => selectedIds.includes(item.version_id));

  return <>
    <section className="readiness-heading">
      <div><span className="eyebrow">FINALISASI MASTER RPJMD</span><h2>Matriks kesiapan indikator</h2><p>Telusuri dari fokus pembangunan dan kelompok isu, lalu selesaikan tugas sesuai kewenangan Anda.</p></div>
      <div className="readiness-metrics"><span><strong>{indicators.data?.meta.total_items ?? 0}</strong><small>Indikator ditemukan</small></span><span><strong>{completeCount}</strong><small>Metadata lengkap</small></span><span><strong>{activeCount}</strong><small>Sudah aktif</small></span></div>
    </section>
    <div className="toolbar indicator-toolbar readiness-filters">
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari indikator" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama indikator" /><button className="button secondary">Cari</button></form>
      <select aria-label="Filter fokus pembangunan" value={focusId} onChange={(event) => { setFocusId(event.target.value); setCategoryId(""); setPage(1); }}><option value="">Semua fokus pembangunan</option>{refs.data?.focuses.map((focus) => <option key={focus.id} value={focus.id}>{focus.name}</option>)}</select>
      <select aria-label="Filter kelompok isu RPJMD" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Semua kelompok isu</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <select aria-label="Filter OPD penanggung jawab" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setPage(1); }}><option value="">Semua OPD</option>{refs.data?.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select>
      <select aria-label="Filter status indikator" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="draft">Draf</option><option value="in_review">Pemeriksaan BAPPERIDA</option><option value="opd_verification">Verifikasi OPD</option><option value="approved">Siap diaktifkan</option><option value="active">Aktif</option><option value="retired">Diarsipkan</option></select>
      <select aria-label="Filter kelengkapan metadata" value={completeness} onChange={(event) => { setCompleteness(event.target.value); setPage(1); }}><option value="">Semua kelengkapan</option><option value="complete">Metadata lengkap</option><option value="incomplete">Perlu dilengkapi</option></select>
      <div className="mobile-sort-controls"><label><span>Urutkan</span><select aria-label="Urutkan indikator" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}><option value="hierarchy">Urutan RPJMD</option><option value="name">Nama indikator</option><option value="focus">Fokus pembangunan</option><option value="owner">OPD penanggung jawab</option><option value="metadata">Kesiapan metadata</option><option value="targets">Jumlah target</option><option value="status">Tahap</option><option value="updated_at">Terakhir diperbarui</option></select></label><button type="button" className="button secondary" onClick={() => { setSortOrder((current) => current === "asc" ? "desc" : "asc"); setPage(1); }}>{sortOrder === "asc" ? "Menaik ↑" : "Menurun ↓"}</button></div>
      {canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah indikator</button>}
    </div>
    <Notice tone="warning">Urutan kerja: penyusun mengajukan → BAPPERIDA memeriksa → OPD penanggung jawab memverifikasi → BAPPERIDA mengaktifkan. Aksi massal tetap mematuhi urutan dan pemisahan petugas ini.</Notice>
    {selectedIds.length > 0 && <div className="bulk-action-bar"><span><ListChecks /><strong>{selectedIds.length} indikator dipilih</strong><small>Pilihan hanya tersedia untuk tahap yang menjadi kewenangan Anda.</small></span><div>{canSubmit && selectedIndicators.some((item) => item.status === "draft") && <button className="button secondary" disabled={bulkBusy} onClick={() => void bulkTransition("submit")}>Ajukan draf lengkap</button>}{canApprove && selectedIndicators.some((item) => item.status === "in_review") && <button className="button secondary" disabled={bulkBusy} onClick={() => void bulkTransition("approve")}>Kirim ke verifikasi OPD</button>}{canVerify && selectedIndicators.some((item) => item.status === "opd_verification") && <button className="button secondary" disabled={bulkBusy} onClick={() => void bulkTransition("verify")}>Konfirmasi sebagai OPD</button>}{canActivate && selectedIndicators.some((item) => item.status === "approved") && <button className="button primary" disabled={bulkBusy} onClick={() => void bulkTransition("activate")}>Aktifkan yang siap</button>}<button className="button secondary" onClick={() => setSelectedIds([])}>Batal pilih</button></div></div>}
    {bulkMessage && <div className="governance-table"><Notice tone="success">{bulkMessage}</Notice></div>}
    {actionError && <div className="governance-table"><Notice tone="error">{actionError}</Notice></div>}
    <section className="panel table-panel governance-table">
      {indicators.loading ? <div className="panel-loading"><Spinner /></div> : !indicators.data?.data.length ? <EmptyState title="Tidak ada indikator pada filter ini">Ubah filter fokus, kelompok isu, OPD, status, atau kelengkapan.</EmptyState> : <>
        <div className="readiness-mobile-list">{visible.map((indicator) => <IndicatorReadinessCard key={indicator.id} indicator={indicator} actionable={isActionable(indicator)} checked={selectedIds.includes(indicator.version_id)} onToggle={(checked) => setSelectedIds((current) => checked ? [...current, indicator.version_id] : current.filter((id) => id !== indicator.version_id))} onOpen={() => setSelected(indicator)} />)}</div>
        <div className="table-scroll readiness-desktop-table"><table className="readiness-table"><thead><tr><th className="select-column"><input type="checkbox" aria-label="Pilih semua tugas yang dapat diproses pada halaman ini" disabled={!actionableVisible.length} checked={actionableVisible.length > 0 && actionableVisible.every((item) => selectedIds.includes(item.version_id))} onChange={(event) => setSelectedIds(event.target.checked ? actionableVisible.map((item) => item.version_id) : [])} /></th><SortableHeader label="Indikator" column="name" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Fokus & Kelompok Isu" column="focus" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="OPD Penanggung Jawab" column="owner" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Kesiapan Metadata" column="metadata" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Target RPJMD" column="targets" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Tahap" column="status" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /></tr></thead><tbody>{visible.map((indicator) => { const missing = readinessMissing(indicator); const actionable = isActionable(indicator); return <tr key={indicator.id} className="clickable-row" tabIndex={0} aria-label={`Buka detail ${indicator.name}`} onClick={() => setSelected(indicator)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(indicator); } }}><td className="select-column"><input type="checkbox" aria-label={actionable ? `Pilih ${indicator.name}` : `${indicator.name} belum menjadi tugas pada tahap ini`} disabled={!actionable} checked={selectedIds.includes(indicator.version_id)} onClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, indicator.version_id] : current.filter((id) => id !== indicator.version_id))} /></td><td><div className="identity-cell"><span className="table-icon"><Gauge /></span><span><strong>{indicator.name}</strong><small>{indicator.code} · {indicator.unit_symbol ?? indicator.unit_name}</small></span></div></td><td><strong>{indicator.policy_focus_name ?? "Belum dipetakan"}</strong><small>{indicator.category_name}</small></td><td>{indicator.owner_organization_name ?? <span className="missing-text">Belum ditetapkan</span>}</td><td><span className={`readiness-state ${indicator.metadata_complete ? "complete" : "incomplete"}`}>{indicator.metadata_complete ? <CheckCircle2 /> : <AlertTriangle />}{indicator.metadata_complete ? "Lengkap" : `${missing.length} perlu dilengkapi`}</span>{missing.length > 0 && <small>{missing.join(", ")}</small>}</td><td><strong>{indicator.target_count}/5 tahun</strong><small>{indicator.has_rpjmd_targets ? "2025–2029 tersedia" : "Target belum lengkap"}</small></td><td><Badge tone={indicator.status === "active" ? "success" : indicator.status === "opd_verification" || indicator.status === "approved" ? "info" : "warning"}>{statusLabel(indicator.status)}</Badge></td></tr>; })}</tbody></table></div>
      </>}
      {indicators.data && <Pagination page={indicators.data.meta.page} pageSize={indicators.data.meta.page_size} totalItems={indicators.data.meta.total_items} totalPages={indicators.data.meta.total_pages} sortLabel={`${indicatorSortLabels[sortBy] ?? "Urutan RPJMD"} ${sortOrder === "asc" ? "menaik" : "menurun"}`} onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </section>
    {createOpen && refs.data && <IndicatorForm references={refs.data} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); indicators.reload(); }} />}
    {editing && refs.data && <IndicatorForm references={refs.data} initial={editing} onClose={() => setEditing(null)} onCreated={() => { setEditing(null); indicators.reload(); }} />}
    {selected && <IndicatorDetail indicator={selected} permissions={user?.permissions ?? []} canSubmit={canSubmit} canEdit={canManage && selected.status === "draft"} onEdit={() => { setEditing(selected); setSelected(null); }} onAction={(action) => transition(selected, action)} onClose={() => setSelected(null)} />}
  </>;
}

function IndicatorReadinessCard({ indicator, actionable, checked, onToggle, onOpen }: { indicator: Indicator; actionable: boolean; checked: boolean; onToggle(checked: boolean): void; onOpen(): void }) {
  const missing = readinessMissing(indicator);
  return <article className="readiness-mobile-card" role="button" tabIndex={0} aria-label={`Buka detail ${indicator.name}`} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}>
    <header><span className="table-icon"><Gauge /></span><div><strong>{indicator.name}</strong><small>{indicator.code} · {indicator.unit_symbol ?? indicator.unit_name}</small></div><Badge tone={indicator.status === "active" ? "success" : indicator.status === "opd_verification" || indicator.status === "approved" ? "info" : "warning"}>{statusLabel(indicator.status)}</Badge></header>
    <div className="mobile-readiness-group"><span>Fokus & kelompok isu</span><strong>{indicator.policy_focus_name ?? "Belum dipetakan"}</strong><small>{indicator.category_name}</small></div>
    <div className="mobile-readiness-group"><span>OPD penanggung jawab</span><strong>{indicator.owner_organization_name ?? "Belum ditetapkan"}</strong></div>
    <div className="mobile-readiness-facts"><div><span>Metadata</span><strong className={`readiness-state ${indicator.metadata_complete ? "complete" : "incomplete"}`}>{indicator.metadata_complete ? <CheckCircle2 /> : <AlertTriangle />}{indicator.metadata_complete ? "Lengkap" : `${missing.length} kurang`}</strong></div><div><span>Target RPJMD</span><strong>{indicator.target_count}/5 tahun</strong></div></div>
    {missing.length > 0 && <p>Perlu dilengkapi: {missing.join(", ")}.</p>}
    <footer><label onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={!actionable} checked={checked} onChange={(event) => onToggle(event.target.checked)} /><span>{actionable ? "Pilih untuk diproses" : "Belum menjadi tugas Anda"}</span></label><button className="button secondary compact" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }}>Lihat detail</button></footer>
  </article>;
}

function readinessMissing(indicator: Indicator): string[] {
  return [
    !indicator.has_definition && "definisi",
    !indicator.has_unit && "satuan",
    !indicator.has_owner && "OPD",
    !indicator.has_source && "sumber data",
    !indicator.has_rpjmd_targets && "target 2025–2029",
  ].filter((item): item is string => Boolean(item));
}

const directionLabel = (value: Indicator["direction"]) => value === "increase" ? "Naik" : value === "decrease" ? "Turun" : value === "maintain" ? "Dipertahankan" : "-";
const frequencyLabel = (value: string) => ({ annual: "Tahunan", semester: "Semesteran", quarter: "Triwulanan", monthly: "Bulanan", weekly: "Mingguan", event: "Insidental", custom: "Khusus" }[value] ?? value.replaceAll("_", " "));
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
  return <Modal title={indicator.name} onClose={onClose} wide><div className="indicator-detail"><Notice tone="warning">Versi {indicator.version_number} berstatus {statusLabel(indicator.status)}. Metadata dan target perlu validasi resmi.</Notice><div className="detail-grid"><div><span>Kode</span><strong>{indicator.code}</strong></div><div><span>Kelompok Isu RPJMD</span><strong>{indicator.category_name}</strong></div><div><span>OPD utama</span><strong>{indicator.owner_organization_name ?? "-"}</strong></div><div><span>Frekuensi</span><strong>{frequencyLabel(indicator.frequency)}</strong></div><div><span>Satuan</span><strong>{indicator.unit_name}</strong></div><div><span>Arah capaian</span><strong>{directionLabel(indicator.direction)}</strong></div></div><section><h3>Definisi</h3><p>{indicator.definition}</p></section><section><h3>Sumber rujukan</h3><p>{indicator.source_reference ?? "Belum ditetapkan"}</p></section><section><h3>Target tahunan</h3><div className="target-grid">{indicator.targets.map((target) => <div key={target.id}><small>{target.period_code}</small><strong>{formatTarget(target, indicator)}</strong></div>)}</div></section><section><h3>Perangkat daerah terkait</h3><div className="chip-list">{indicator.organizations.map((organization) => <span key={`${organization.organization_id}-${organization.responsibility}`}>{organization.organization_name} - {responsibilityLabel(organization.responsibility)}</span>)}</div></section>{(canEdit || action) && <footer className="detail-actions">{canEdit && <button className="button secondary" onClick={onEdit}>Ubah metadata draf</button>}{action && <button className="button primary" onClick={() => onAction(action[0])}>{action[1]}</button>}</footer>}</div></Modal>;
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
  return <Modal title={initial ? "Ubah indikator draft" : "Tambah indikator"} onClose={onClose} wide>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><Notice tone="warning">{initial ? "Perubahan hanya diterapkan pada versi draft dan dicatat dalam audit." : "Indikator baru disimpan sebagai draft dan tidak langsung dipublikasikan."}</Notice><div className="form-grid"><label className="field"><span>Kode</span><input value={form.code} onChange={(e) => update("code", e.target.value.replace(/\s+/gu, "_"))} required /></label><label className="field"><span>Nama indikator</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label><label className="field"><span>Kelompok Isu RPJMD</span><select value={form.category_id} onChange={(e) => update("category_id", e.target.value)} required>{references.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>OPD utama</span><select value={form.owner_organization_id} onChange={(e) => update("owner_organization_id", e.target.value)} required>{references.organizations.map((item) => <option key={item.id} value={item.id}>{item.short_name ?? item.name}</option>)}</select></label><label className="field"><span>Satuan</span><select value={form.unit_id} onChange={(e) => update("unit_id", e.target.value)} required>{references.units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Tipe data</span><select value={form.data_type} onChange={(e) => update("data_type", e.target.value)}><option value="number">Angka</option><option value="integer">Bilangan bulat</option><option value="percentage">Persentase</option><option value="currency">Mata uang</option></select></label><label className="field"><span>Arah capaian</span><select value={form.direction} onChange={(e) => update("direction", e.target.value)}><option value="increase">Naik</option><option value="decrease">Turun</option><option value="maintain">Dipertahankan</option></select></label><label className="field"><span>Berlaku mulai</span><input type="date" value={form.effective_from} onChange={(e) => update("effective_from", e.target.value)} required /></label></div><label className="field"><span>Definisi operasional</span><textarea rows={3} value={form.definition} onChange={(e) => update("definition", e.target.value)} required /></label><label className="field"><span>Rumus perhitungan</span><textarea rows={2} value={form.formula} onChange={(e) => update("formula", e.target.value)} /></label><label className="field"><span>Sumber rujukan</span><input value={form.source_reference} onChange={(e) => update("source_reference", e.target.value)} /></label><fieldset className="target-fields"><legend>Target tahunan draft</legend><div>{annualPeriods.map((period) => <label className="field" key={period.id}><span>{period.code}</span><input type="number" step="any" value={targets[period.id] ?? ""} onChange={(e) => setTargets((current) => ({ ...current, [period.id]: e.target.value }))} /></label>)}</div></fieldset><footer className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan sebagai draft"}</button></footer></form></Modal>;
}
