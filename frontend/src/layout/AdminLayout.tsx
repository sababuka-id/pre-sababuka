import {
  Bell,
  CheckCheck,
  Building2,
  ChevronDown,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
  FolderTree,
  Gauge,
  Target,
  ClipboardList,
  ListChecks,
  ChartNoAxesCombined,
  Bot,
  BadgeCheck,
  ScrollText,
  Activity,
  Plug,
  HelpCircle,
  MapPinned,
  WalletCards,
  HeartHandshake,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth";
import { navigate } from "../router";
import type { MenuItem, NotificationItem } from "../types";
import { api } from "../api";
import { notificationDestination } from "../notification-routing";

const iconByCode: Record<string, typeof LayoutDashboard> = {
  organizations: Building2,
  users: Users,
  roles: ShieldCheck,
  menus: PanelLeftOpen,
  "system-settings": SlidersHorizontal,
  focuses: Target,
  categories: FolderTree,
  indicators: Gauge,
  submissions: ClipboardList,
  reviews: ListChecks,
  dashboard: LayoutDashboard,
  executive: ChartNoAxesCombined,
  assistant: Bot,
  publications: BadgeCheck,
  operations: Activity,
  "opd-profile": ClipboardList,
  connectors: Plug,
  analysis: MapPinned,
  finance: WalletCards,
  "public-services": HeartHandshake,
};

const supportedRoutes = new Set(["/admin", "/dashboard", "/executive", "/assistant", "/analysis", "/finance", "/public-services", "/notifications", "/audit", "/operations", "/opd-profile", "/admin/organizations", "/admin/opd-monitoring", "/admin/users", "/admin/roles", "/admin/menus", "/admin/system", "/governance/categories", "/governance/indicators", "/submissions", "/reviews", "/publications", "/connectors"]);

const navigationLabels: Record<string, string> = {
  categories: "Kelompok Isu RPJMD",
  indicators: "Matriks Indikator",
  operations: "Beranda Tugas",
  "opd-profile": "Profil Data RPJMD/Renstra",
  submissions: "Pelaporan Realisasi",
  reviews: "Verifikasi Pelaporan OPD",
  publications: "Kurasi dan Publikasi",
  assistant: "Asisten Data",
  roles: "Peran dan Hak Akses",
  connectors: "Ruang Walidata",
  analysis: "Analisis dan Peta",
  finance: "Keuangan Daerah",
  "public-services": "Layanan Publik",
};

const roleLabels: Record<string, string> = {
  superadmin: "Pengelola Sistem",
  pimpinan: "Pimpinan",
  bapperida: "Verifikator BAPPERIDA",
  kominfo: "Walidata Diskominfosantik",
  opd: "Admin/PIC OPD",
};

function sectionChildren(menu: MenuItem[], code: string): MenuItem[] {
  return menu.find((item) => item.code === code)?.children.filter((item) => item.route_name && supportedRoutes.has(item.route_name)) ?? [];
}

export function AdminLayout({ pathname, title, subtitle, actions, children }: { pathname: string; title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  const { user, menu, logout, startPreview, stopPreview } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationPreview, setNotificationPreview] = useState<NotificationItem[]>([]);
  const [previewOrganizations, setPreviewOrganizations] = useState<Array<{ id: string; code: string; name: string; short_name: string | null }>>([]);
  const [previewOrganizationId, setPreviewOrganizationId] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const governanceEntries = useMemo(() => sectionChildren(menu, "governance"), [menu]);
  const adminEntries = useMemo(() => sectionChildren(menu, "administration"), [menu]);
  const isSuperadmin = user?.roles.some((role) => role.code === "superadmin") ?? false;
  const isRolePreview = Boolean(user?.simulation?.active);
  const isBapperida = user?.roles.some((role) => role.code === "bapperida") ?? false;
  const operationalEntries = useMemo(() => menu.filter((item) => ["operations", "opd-profile", "submissions", "reviews", "publications"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name) && !(!isSuperadmin && isBapperida && item.code === "submissions")), [menu, isSuperadmin, isBapperida]);
  const sourceEntries = useMemo(() => menu.filter((item) => item.code === "connectors" && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const primaryEntries = useMemo(() => menu.filter((item) => ["dashboard", "assistant"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const analysisEntries = useMemo(() => menu.filter((item) => ["analysis", "finance", "public-services"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const auditEntries = useMemo(() => menu.filter((item) => item.code === "audit" && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const isPimpinan = user?.roles.some((role) => role.code === "pimpinan") ?? false;
  const areaLabel = pathname.startsWith("/admin") ? "Konfigurasi Internal"
    : ["/dashboard", "/executive", "/assistant"].includes(pathname) ? "Ruang Pimpinan"
    : ["/analysis", "/finance", "/public-services"].includes(pathname) ? "Analisis Keputusan"
    : pathname === "/connectors" ? "Walidata Diskominfosantik"
    : pathname.startsWith("/governance") ? "Tata Kelola Data"
    : ["/operations", "/submissions", "/reviews", "/publications"].includes(pathname) ? "Pelaporan dan Verifikasi"
    : "Ruang Kerja SABABUKA";
  const initials = user?.full_name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SA";
  const roleCode = user?.roles[0]?.code ?? "opd";
  const help = roleHelp[roleCode] ?? roleHelp.opd;

  useEffect(() => {
    setProfileOpen(false);
    setHelpOpen(false);
    setNotificationOpen(false);
    window.scrollTo({ top: 0, left: 0 });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".topbar-context strong")?.focus());
  }, [pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setProfileOpen(false); setHelpOpen(false); setNotificationOpen(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      const result = await api<{ data: NotificationItem[]; unread_count: number }>("/notifications?unread_only=false");
      setUnreadNotifications(result.unread_count);
      setNotificationPreview(result.data.slice(0, 5));
    } catch {
      setUnreadNotifications(0);
      setNotificationPreview([]);
    } finally { setNotificationLoading(false); }
  }, []);
  useEffect(() => {
    void loadNotifications();
    const refresh = () => { void loadNotifications(); };
    const timer = window.setInterval(refresh, 20_000);
    window.addEventListener("sababuka:notifications-changed", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("sababuka:notifications-changed", refresh); };
  }, [user?.id, pathname, loadNotifications]);

  useEffect(() => {
    if (!isSuperadmin) return;
    api<{ organizations: Array<{ id: string; code: string; name: string; short_name: string | null }> }>("/me/preview-options")
      .then((result) => { setPreviewOrganizations(result.organizations); setPreviewOrganizationId((current) => current || result.organizations[0]?.id || ""); })
      .catch(() => setPreviewOrganizations([]));
  }, [isSuperadmin]);

  const go = (path: string) => { navigate(path); setMobile(false); setProfileOpen(false); };
  const openNotification = async (item: NotificationItem) => {
    if (!item.read_at) await api(`/notifications/${item.id}/read`, { method: "POST", mutation: true });
    setNotificationOpen(false);
    go(notificationDestination(item, user?.permissions ?? [], menu));
  };
  const markAllNotificationsRead = async () => {
    await api("/notifications/read-all", { method: "POST", mutation: true });
    await loadNotifications();
  };
  const notificationTime = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const enterPreview = async (role: "bapperida" | "kominfo" | "opd" | "pimpinan", organizationId?: string) => {
    setPreviewBusy(true); setPreviewError(null);
    try {
      await startPreview(role, organizationId);
      setProfileOpen(false);
      navigate(role === "pimpinan" ? "/dashboard" : role === "kominfo" ? "/connectors" : "/operations");
    } catch (error) { setPreviewError(error instanceof Error ? error.message : "Mode pratinjau tidak dapat dibuka."); }
    finally { setPreviewBusy(false); }
  };
  const leavePreview = async () => { setPreviewBusy(true); await stopPreview(); setPreviewBusy(false); setProfileOpen(false); navigate("/admin"); };
  const doLogout = async () => { await logout(); navigate("/login"); };
  return <div className={`workspace ${collapsed ? "collapsed" : ""}`}>
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-logo"><img src="/logo-kapuas.png" alt="Lambang Kabupaten Kapuas" /></div><div className="sidebar-brand-copy"><strong>SABABUKA</strong></div><button className="mobile-close" aria-label="Tutup menu" onClick={() => setMobile(false)}><X /></button></div>
      <nav>
        {isSuperadmin && <button className={`nav-link ${pathname === "/admin" ? "active" : ""}`} aria-current={pathname === "/admin" ? "page" : undefined} title={collapsed ? "Beranda Administrasi" : undefined} onClick={() => go("/admin")}><LayoutDashboard /><span>Beranda Administrasi</span></button>}
        {isSuperadmin && <button className={`nav-link ${pathname === "/admin/opd-monitoring" ? "active" : ""}`} aria-current={pathname === "/admin/opd-monitoring" ? "page" : undefined} title={collapsed ? "Kesiapan OPD" : undefined} onClick={() => go("/admin/opd-monitoring")}><Building2 /><span>Kesiapan OPD</span></button>}
        {primaryEntries.length > 0 && <div className="nav-label">Ruang pimpinan</div>}
        {primaryEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? LayoutDashboard; const label = navigationLabels[entry.code] ?? entry.label; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>; })}
        {analysisEntries.length > 0 && <div className="nav-label">Analisis keputusan</div>}
        {analysisEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? ChartNoAxesCombined; const label = navigationLabels[entry.code] ?? entry.label; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>; })}
        {governanceEntries.length > 0 && <div className="nav-label">Tata kelola data</div>}
        {governanceEntries.map((entry) => {
          const Icon = iconByCode[entry.code] ?? Settings2;
          const label = navigationLabels[entry.code] ?? entry.label;
          return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>;
        })}
        {sourceEntries.length > 0 && <div className="nav-label">Walidata</div>}
        {sourceEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? Plug; const label = navigationLabels[entry.code] ?? entry.label; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>; })}
        {operationalEntries.length > 0 && <div className="nav-label">{isBapperida && !isSuperadmin ? "Pelaporan dan publikasi" : "Pelaporan capaian"}</div>}
        {operationalEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? ClipboardList; const label = isPimpinan && entry.code === "publications" ? "Rilis Data" : navigationLabels[entry.code] ?? entry.label; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>; })}
        {auditEntries.length > 0 && <div className="nav-label">Pengawasan</div>}
        {auditEntries.map((entry) => <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? entry.label : undefined} onClick={() => go(entry.route_name!)}><ScrollText /><span>{entry.label}</span></button>)}
        {adminEntries.length > 0 && <div className="nav-label">Konfigurasi internal</div>}
        {adminEntries.map((entry) => {
          const Icon = iconByCode[entry.code] ?? Settings2;
          const label = navigationLabels[entry.code] ?? entry.label;
          return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} aria-current={pathname === entry.route_name ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => go(entry.route_name!)}><Icon /><span>{label}</span></button>;
        })}
      </nav>
      <small className="sidebar-credit">Dikembangkan oleh<br /><strong>Tim IT UPR 2026</strong></small>
      <button className="collapse-button" title={collapsed ? "Perbesar sidebar" : undefined} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{collapsed ? "Perbesar" : "Perkecil sidebar"}</span></button>
    </aside>
    {mobile && <button className="mobile-overlay" onClick={() => setMobile(false)} aria-label="Tutup menu" />}
    <section className="workspace-main">
      <header className="topbar">
        <button className="icon-button mobile-trigger" aria-label="Buka menu" onClick={() => setMobile(true)}><Menu /></button>
        <nav className="topbar-context" aria-label="Lokasi halaman" title={subtitle}><span>{areaLabel}</span><i aria-hidden>/</i><strong tabIndex={-1}>{title}</strong></nav>
        <div className="topbar-actions">
          {actions}
          <button className="icon-button" aria-label="Buka bantuan penggunaan" onClick={() => setHelpOpen(true)}><HelpCircle /></button>
          {!isRolePreview && <div className="notification-wrap" ref={notificationRef}>
            <button className="icon-button notification" aria-label={`Buka notifikasi${unreadNotifications ? `, ${unreadNotifications} belum dibaca` : ""}`} aria-haspopup="dialog" aria-expanded={notificationOpen} onClick={() => { setNotificationOpen((value) => !value); setProfileOpen(false); if (!notificationOpen) void loadNotifications(); }}><Bell />{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</button>
            {notificationOpen && <section className="notification-popover" aria-label="Notifikasi terbaru">
              <header><div><strong>Notifikasi</strong><small>{unreadNotifications ? `${unreadNotifications} belum dibaca` : "Semua sudah dibaca"}</small></div>{unreadNotifications > 0 && <button type="button" onClick={() => void markAllNotificationsRead()}><CheckCheck />Tandai dibaca</button>}</header>
              <div className="notification-preview-list">
                {notificationLoading && !notificationPreview.length ? <p className="notification-preview-empty">Memuat notifikasi…</p>
                  : !notificationPreview.length ? <p className="notification-preview-empty">Belum ada pemberitahuan untuk Anda.</p>
                  : notificationPreview.map((item) => <button type="button" key={item.id} className={item.read_at ? "" : "unread"} onClick={() => void openNotification(item)}><span className="notification-preview-icon"><Bell /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{notificationTime(item.created_at)} WIB</small></span>{!item.read_at && <i aria-label="Belum dibaca" />}</button>)}
              </div>
              <footer><button type="button" onClick={() => go("/notifications")}>Lihat semua notifikasi</button></footer>
            </section>}
          </div>}
          <div className="profile-wrap" ref={profileRef}>
            <button className="profile-button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}><span className="avatar">{initials}</span><span><strong>{user?.full_name}</strong><small>{roleLabels[user?.roles[0]?.code ?? ""] ?? "Pengguna"}</small></span><ChevronDown /></button>
            {profileOpen && <div className="profile-popover"><div className="profile-identity"><UserRound /><span><strong>{user?.simulation?.original_email ?? user?.email}</strong><small>{isRolePreview ? `Pratinjau: ${roleLabels[user?.roles[0]?.code ?? ""] ?? "Peran"}` : user?.organizations[0]?.name ?? "Lingkup global"}</small></span></div>
              {isRolePreview ? <div className="profile-preview-return"><small>MODE PRATINJAU HANYA BACA</small><button disabled={previewBusy} onClick={() => void leavePreview()}><RotateCcw />Kembali ke Developer</button></div>
                : isSuperadmin && <div className="profile-preview"><small>PRATINJAU TAMPILAN PERAN</small><p>Lihat menu dan data sesuai kewenangan tanpa login ulang.</p>{previewError && <span className="profile-preview-error">{previewError}</span>}<button disabled={previewBusy} onClick={() => void enterPreview("bapperida")}><Eye />BAPPERIDA</button><button disabled={previewBusy} onClick={() => void enterPreview("kominfo")}><Eye />Walidata Diskominfosantik</button><button disabled={previewBusy} onClick={() => void enterPreview("pimpinan")}><Eye />Pimpinan</button><label><span>Pratinjau OPD</span><select value={previewOrganizationId} onChange={(event) => setPreviewOrganizationId(event.target.value)}><option value="">Pilih OPD</option>{previewOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.short_name ? `${organization.short_name} — ` : ""}{organization.name}</option>)}</select></label><button disabled={previewBusy || !previewOrganizationId} onClick={() => void enterPreview("opd", previewOrganizationId)}><Eye />Masuk sebagai OPD terpilih</button></div>}
              {!isRolePreview && <button onClick={() => go("/admin/profile")}><ShieldCheck />Keamanan akun</button>}<button className="danger-text" onClick={doLogout}><LogOut />Keluar</button></div>}
          </div>
        </div>
      </header>
      {isRolePreview && <div className="role-preview-banner"><Eye /><span><strong>Mode pratinjau hanya baca</strong><small>Anda sedang melihat SABABUKA sebagai {roleLabels[user?.roles[0]?.code ?? ""] ?? "pengguna"}{user?.simulation?.organization_name ? ` — ${user.simulation.organization_name}` : ""}.</small></span><button disabled={previewBusy} onClick={() => void leavePreview()}><RotateCcw />Kembali ke Developer</button></div>}
      <main className="page-shell">
        {children}
      </main>
    </section>
    {helpOpen && <><button className="help-overlay" aria-label="Tutup bantuan" onClick={() => setHelpOpen(false)} /><aside className="help-drawer" aria-label="Bantuan SABABUKA"><header><div><span className="eyebrow">BANTUAN SESUAI PERAN</span><h2>{help.title}</h2></div><button className="icon-button" aria-label="Tutup bantuan" onClick={() => setHelpOpen(false)}><X /></button></header><p>{help.intro}</p><ol>{help.steps.map((step) => <li key={step}><span>{help.steps.indexOf(step) + 1}</span><p>{step}</p></li>)}</ol><section><strong>Istilah penting</strong><dl><div><dt>Target</dt><dd>Sasaran RPJMD untuk tahun pelaporan.</dd></div><div><dt>Realisasi</dt><dd>Nilai yang benar-benar dicapai OPD.</dd></div><div><dt>Dipublikasikan</dt><dd>Sudah diperiksa, dikurasi, dan boleh dilihat pimpinan.</dd></div></dl></section><footer><small>Jika tugas atau data tidak sesuai, catat nama indikator, periode, dan OPD lalu hubungi Pengelola Sistem.</small><button className="button primary" onClick={() => setHelpOpen(false)}>Saya mengerti</button></footer></aside></>}
  </div>;
}

