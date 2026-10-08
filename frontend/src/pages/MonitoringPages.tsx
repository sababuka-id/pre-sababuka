import { Bell, CheckCheck, ScrollText } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Badge, EmptyState, formatDate, Notice, Pagination, Spinner, useAsync } from "../components";
import type { AuditEvent, NotificationItem, PageResponse } from "../types";
import { navigate } from "../router";

function hasMenuRoute(menu: import("../types").MenuItem[], route: string): boolean {
  return menu.some((item) => item.route_name === route || hasMenuRoute(item.children ?? [], route));
}

function notificationDestination(item: NotificationItem, permissions: string[], menu: import("../types").MenuItem[]): string {
  const entity = item.entity_id ? `?id=${encodeURIComponent(item.entity_id)}` : "";
  if ((item.entity_type === "data_batch" || item.notification_type.startsWith("submission.")) && permissions.includes("submission.review") && hasMenuRoute(menu, "/reviews")) return `/reviews${entity}`;
  if ((item.entity_type === "data_batch" || item.notification_type.startsWith("submission.")) && permissions.includes("submission.view") && hasMenuRoute(menu, "/submissions")) return `/submissions${entity}`;
  if ((item.entity_type === "publication" || item.notification_type.startsWith("publication.")) && permissions.includes("publication.view") && hasMenuRoute(menu, "/publications")) return `/publications${entity}`;
  if ((item.entity_type === "publication" || item.notification_type.startsWith("publication.")) && permissions.includes("executive_dashboard.view") && hasMenuRoute(menu, "/executive")) return "/executive";
  if (item.entity_type === "indicator_version" || item.notification_type.startsWith("indicator.")) return permissions.includes("indicator.view") && hasMenuRoute(menu, "/governance/indicators") ? `/governance/indicators${entity}` : "/notifications";
  if (item.entity_type === "category" || item.notification_type.startsWith("category.")) return permissions.includes("category.view") && hasMenuRoute(menu, "/governance/categories") ? `/governance/categories${entity}` : "/notifications";
  return "/notifications";
}

export function NotificationsPage() {
  const { user, menu } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const result = useAsync(() => api<{ data: NotificationItem[]; unread_count: number }>(`/notifications?unread_only=${unreadOnly}`), [unreadOnly]);
  const [actionError, setActionError] = useState<string | null>(null);
  const read = async (item: NotificationItem) => {
    setActionError(null);
    try { if (!item.read_at) await api(`/notifications/${item.id}/read`, { method: "POST", mutation: true }); result.reload(); navigate(notificationDestination(item, user?.permissions ?? [], menu)); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Notifikasi tidak dapat dibuka."); }
  };
  const readAll = async () => { await api("/notifications/read-all", { method: "POST", mutation: true }); result.reload(); };
  return <>
    <div className="toolbar"><label className="inline-check"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Belum dibaca saja</label>{Boolean(result.data?.unread_count) && <button className="button secondary" onClick={readAll}><CheckCheck />Tandai semua dibaca</button>}</div>
    {actionError && <Notice tone="error">{actionError}</Notice>}<section className="panel notification-page">
      {result.loading ? <div className="panel-loading"><Spinner /></div>
        : result.error ? <Notice tone="error">{result.error}</Notice>
        : !result.data?.data.length ? <EmptyState title="Tidak ada notifikasi">Pembaruan alur kerja akan tampil di sini.</EmptyState>
        : <div className="notification-list">{result.data.data.map((item) => <button key={item.id} className={item.read_at ? "" : "unread"} onClick={() => void read(item)} aria-label={`Buka notifikasi ${item.title}`}><span className="table-icon"><Bell /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.created_at)} WIB · Klik untuk membuka terkait</small></span>{!item.read_at && <i />}</button>)}</div>}
    </section>
  </>;
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventType, setEventType] = useState("");
  const [entityType, setEntityType] = useState("");
  const url = `/audit/events?page=${page}&page_size=${pageSize}${eventType ? `&event_type=${encodeURIComponent(eventType)}` : ""}${entityType ? `&entity_type=${encodeURIComponent(entityType)}` : ""}`;
  const result = useAsync(() => api<PageResponse<AuditEvent>>(url), [url]);
  return <>
    <div className="toolbar audit-filter">
      <input aria-label="Filter jenis aktivitas" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} placeholder="Filter aktivitas, contoh submission.approve" />
      <input aria-label="Filter tipe entitas" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} placeholder="Tipe entitas" />
    </div>
    <Notice tone="warning">Audit bersifat append-only. Tampilan mengikuti lingkup organisasi pengguna.</Notice>
    <section className="panel table-panel governance-table">
      {result.loading ? <div className="panel-loading"><Spinner /></div>
        : !result.data?.data.length ? <EmptyState title="Belum ada audit">Aktivitas yang berada dalam lingkup Anda akan tampil di sini.</EmptyState>
        : <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Aktivitas</th><th>Entitas</th><th>Aktor</th><th>Organisasi</th><th>Request ID</th></tr></thead><tbody>{result.data.data.map((item) => <tr key={item.id}><td>{formatDate(item.occurred_at)} WIB</td><td><div className="identity-cell"><span className="table-icon"><ScrollText /></span><span><strong>{item.event_type}</strong><small>{item.id}</small></span></div></td><td><Badge tone="neutral">{item.entity_type}</Badge></td><td>{item.actor_name ?? "Sistem"}</td><td>{item.organization_name ?? "Global"}</td><td><code>{item.request_id?.slice(0, 8) ?? "-"}</code></td></tr>)}</tbody></table></div>}
      {result.data && <Pagination page={result.data.meta.page} pageSize={result.data.meta.page_size} totalItems={result.data.meta.total_items} totalPages={result.data.meta.total_pages} sortLabel="Aktivitas terbaru" onChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </section>
  </>;
}
