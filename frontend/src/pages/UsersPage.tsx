import { Archive, Check, Copy, KeyRound, Plus, Search, ShieldPlus, UserRound, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, formatDate, Modal, Notice, Pagination, Spinner, useAsync } from "../components";
import type { Organization, PageResponse, Role, UserSummary } from "../types";

function statusTone(status: UserSummary["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "invited") return "warning";
  if (status === "suspended" || status === "locked") return "danger";
  return "neutral";
}

function userStatusLabel(user: UserSummary): string {
  if (user.status === "invited") return user.has_password ? "Menunggu verifikasi" : "Undangan terkirim";
  if (user.status === "active") return "Aktif";
  if (user.status === "suspended") return "Ditangguhkan";
  if (user.status === "locked") return "Terkunci";
  return "Diarsipkan";
}

type RoleScope = "global" | "organization" | "self" | "published";
const roleScopeRules: Record<string, readonly RoleScope[]> = {
  superadmin: ["global"],
  bapperida: ["global"],
  kominfo: ["global"],
  opd: ["organization"],
  pimpinan: ["published"],
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.permissions.includes("user.create") ?? false;
  const canAssign = currentUser?.permissions.includes("user.assign_role") ?? false;
  const canArchive = currentUser?.permissions.includes("user.activate") ?? false;
  const [archiveBusy, setArchiveBusy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<UserSummary | null>(null);
  const [invitation, setInvitation] = useState<{ name: string; token: string; expires: string } | null>(null);
  const users = useAsync(() => api<PageResponse<UserSummary>>(`/users?page=${page}&page_size=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}${organizationFilter ? `&organization_id=${organizationFilter}` : ""}`), [page, pageSize, query, organizationFilter]);
  const references = useAsync(() => Promise.all([
    api<PageResponse<Organization>>("/organizations?page_size=100&active=true"),
    api<{ data: Role[] }>("/roles"),
  ]).then(([organizations, roles]) => ({ organizations: organizations.data, roles: roles.data })), []);

  async function archiveUser(target: UserSummary) {
    if (!window.confirm(`Arsipkan akun ${target.full_name}? Akun ini langsung tidak dapat login, tetapi riwayat audit tetap dipertahankan.`)) return;
    setArchiveBusy(target.id);
    try {
      await api(`/users/${target.id}`, { method: "PATCH", mutation: true, body: jsonBody({ status: "archived" }) });
      users.reload();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Akun gagal diarsipkan.");
    } finally {
      setArchiveBusy(null);
    }
  }

  return <>
    <div className="toolbar"><div className="table-filters"><form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari pengguna" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, atau username" /><button className="button secondary">Cari</button></form><select aria-label="Filter organisasi pengguna" value={organizationFilter} onChange={(event) => { setOrganizationFilter(event.target.value); setPage(1); }}><option value="">Semua organisasi</option>{references.data?.organizations.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.short_name ?? item.name}</option>)}</select></div>{canCreate && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Undang pengguna</button>}</div>
    {(users.error || references.error) && <Notice tone="error">{users.error?.message ?? references.error?.message}</Notice>}
    <section className="panel table-panel">{users.loading ? <div className="panel-loading"><Spinner /></div> : !users.data?.data.length ? <EmptyState title="Belum ada pengguna">{canCreate ? "Undang pengguna pertama dan tetapkan peran sesuai tugasnya." : "Belum ada pengguna dalam lingkup yang dapat Anda lihat."}</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Pengguna</th><th>Organisasi utama</th><th>Status</th><th>MFA</th><th>Login terakhir</th>{(canAssign || canArchive) && <th>Tindakan</th>}</tr></thead><tbody>{users.data.data.map((target) => <tr key={target.id}><td><div className="identity-cell"><span className="avatar small">{target.full_name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("")}</span><span><strong>{target.full_name}</strong><small>{target.email}</small></span></div></td><td><span className="cell-main">{target.organization_name ?? "-"}</span><small>{target.organization_code}</small></td><td><Badge tone={statusTone(target.status)}>{userStatusLabel(target)}</Badge></td><td><Badge tone={target.mfa_required ? "info" : "neutral"}>{target.mfa_required ? "Wajib" : "Opsional"}</Badge></td><td>{formatDate(target.last_login_at)}</td>{(canAssign || canArchive) && <td className="table-actions">{canAssign && <button className={`button compact ${target.status === "invited" && target.has_password ? "primary" : "secondary"}`} onClick={() => setAssignUser(target)}><ShieldPlus />{target.status === "invited" && target.has_password ? "Verifikasi" : "Tetapkan peran"}</button>}{canArchive && target.status !== "archived" && target.id !== currentUser?.id && <button className="button compact danger" onClick={() => void archiveUser(target)} disabled={archiveBusy === target.id}><Archive />{archiveBusy === target.id ? "Mengarsipkan…" : "Arsipkan"}</button>}</td>}</tr>)}</tbody></table></div>}
      {users.data && <Pagination page={users.data.meta.page} pageSize={users.data.meta.page_size} totalItems={users.data.meta.total_items} totalPages={users.data.meta.total_pages} sortLabel="Nama A-Z" onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}</section>
    {createOpen && references.data && <UserInvitationForm organizations={references.data.organizations} onClose={() => setCreateOpen(false)} onCreated={(created) => { setCreateOpen(false); setInvitation(created); users.reload(); }} />}
    {assignUser && references.data && <RoleAssignmentForm user={assignUser} roles={references.data.roles} organizations={references.data.organizations} onClose={() => setAssignUser(null)} onSaved={() => { setAssignUser(null); users.reload(); }} />}
    {invitation && <InvitationResult invitation={invitation} onClose={() => setInvitation(null)} />}
  </>;
}

