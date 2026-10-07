import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Spinner({ label = "Memuat" }: { label?: string }) {
  return <span className="spinner"><LoaderCircle size={17} aria-hidden /> {label}</span>;
}

export function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-symbol">S</div><Spinner label="Menyiapkan ruang kerja" /></div>;
}

export function PageLoading({ label = "Memuat data" }: { label?: string }) {
  return <div className="page-loading" role="status" aria-live="polite"><Spinner label={label} /></div>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">◇</div><h3>{title}</h3><p>{children}</p></div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose(): void; children: ReactNode; wide?: boolean }) {
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={modalRef} tabIndex={-1} className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span className="eyebrow">SABABUKA BERSINAR</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={20} /></button></header>
      <div className="modal-content">{children}</div>
    </section>
  </div>;
}

export function Notice({ tone, children }: { tone: "error" | "success" | "warning"; children: ReactNode | Error }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"} aria-live="polite"><Icon size={18} aria-hidden /><div>{children instanceof Error ? children.message : children}</div></div>;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange(page: number): void }) {
  if (totalPages <= 1) return null;
  return <div className="pagination">
    <button className="button secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /> Sebelumnya</button>
    <span>Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong></span>
    <button className="button secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Berikutnya <ChevronRight size={16} /></button>
  </div>;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif", inactive: "Nonaktif", draft: "Draf", submitted: "Dikirim",
  verified: "Terverifikasi", rejected: "Ditolak", published: "Terbit",
  replaced: "Digantikan", pending: "Menunggu", approved: "Disetujui",
  in_review: "Dalam pemeriksaan BAPPERIDA", opd_verification: "Menunggu verifikasi OPD",
  archived: "Diarsipkan", open: "Terbuka", closed: "Selesai",
};

export function statusLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return STATUS_LABELS[value.toLowerCase()] ?? value.replaceAll("_", " ");
}

export function riskLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", critical: "Kritis" };
  return value ? labels[value.toLowerCase()] ?? value : "-";
}

export function useAsync<T>(loader: () => Promise<T>, dependencies: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader().then((value) => { if (active) setData(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason : new Error(String(reason)));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, revision]);
  return { data, error, loading, reload: () => setRevision((value) => value + 1), setData };
}
