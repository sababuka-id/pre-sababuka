import { AlertTriangle, Check, ChevronRight, Menu, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, Notice, Spinner, useAsync } from "../components";
import type { AdminMenuItem, Permission, Role } from "../types";

function riskTone(risk: Permission["risk_level"]): "neutral" | "warning" | "danger" {
  if (risk === "critical") return "danger";
  if (risk === "elevated") return "warning";
  return "neutral";
}

export function RolesPage() {
  const { user } = useAuth();
  const canManage = user?.permissions.includes("role.manage") ?? false;
  const result = useAsync(() => Promise.all([
    api<{ data: Role[] }>("/roles"),
    api<{ data: Permission[] }>("/permissions"),
  ]).then(([roles, permissions]) => ({ roles: roles.data, permissions: permissions.data })), []);
  const [roleId, setRoleId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const currentRole = result.data?.roles.find((role) => role.id === roleId) ?? result.data?.roles[0];
  useEffect(() => {
    if (result.data && !roleId) setRoleId(result.data.roles[0]?.id ?? "");
  }, [result.data, roleId]);
  useEffect(() => {
    if (!currentRole || !result.data) return;
    const ids = result.data.permissions.filter((permission) => currentRole.permissions.includes(permission.code)).map((permission) => permission.id);
    setSelected(new Set(ids));
    setMessage(null);
  }, [currentRole?.id, result.data]);
  const groups = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const permission of result.data?.permissions ?? []) {
      const key = permission.code.split(".", 1)[0] ?? "other";
      grouped.set(key, [...(grouped.get(key) ?? []), permission]);
    }
    return [...grouped.entries()];
  }, [result.data]);
  async function save() {
    if (!currentRole) return;
    setBusy(true); setMessage(null);
    try {
      await api(`/roles/${currentRole.id}/permissions`, { method: "PUT", mutation: true, body: jsonBody({ permission_ids: [...selected] }) });
      setMessage({ tone: "success", text: "Hak akses peran berhasil diperbarui." });
      result.reload();
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Hak akses gagal disimpan." }); }
    finally { setBusy(false); }
  }
  if (result.loading) return <div className="panel-loading"><Spinner /></div>;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Peran tidak dapat dimuat."}</Notice>;
  return <div className="access-layout">
    <aside className="role-list"><div className="role-list-head"><ShieldCheck /><span><strong>Daftar peran</strong><small>{result.data.roles.length} peran tersedia</small></span></div>{result.data.roles.map((role) => <button key={role.id} className={currentRole?.id === role.id ? "active" : ""} onClick={() => setRoleId(role.id)}><span><strong>{role.name}</strong><small>{role.code === "superadmin" ? "Pengelola teknis" : role.code} - {role.permissions.length} hak akses</small></span><ChevronRight /></button>)}</aside>
    <section className="panel permission-panel"><header className="panel-heading"><div><span className="eyebrow">Peran terpilih</span><h2>{currentRole?.name}</h2><p>{currentRole?.description}</p></div><div className="heading-actions">{currentRole?.is_system && <Badge tone="info">Peran sistem</Badge>}{canManage && <button className="button primary" disabled={busy} onClick={save}><Save />{busy ? "Menyimpan…" : "Simpan hak akses"}</button>}</div></header>{message && <Notice tone={message.tone}>{message.text}</Notice>}{!canManage && <Notice tone="warning">Anda dapat melihat hak akses, tetapi tidak dapat mengubahnya.</Notice>}<div className="permission-groups">{groups.map(([group, permissions]) => <section key={group}><header><strong>{group.replaceAll("_", " ")}</strong><span>{permissions.filter((permission) => selected.has(permission.id)).length}/{permissions.length} aktif</span></header><div>{permissions.map((permission) => <label className="permission-row" key={permission.id}><input type="checkbox" disabled={!canManage} checked={selected.has(permission.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(permission.id)) next.delete(permission.id); else next.add(permission.id); return next; })} /><span><strong>{permission.name}</strong><code>{permission.code}</code></span><Badge tone={riskTone(permission.risk_level)}>{permission.risk_level}</Badge></label>)}</div></section>)}</div></section>
  </div>;
}