const roleHelp: Record<string, { title: string; intro: string; steps: string[] }> = {
  superadmin: { title: "Panduan Pengelola Sistem", intro: "Pastikan akun, organisasi, dan hak akses siap sebelum pengguna memulai pekerjaan substansi.", steps: ["Periksa pendaftaran PIC pada menu Pengguna.", "Tetapkan OPD dan peran dengan lingkup akses minimum.", "Pantau konfigurasi dan audit tanpa mengambil alih keputusan substansi BAPPERIDA atau OPD."] },
  bapperida: { title: "Panduan BAPPERIDA", intro: "Mulai dari Beranda Tugas untuk melihat keputusan yang menunggu Anda.", steps: ["Finalisasi kelompok isu dan indikator RPJMD.", "Verifikasi pelaporan yang dikirim OPD dan beri koreksi yang spesifik.", "Kurasi hanya capaian yang layak sebelum diterbitkan kepada pimpinan."] },
  opd: { title: "Panduan Operator OPD", intro: "Kartu Tugas Saya menunjukkan pekerjaan yang perlu Anda selesaikan lebih dahulu.", steps: ["Verifikasi indikator yang menjadi tanggung jawab OPD.", "Mulai pelaporan untuk periode berjalan dan isi realisasi.", "Lampirkan dokumen pendukung, simpan perubahan, lalu kirim ke BAPPERIDA."] },
  kominfo: { title: "Panduan Walidata", intro: "Diskominfosantik menjaga kualitas teknis dan aliran data lintas OPD.", steps: ["Daftarkan profil sumber data OPD.", "Petakan kolom sumber ke indikator yang sudah aktif.", "Periksa preview dan hasil validasi sebelum mengimpor atau menjadwalkan sinkronisasi."] },
  pimpinan: { title: "Panduan Pimpinan", intro: "Informasi di ruang ini hanya berasal dari data yang sudah diterbitkan.", steps: ["Gunakan filter untuk memilih kelompok isu atau OPD.", "Buka Rilis Data untuk melihat paket resmi dan sumbernya.", "Gunakan Asisten Data untuk bertanya berdasarkan data yang tersedia."] },
};

export function ComingSoon({ title }: { title: string }) {
  return <div className="empty-state"><Database size={28} /><h3>{title}</h3><p>Modul ini masuk tahap pembangunan berikutnya setelah fondasi administrasi selesai.</p></div>;
}
