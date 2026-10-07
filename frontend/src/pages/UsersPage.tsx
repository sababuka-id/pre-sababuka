import { Check, Copy, KeyRound, Plus, Search, ShieldPlus, UserRound, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { Badge, EmptyState, formatDate, Modal, Notice, Pagination, Spinner, useAsync } from "../components";
import type { Organization, PageResponse, Role, UserSummary } from "../types";

function statusTone(status: UserSummary["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "invited") return "warning";
  if (status === "suspended" || status === "locked") return "danger";
  return "neutral";
}

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<UserSummary | null>(null);
  const [invitation, setInvitation] = useState<{ name: string; token: string; expires: string } | null>(null);
  const users = useAsync(() => api<PageResponse<UserSummary>>(`/users?page=${page}&page_size=20${query ? `&q=${encodeURIComponent(query)}` : ""}`), [page, query]);
  const references = useAsync(() => Promise.all([
    api<PageResponse<Organization>>("/organizations?page_size=100&active=true"),
    api<{ data: Role[] }>("/roles"),
  ]).then(([organizations, roles]) => ({ organizations: organizations.data, roles: roles.data })), []);

  return <>
    <div className="toolbar"><form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search); }}><Search aria-hidden /><input aria-label="Cari pengguna" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, atau username" /><button className="button secondary">Cari</button></form><button className="button primary" onClick={() => setCreateOpen(true)}><Plus />Undang pengguna</button></div>
    {(users.error || references.error) && <Notice tone="error">{users.error?.message ?? references.error?.message}</Notice>}
    <section className="panel table-panel">{users.loading ? <div className="panel-loading"><Spinner /></div> : !users.data?.data.length ? <EmptyState title="Belum ada pengguna">Undang pengguna pertama dan tetapkan peran sesuai tugasnya.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Pengguna</th><th>Organisasi utama</th><th>Status</th><th>MFA</th><th>Login terakhir</th><th>Tindakan</th></tr></thead><tbody>{users.data.data.map((user) => <tr key={user.id}><td><div className="identity-cell"><span className="avatar small">{user.full_name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("")}</span><span><strong>{user.full_name}</strong><small>{user.email}</small></span></div></td><td><span className="cell-main">{user.organization_name ?? "-"}</span><small>{user.organization_code}</small></td><td><Badge tone={statusTone(user.status)}>{user.status}</Badge></td><td><Badge tone={user.mfa_required ? "info" : "neutral"}>{user.mfa_required ? "Wajib" : "Belum wajib"}</Badge></td><td>{formatDate(user.last_login_at)}</td><td><button className="button compact secondary" onClick={() => setAssignUser(user)}><ShieldPlus />Tetapkan peran</button></td></tr>)}</tbody></table></div>}
      {users.data && <Pagination page={users.data.meta.page} totalPages={users.data.meta.total_pages} onChange={setPage} />}</section>
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
  const [roleId, setRoleId] = useState(roles.find((role) => role.code !== "superadmin")?.id ?? roles[0]?.id ?? "");
  const [scope, setScope] = useState<"global" | "organization" | "self" | "published">("organization");
  const [organizationId, setOrganizationId] = useState(user.organization_id ?? organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await api(`/users/${user.id}/role-assignments`, { method: "POST", mutation: true, body: jsonBody({ role_id: roleId, scope_type: scope, organization_id: scope === "organization" ? organizationId : null }) });
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Peran gagal ditetapkan."); }
    finally { setBusy(false); }
  }
  return <Modal title={`Tetapkan peran - ${user.full_name}`} onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><label className="field"><span>Peran</span><select value={roleId} onChange={(event) => setRoleId(event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name} ({role.code})</option>)}</select></label><label className="field"><span>Lingkup akses</span><select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="organization">Organisasi/OPD</option><option value="global">Global</option><option value="self">Data sendiri</option><option value="published">Data terpublikasi</option></select></label>{scope === "organization" && <label className="field"><span>Organisasi</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label>}<Notice tone="warning">Penetapan peran mengubah kewenangan pengguna dan dicatat sebagai audit berisiko tinggi.</Notice><footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}><KeyRound />{busy ? "Menyimpan…" : "Tetapkan peran"}</button></footer></form></Modal>;
}
