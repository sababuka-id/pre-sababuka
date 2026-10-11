import { Building2, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, Modal, Notice, PageSizeControl, Pagination, SortableHeader, Spinner, useAsync, type SortDirection } from "../components";
import type { Organization, PageResponse } from "../types";

export function OrganizationsPage() {
  const { user } = useAuth();
  const canManage = user?.permissions.includes("organization.manage") ?? false;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const result = useAsync(() => api<PageResponse<Organization>>(`/organizations?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}${query ? `&q=${encodeURIComponent(query)}` : ""}${activeFilter ? `&active=${activeFilter}` : ""}`), [page, pageSize, query, activeFilter, sortBy, sortOrder]);
  const changeSort = (column: string, direction: SortDirection) => { setSortBy(column); setSortOrder(direction); setPage(1); };

  return <>
    <div className="toolbar"><div className="table-filters"><form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari organisasi" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama organisasi" /><button className="button secondary">Cari</button></form><select aria-label="Filter status organisasi" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select><PageSizeControl value={pageSize} onChange={(size) => { setPageSize(size); setPage(1); }} /></div>{canManage && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Tambah organisasi</button>}</div>
    {result.error && <Notice tone="error">{result.error.message}</Notice>}
    <section className="panel table-panel">{result.loading ? <div className="panel-loading"><Spinner /></div> : !result.data?.data.length ? <EmptyState title="Belum ada organisasi">{canManage ? "Tambahkan OPD atau unit kerja untuk mulai mengatur pengguna dan scope data." : "Belum ada organisasi dalam lingkup yang dapat Anda lihat."}</EmptyState> : <div className="table-scroll"><table><thead><tr><SortableHeader label="Organisasi" column="name" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><SortableHeader label="Kode" column="code" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><th>Relasi RPJMD</th><SortableHeader label="Jenis" column="type" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /><th>Induk</th><SortableHeader label="Status" column="status" sortBy={sortBy} direction={sortOrder} onSort={changeSort} /></tr></thead><tbody>{result.data.data.map((organization) => { const shortName = organization.short_name?.trim(); const showShortName = shortName && shortName.toLocaleLowerCase("id") !== organization.code.toLocaleLowerCase("id") && shortName.toLocaleLowerCase("id") !== organization.name.toLocaleLowerCase("id"); return <tr key={organization.id}><td><div className="identity-cell"><span className="table-icon"><Building2 /></span><span><strong>{organization.name}</strong>{showShortName && <small>{shortName}</small>}</span></div></td><td><code>{organization.code}</code></td><td><span className="relation-count"><strong>{organization.indicator_count ?? 0} indikator</strong><small>{organization.category_count ?? 0} kelompok isu</small></span></td><td>{organization.organization_type.replaceAll("_", " ")}</td><td>{organization.parent_id ? "Unit turunan" : "Organisasi utama"}</td><td><Badge tone={organization.is_active ? "success" : "neutral"}>{organization.is_active ? "Aktif" : "Nonaktif"}</Badge></td></tr>; })}</tbody></table></div>}
      {result.data && <Pagination page={result.data.meta.page} pageSize={result.data.meta.page_size} totalItems={result.data.meta.total_items} totalPages={result.data.meta.total_pages} sortLabel={`${({ name: "Nama", code: "Kode", type: "Jenis", status: "Status" } as Record<string,string>)[sortBy] ?? "Nama"} ${sortOrder === "asc" ? "menaik" : "menurun"}`} onChange={setPage} showPageSize={false} />}</section>
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
