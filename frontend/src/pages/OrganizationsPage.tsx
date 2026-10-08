import { Building2, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, Modal, Notice, Pagination, Spinner, useAsync } from "../components";
import type { Organization, PageResponse } from "../types";

export function OrganizationsPage() {
  const { user } = useAuth();
  const canManage = user?.permissions.includes("organization.manage") ?? false;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const result = useAsync(() => api<PageResponse<Organization>>(`/organizations?page=${page}&page_size=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}`), [page, pageSize, query]);

  return <>
    <div className="toolbar"><form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari organisasi" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama organisasi" /><button className="button secondary">Cari</button></form>{canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah organisasi</button>}</div>
    {result.error && <Notice tone="error">{result.error.message}</Notice>}
    <section className="panel table-panel">{result.loading ? <div className="panel-loading"><Spinner /></div> : !result.data?.data.length ? <EmptyState title="Belum ada organisasi">{canManage ? "Tambahkan OPD atau unit kerja untuk mulai mengatur pengguna dan scope data." : "Belum ada organisasi dalam lingkup yang dapat Anda lihat."}</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Organisasi</th><th>Kode</th><th>Jenis</th><th>Induk</th><th>Status</th></tr></thead><tbody>{result.data.data.map((organization) => <tr key={organization.id}><td><div className="identity-cell"><span className="table-icon"><Building2 /></span><span><strong>{organization.name}</strong><small>{organization.short_name || "Nama singkat belum diisi"}</small></span></div></td><td><code>{organization.code}</code></td><td>{organization.organization_type.replaceAll("_", " ")}</td><td>{organization.parent_id ? "Unit turunan" : "Organisasi utama"}</td><td><Badge tone={organization.is_active ? "success" : "neutral"}>{organization.is_active ? "Aktif" : "Nonaktif"}</Badge></td></tr>)}</tbody></table></div>}
      {result.data && <Pagination page={result.data.meta.page} pageSize={result.data.meta.page_size} totalItems={result.data.meta.total_items} totalPages={result.data.meta.total_pages} sortLabel="Nama A-Z" onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}</section>
    {createOpen && <OrganizationForm onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); result.reload(); }} />}
  </>;
}

function OrganizationForm({ onClose, onCreated }: { onClose(): void; onCreated(): void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState("opd");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await api("/organizations", { method: "POST", mutation: true, body: jsonBody({ code: code.toUpperCase(), name, short_name: shortName || null, organization_type: type }) });
      onCreated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Organisasi gagal dibuat."); }
    finally { setBusy(false); }
  }
  return <Modal title="Tambah organisasi" onClose={onClose}><form className="form-stack" onSubmit={submit}>{error && <Notice tone="error">{error}</Notice>}<div className="form-grid"><label className="field"><span>Kode organisasi</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="DINKES" pattern="[A-Z0-9][A-Z0-9._-]*" required /></label><label className="field"><span>Nama singkat</span><input value={shortName} onChange={(event) => setShortName(event.target.value)} placeholder="Dinas Kesehatan" /></label></div><label className="field"><span>Nama lengkap</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="field"><span>Jenis organisasi</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="opd">OPD</option><option value="regional_secretariat">Sekretariat Daerah</option><option value="planning_agency">Badan Perencanaan</option><option value="data_custodian">Wali Data</option><option value="other">Lainnya</option></select></label><footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? <Spinner label="Menyimpan" /> : "Simpan organisasi"}</button></footer></form></Modal>;
}