export function MenusPage() {
  const result = useAsync(() => Promise.all([
    api<{ data: Role[] }>("/roles"),
    api<{ data: AdminMenuItem[] }>("/menus"),
  ]).then(([roles, menus]) => ({ roles: roles.data, menus: menus.data })), []);
  const [roleId, setRoleId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  useEffect(() => { if (result.data && !roleId) setRoleId(result.data.roles[0]?.id ?? ""); }, [result.data, roleId]);
  useEffect(() => {
    if (!roleId) return;
    let active = true;
    setSelectionLoading(true);
    api<{ menu_ids: string[] }>(`/roles/${roleId}/menus`).then((response) => {
      if (active) setSelected(new Set(response.menu_ids));
    }).catch((reason: unknown) => {
      if (active) setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Konfigurasi menu tidak dapat dimuat." });
    }).finally(() => { if (active) setSelectionLoading(false); });
    return () => { active = false; };
  }, [roleId]);
  const roots = useMemo(() => result.data?.menus.filter((item) => !item.parent_id) ?? [], [result.data]);
  async function save() {
    if (!roleId) return;
    setBusy(true); setMessage(null);
    try {
      await api(`/roles/${roleId}/menus`, { method: "PUT", mutation: true, body: jsonBody({ menu_ids: [...selected] }) });
      setMessage({ tone: "success", text: "Susunan menu peran berhasil disimpan." });
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Menu gagal disimpan." }); }
    finally { setBusy(false); }
  }
  if (result.loading) return <div className="panel-loading"><Spinner /></div>;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Menu tidak dapat dimuat."}</Notice>;
  return <section className="panel menu-config"><header className="panel-heading"><div><span className="eyebrow">Visibilitas navigasi</span><h2>Menu per peran</h2><p>Menu induk ditambahkan otomatis ketika salah satu submenu dipilih.</p></div><div className="heading-actions"><select aria-label="Pilih peran" value={roleId} onChange={(event) => { setRoleId(event.target.value); setSelected(new Set()); setMessage(null); }}>{result.data.roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select><button className="button primary" onClick={save} disabled={busy || selectionLoading}><Save />{busy ? "Menyimpan…" : selectionLoading ? "Memuat…" : "Simpan menu"}</button></div></header>{message && <Notice tone={message.tone}>{message.text}</Notice>}<Notice tone="warning"><AlertTriangle size={18} /> Menu inti Developer tidak dapat dihapus untuk mencegah kehilangan akses administrasi.</Notice><div className="menu-tree">{selectionLoading ? <div className="panel-loading"><Spinner label="Memuat menu peran" /></div> : roots.length ? roots.map((root) => { const children = result.data!.menus.filter((item) => item.parent_id === root.id); return <section key={root.id}><label className="menu-root"><span className="menu-node-icon"><Menu /></span><span><strong>{root.label}</strong><small>{root.route_name ?? "Kelompok menu"}</small></span><input type="checkbox" checked={selected.has(root.id)} onChange={() => setSelected((current) => toggle(current, root.id))} /></label>{children.map((child) => <label className="menu-child" key={child.id}><span className="tree-line" /><span><strong>{child.label}</strong><small>{child.required_permission ?? "Tanpa hak akses khusus"}</small></span><input type="checkbox" checked={selected.has(child.id)} onChange={() => setSelected((current) => toggle(current, child.id))} /></label>)}</section>; }) : <EmptyState title="Menu belum tersedia">Seed menu perlu diterapkan pada database.</EmptyState>}</div></section>;
}

function toggle(values: Set<string>, id: string): Set<string> {
  const next = new Set(values);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}