function UserInvitationForm({ organizations, onClose, onCreated }: { organizations: Organization[]; onClose(): void; onCreated(value: { name: string; token: string; expires: string }): void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await api<UserSummary & { invitation_token: string; invitation_expires_at: string }>("/users", { method: "POST", mutation: true, body: jsonBody({ email, username: username || null, full_name: name, organization_id: organizationId }) });
      onCreated({ name: response.full_name, token: response.invitation_token, expires: response.invitation_expires_at });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Undangan gagal dibuat."); }
    finally { setBusy(false); }
  }
  return <Modal title="Undang pengguna" onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><label className="field"><span>Nama lengkap</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="field"><span>Email dinas</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@kapuaskab.go.id" required /></label><label className="field"><span>Username opsional</span><input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label className="field"><span>Organisasi utama</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required>{organizations.map((item) => <option value={item.id} key={item.id}>{item.code} - {item.name}</option>)}</select></label><Notice tone="warning">Pengguna belum dapat masuk sebelum menerima undangan, membuat password, dan memverifikasi Authenticator.</Notice><footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy || !organizationId}>{busy ? <Spinner label="Membuat" /> : "Buat undangan"}</button></footer></form></Modal>;
}

function InvitationResult({ invitation, onClose }: { invitation: { name: string; token: string; expires: string }; onClose(): void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/activate?token=${encodeURIComponent(invitation.token)}`;
  async function copy() { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  return <Modal title="Undangan berhasil dibuat" onClose={onClose}><div className="success-symbol"><Check /></div><p className="modal-lead">Sampaikan tautan berikut hanya kepada <strong>{invitation.name}</strong> melalui kanal internal yang aman.</p><div className="invite-link"><code>{link}</code><button onClick={copy}>{copied ? <Check /> : <Copy />}</button></div><Notice tone="warning">Tautan berlaku sampai {formatDate(invitation.expires)} dan hanya dapat digunakan satu kali.</Notice><footer className="modal-actions"><button className="button primary" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Tautan tersalin" : "Salin tautan"}</button><button className="button secondary" onClick={onClose}>Selesai</button></footer></Modal>;
}

function RoleAssignmentForm({ user, roles, organizations, onClose, onSaved }: { user: UserSummary; roles: Role[]; organizations: Organization[]; onClose(): void; onSaved(): void }) {
  const approvalMode = user.status === "invited" && user.has_password;
  const [roleId, setRoleId] = useState(roles.find((role) => role.code !== "superadmin")?.id ?? roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === roleId);
  const allowedScopes = selectedRole ? roleScopeRules[selectedRole.code] ?? [] : [];
  const [scope, setScope] = useState<RoleScope>(allowedScopes[0] ?? "organization");
  const [organizationId, setOrganizationId] = useState(user.organization_id ?? organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      if (!selectedRole || !allowedScopes.includes(scope)) throw new Error("Role tersebut belum memiliki aturan scope yang sah.");
      await api(`/users/${user.id}/${approvalMode ? "approve-registration" : "role-assignments"}`, { method: "POST", mutation: true, body: jsonBody({ role_id: roleId, scope_type: scope, organization_id: scope === "organization" ? organizationId : null }) });
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Peran gagal ditetapkan."); }
    finally { setBusy(false); }
  }
  return <Modal title={`${approvalMode ? "Verifikasi pendaftaran" : "Tetapkan peran"} - ${user.full_name}`} onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><label className="field"><span>Peran</span><select value={roleId} onChange={(event) => { const nextRoleId = event.target.value; const nextRole = roles.find((role) => role.id === nextRoleId); setRoleId(nextRoleId); setScope(roleScopeRules[nextRole?.code ?? ""]?.[0] ?? "organization"); }}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className="field"><span>Lingkup akses</span><select value={scope} onChange={(event) => setScope(event.target.value as RoleScope)}>{allowedScopes.map((item) => <option value={item} key={item}>{item === "organization" ? "Organisasi/OPD" : item === "published" ? "Data terpublikasi" : item === "global" ? "Global" : "Data sendiri"}</option>)}</select></label>{scope === "organization" && <label className="field"><span>Organisasi</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label>}{!allowedScopes.length && <Notice tone="error">Peran ini belum memiliki kebijakan lingkup yang sah.</Notice>}<Notice tone="warning">{approvalMode ? "Verifikasi akan mengaktifkan akun sekaligus menetapkan peran. Tindakan ini dicatat dalam audit." : "Penetapan peran mengubah kewenangan pengguna dan dicatat dalam audit."}</Notice><footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy || !allowedScopes.length}><KeyRound />{busy ? "Menyimpan…" : approvalMode ? "Setujui dan aktifkan" : "Tetapkan peran"}</button></footer></form></Modal>;
}
