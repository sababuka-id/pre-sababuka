import { Bell, CheckCheck, ScrollText } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, formatDate, Notice, Pagination, Spinner, useAsync } from "../components";
import type { AuditEvent, NotificationItem, PageResponse } from "../types";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const result = useAsync(() => api<{ data: NotificationItem[]; unread_count: number }>(`/notifications?unread_only=${unreadOnly}`), [unreadOnly]);
  const read = async (id: string) => { await api(`/notifications/${id}/read`, { method: "POST", mutation: true }); result.reload(); };
  const readAll = async () => { await api("/notifications/read-all", { method: "POST", mutation: true }); result.reload(); };
  return <>
    <div className="toolbar"><label className="inline-check"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Belum dibaca saja</label>{Boolean(result.data?.unread_count) && <button className="button secondary" onClick={readAll}><CheckCheck />Tandai semua dibaca</button>}</div>
    <section className="panel notification-page">
      {result.loading ? <div className="panel-loading"><Spinner /></div>
        : result.error ? <Notice tone="error">{result.error}</Notice>
        : !result.data?.data.length ? <EmptyState title="Tidak ada notifikasi">Pembaruan alur kerja akan tampil di sini.</EmptyState>
        : <div className="notification-list">{result.data.data.map((item) => <button key={item.id} className={item.read_at ? "" : "unread"} onClick={() => !item.read_at && read(item.id)}><span className="table-icon"><Bell /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.created_at)} WIB</small></span>{!item.read_at && <i />}</button>)}</div>}
    </section>
  </>;
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("");
  const [entityType, setEntityType] = useState("");
  const url = `/audit/events?page=${page}&page_size=25${eventType ? `&event_type=${encodeURIComponent(eventType)}` : ""}${entityType ? `&entity_type=${encodeURIComponent(entityType)}` : ""}`;
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
      {result.data && <Pagination page={result.data.meta.page} totalPages={result.data.meta.total_pages} onChange={setPage} />}
    </section>
  </>;
}
