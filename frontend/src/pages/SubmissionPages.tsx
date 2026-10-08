import { BadgeCheck, ClipboardList, Download, FileCheck2, Plus, Save, Send, Trash2, Undo2, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, apiPath, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, capaianStatusLabel, EmptyState, Modal, Notice, Pagination, Spinner, useAsync } from "../components";
import type { Organization, PageResponse, Period, Submission, SubmissionEvidence, SubmissionObservation } from "../types";

function formatIndicatorValue(value: string | number | null | undefined, dataType: string, unit?: string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const suffix = unit ? ` ${unit}` : "";
  if (!["text", "boolean"].includes(dataType)) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(numericValue)}${suffix}`;
    }
  }
  return `${String(value)}${suffix}`;
}

export function SubmissionsPage({ review = false }: { review?: boolean }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(review ? "submitted" : "");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("id"));
  const url = `/submissions?page=${page}&page_size=20${status ? `&status=${status}` : ""}`;
  const submissions = useAsync(() => api<PageResponse<Submission>>(url), [url]);
  const refs = useAsync(async () => {
    const [periods, organizations] = await Promise.all([
      api<{ data: Period[] }>("/periods"),
      api<PageResponse<Organization>>("/organizations?page_size=100&active=true"),
    ]);
    return { periods: periods.data.filter((item) => item.period_type === "annual"), organizations: organizations.data };
  }, []);
  const canCreate = !review && (user?.permissions.includes("submission.create") ?? false);

  return <>
    <div className="toolbar">
      <select aria-label="Filter status capaian" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">Semua status</option><option value="draft">Draf</option>
        <option value="submitted">Capaian dikirim</option><option value="under_review">Capaian sedang diperiksa</option>
        <option value="returned">Capaian perlu perbaikan</option><option value="approved">Capaian disetujui</option>
      </select>
      {canCreate && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Buat form capaian</button>}
    </div>
    <Notice tone="warning">Hanya indikator aktif yang masuk ke formulir. Bukti dukung bersifat privat dan tidak otomatis dipublikasikan.</Notice>
    <section className="panel table-panel governance-table">
      {submissions.loading ? <div className="panel-loading"><Spinner /></div>
        : !submissions.data?.data.length ? <EmptyState title={review ? "Belum ada data untuk ditinjau" : "Belum ada form capaian"}>{review ? "Pengiriman OPD akan tampil setelah diajukan." : "Buat form berdasarkan OPD dan periode pelaporan."}</EmptyState>
        : <div className="table-scroll"><table><thead><tr><th>OPD</th><th>Periode</th><th>Terisi</th><th>Diperbarui</th><th>Status</th></tr></thead><tbody>
          {submissions.data.data.map((item) => <tr key={item.id} className="clickable-row" tabIndex={0} aria-label={`Buka capaian ${item.organization_name}`} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(item.id); } }}>
            <td><div className="identity-cell"><span className="table-icon"><ClipboardList /></span><span><strong>{item.organization_name}</strong><small>{item.organization_code}</small></span></div></td>
            <td>{item.period_label ?? "-"}</td><td>{item.row_count} indikator</td>
            <td>{new Date(item.updated_at).toLocaleDateString("id-ID")}</td>
            <td><Badge tone={item.status === "approved" ? "success" : item.status === "returned" ? "warning" : "neutral"}>{capaianStatusLabel(item.status)}</Badge></td>
          </tr>)}
        </tbody></table></div>}
      {submissions.data && <Pagination page={submissions.data.meta.page} totalPages={submissions.data.meta.total_pages} onChange={setPage} />}
    </section>
    {createOpen && refs.data && <CreateSubmission organizations={refs.data.organizations} periods={refs.data.periods} preferredOrganizationId={user?.organizations[0]?.id} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); submissions.reload(); setSelectedId(id); }} />}
    {selectedId && <SubmissionDetailModal id={selectedId} permissions={user?.permissions ?? []} onClose={() => setSelectedId(null)} onChanged={() => submissions.reload()} />}
  </>;
}

function CreateSubmission({ organizations, periods, preferredOrganizationId, onClose, onCreated }: {
  organizations: Organization[]; periods: Period[]; preferredOrganizationId?: string;
  onClose(): void; onCreated(id: string): void;
}) {
  const [organizationId, setOrganizationId] = useState(preferredOrganizationId ?? organizations[0]?.id ?? "");
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api<Submission>("/submissions", { method: "POST", mutation: true, body: jsonBody({ organization_id: organizationId, period_id: periodId }) });
      onCreated(result.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Form gagal dibuat."); }
    finally { setBusy(false); }
  };
  return <Modal title="Buat form capaian" onClose={onClose}>
    {error && <Notice tone="error">{error}</Notice>}
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span>OPD pelapor</span><select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required>{organizations.map((item) => <option key={item.id} value={item.id}>{item.short_name ?? item.name}</option>)}</select></label>
      <label className="field"><span>Periode</span><select value={periodId} onChange={(e) => setPeriodId(e.target.value)} required>{periods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Membuat…" : "Buat draf"}</button></footer>
    </form>
  </Modal>;
}

function SubmissionDetailModal({ id, permissions, onClose, onChanged }: { id: string; permissions: string[]; onClose(): void; onChanged(): void }) {
  const detail = useAsync(() => api<Submission>(`/submissions/${id}`), [id]);
  const evidence = useAsync(() => api<{ data: SubmissionEvidence[] }>(`/submissions/${id}/evidence`), [id]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const currentValue = (item: SubmissionObservation) => values[item.indicator_version_id] ?? String(item.numeric_value ?? item.text_value ?? "");
  const editable = detail.data ? ["draft", "returned"].includes(detail.data.status) && permissions.includes("submission.update") : false;

  const save = async (item: SubmissionObservation) => {
    setBusy(true); setError("");
    try {
      const raw = currentValue(item); const value = ["text", "boolean"].includes(item.data_type) ? raw : Number(raw);
      await api(`/submissions/${id}/observations/${item.indicator_version_id}`, { method: "PUT", mutation: true, body: jsonBody({ value, notes: notes[item.indicator_version_id] ?? item.notes ?? null }) });
      detail.reload(); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Capaian gagal disimpan."); }
    finally { setBusy(false); }
  };
  const upload = async (file: File, indicatorVersionId: string) => {
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      await api(`/submissions/${id}/evidence?indicator_version_id=${indicatorVersionId}`, { method: "POST", mutation: true, body: form });
      evidence.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bukti dukung gagal diunggah."); }
    finally { setBusy(false); }
  };
  const removeEvidence = async (evidenceId: string) => {
    setBusy(true); setError("");
    try { await api(`/submissions/${id}/evidence/${evidenceId}`, { method: "DELETE", mutation: true }); evidence.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Bukti dukung gagal dihapus."); }
    finally { setBusy(false); }
  };
  const act = async (action: "submit" | "start-review" | "return" | "approve") => {
    let actionNotes: string | null = null;
    if (action === "return") { actionNotes = window.prompt("Tuliskan catatan koreksi untuk OPD:"); if (!actionNotes) return; }
    setBusy(true); setError("");
    try { await api(`/submissions/${id}/actions/${action}`, { method: "POST", mutation: true, body: jsonBody({ notes: actionNotes }) }); detail.reload(); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diubah."); }
    finally { setBusy(false); }
  };
  const action = detail.data?.status === "draft" || detail.data?.status === "returned"
    ? (permissions.includes("submission.submit") ? "submit" : null)
    : detail.data?.status === "submitted" && permissions.includes("submission.review") ? "start-review"
    : detail.data?.status === "under_review" && permissions.includes("submission.approve") ? "approve" : null;

  return <Modal title="Rincian capaian indikator" onClose={onClose} wide>
    {detail.loading ? <div className="panel-loading"><Spinner /></div> : detail.error ? <Notice tone="error">{detail.error}</Notice> : detail.data && <div className="submission-detail">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="detail-grid"><div><span>OPD</span><strong>{detail.data.organization_name}</strong></div><div><span>Periode</span><strong>{detail.data.period_label}</strong></div><div><span>Status capaian</span><strong>{capaianStatusLabel(detail.data.status)}</strong></div><div><span>Terisi</span><strong>{detail.data.row_count} indikator</strong></div></div>
      {detail.data.status === "returned" && <Notice tone="warning">Catatan peninjau: {detail.data.review_notes ?? "Silakan periksa kembali data dan bukti dukung."}</Notice>}
      {!detail.data.observations.length ? <EmptyState title="Belum ada indikator aktif">Aktifkan definisi indikator yang telah disahkan sebelum OPD mengisi realisasi.</EmptyState>
        : <div className="realization-list">{detail.data.observations.map((item) => <section key={item.indicator_version_id} className="realization-card">
          <header><div><strong>{item.indicator_name}</strong><small>{item.indicator_code} - target {formatIndicatorValue(item.target_numeric_value ?? item.target_text_value, item.data_type, item.unit_symbol)}</small></div>{item.observation_id && <Badge tone="success">Sudah diisi</Badge>}</header>
          {editable ? <div className="form-grid"><label className="field"><span>Realisasi</span><input type={["text", "boolean"].includes(item.data_type) ? "text" : "number"} step="any" value={currentValue(item)} onChange={(event) => setValues((current) => ({ ...current, [item.indicator_version_id]: event.target.value }))} /></label><label className="field"><span>Catatan</span><input value={notes[item.indicator_version_id] ?? item.notes ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.indicator_version_id]: event.target.value }))} /></label></div>
            : <div className="realization-readonly"><div><span>Realisasi</span><strong>{formatIndicatorValue(item.numeric_value ?? item.text_value, item.data_type, item.unit_symbol)}</strong></div><div><span>Catatan</span><strong>{item.notes?.trim() || "-"}</strong></div></div>}
          {editable && <div className="realization-actions"><button className="button secondary compact" disabled={busy || !currentValue(item)} onClick={() => save(item)}><Save />Simpan indikator</button><label className="button secondary compact upload-button"><Upload />Bukti dukung<input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, item.indicator_version_id); event.target.value = ""; }} /></label></div>}
        </section>)}</div>}
      <section className="evidence-panel"><h3><FileCheck2 />Bukti dukung privat</h3><p>PDF, JPG, PNG, atau XLSX; maksimum 10 MB. Berkas hanya dapat diakses pengguna yang memiliki akses ke form ini.</p>
        {evidence.loading ? <Spinner /> : !evidence.data?.data.length ? <small>Belum ada bukti dukung.</small> : <div className="evidence-list">{evidence.data.data.map((item) => <div key={item.id}><span><strong>{item.original_filename}</strong><small>{item.indicator_code ?? "Umum"} - {(Number(item.byte_size) / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} KB</small></span><span><a className="icon-button" aria-label="Unduh bukti" href={apiPath(`/submissions/${id}/evidence/${item.id}/download`)}><Download /></a>{editable && <button className="icon-button danger-text" aria-label="Hapus bukti" onClick={() => removeEvidence(item.id)}><Trash2 /></button>}</span></div>)}</div>}
      </section>
      <footer className="detail-actions">
        {["submitted", "under_review"].includes(detail.data.status) && permissions.includes("submission.return") && <button className="button secondary" disabled={busy} onClick={() => act("return")}><Undo2 />Kembalikan</button>}
        {action && <button className="button primary" disabled={busy || (action === "submit" && !detail.data.row_count)} onClick={() => act(action)}>{action === "submit" ? <Send /> : action === "approve" ? <BadgeCheck /> : <ClipboardList />}{action === "submit" ? "Kirim untuk ditinjau" : action === "approve" ? "Setujui capaian" : "Mulai peninjauan"}</button>}
      </footer>
    </div>}
  </Modal>;
}
