import {
  Bell,
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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth";
import { navigate } from "../router";
import type { MenuItem } from "../types";

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
};

const supportedRoutes = new Set(["/admin", "/dashboard", "/executive", "/assistant", "/notifications", "/audit", "/operations", "/admin/organizations", "/admin/users", "/admin/roles", "/admin/menus", "/admin/system", "/governance/categories", "/governance/indicators", "/submissions", "/reviews", "/publications"]);

const navigationLabels: Record<string, string> = {
  submissions: "Realisasi Indikator",
  reviews: "Pemeriksaan Capaian",
  assistant: "Asisten Data",
  roles: "Peran dan Hak Akses",
};

const roleLabels: Record<string, string> = {
  superadmin: "Administrator Utama",
  pimpinan: "Pimpinan",
  bapperida: "Bapperida",
  kominfo: "Kominfo",
  opd: "Operator OPD",
};

function sectionChildren(menu: MenuItem[], code: string): MenuItem[] {
  return menu.find((item) => item.code === code)?.children.filter((item) => item.route_name && supportedRoutes.has(item.route_name)) ?? [];
}

export function AdminLayout({ pathname, title, subtitle, actions, children }: { pathname: string; title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  const { user, menu, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const governanceEntries = useMemo(() => sectionChildren(menu, "governance"), [menu]);
  const adminEntries = useMemo(() => sectionChildren(menu, "administration"), [menu]);
  const operationalEntries = useMemo(() => menu.filter((item) => ["operations", "submissions", "reviews", "publications"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const primaryEntries = useMemo(() => menu.filter((item) => ["dashboard", "assistant"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const auditEntries = useMemo(() => menu.filter((item) => item.code === "audit" && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const isSuperadmin = user?.roles.some((role) => role.code === "superadmin") ?? false;
  const areaLabel = pathname.startsWith("/admin") ? "Konfigurasi Internal"
    : ["/dashboard", "/executive", "/assistant"].includes(pathname) ? "Ruang Pimpinan"
    : pathname.startsWith("/governance") ? "Tata Kelola Data"
    : ["/operations", "/submissions", "/reviews", "/publications"].includes(pathname) ? "Pelaporan Capaian"
    : "Ruang Kerja SABABUKA";
  const initials = user?.full_name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SA";

  useEffect(() => {
    setProfileOpen(false);
    window.scrollTo({ top: 0, left: 0 });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".page-header h1")?.focus());
  }, [pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const go = (path: string) => { navigate(path); setMobile(false); setProfileOpen(false); };
  const doLogout = async () => { await logout(); navigate("/login"); };

  return <div className={`workspace ${collapsed ? "collapsed" : ""}`}>
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-symbol light">S</div><div className="sidebar-brand-copy"><strong>SABABUKA</strong><span>BERSINAR · KAPUAS</span></div><button className="mobile-close" aria-label="Tutup menu" onClick={() => setMobile(false)}><X /></button></div>
      <nav>
        {isSuperadmin && <button className={`nav-link ${pathname === "/admin" ? "active" : ""}`} onClick={() => go("/admin")}><LayoutDashboard /><span>Beranda Administrasi</span></button>}
        {primaryEntries.length > 0 && <div className="nav-label">Ruang pimpinan</div>}
        {primaryEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? LayoutDashboard; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><Icon /><span>{navigationLabels[entry.code] ?? entry.label}</span></button>; })}
        {governanceEntries.length > 0 && <div className="nav-label">Tata kelola data</div>}
        {governanceEntries.map((entry) => {
          const Icon = iconByCode[entry.code] ?? Settings2;
          return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><Icon /><span>{navigationLabels[entry.code] ?? entry.label}</span></button>;
        })}
        {operationalEntries.length > 0 && <div className="nav-label">Pelaporan capaian</div>}
        {operationalEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? ClipboardList; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><Icon /><span>{navigationLabels[entry.code] ?? entry.label}</span></button>; })}
        {auditEntries.length > 0 && <div className="nav-label">Pengawasan</div>}
        {auditEntries.map((entry) => <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><ScrollText /><span>{entry.label}</span></button>)}
        {adminEntries.length > 0 && <div className="nav-label">Konfigurasi internal</div>}
        {adminEntries.map((entry) => {
          const Icon = iconByCode[entry.code] ?? Settings2;
          return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><Icon /><span>{navigationLabels[entry.code] ?? entry.label}</span></button>;
        })}
      </nav>
      <div className="sidebar-status"><span className="status-dot" /><div><strong>Lingkungan lokal</strong><small>Belum terhubung domain</small></div></div>
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{collapsed ? "Perbesar" : "Perkecil sidebar"}</span></button>
    </aside>
    {mobile && <button className="mobile-overlay" onClick={() => setMobile(false)} aria-label="Tutup menu" />}
    <section className="workspace-main">
      <header className="topbar">
        <button className="icon-button mobile-trigger" aria-label="Buka menu" onClick={() => setMobile(true)}><Menu /></button>
        <div className="topbar-context"><span>{areaLabel}</span><strong>{title}</strong></div>
        <div className="topbar-actions">
          <button className="icon-button notification" aria-label="Buka notifikasi" onClick={() => go("/notifications")}><Bell /></button>
          <div className="profile-wrap" ref={profileRef}>
            <button className="profile-button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}><span className="avatar">{initials}</span><span><strong>{user?.full_name}</strong><small>{roleLabels[user?.roles[0]?.code ?? ""] ?? "Pengguna"}</small></span><ChevronDown /></button>
            {profileOpen && <div className="profile-popover"><div><UserRound /><span><strong>{user?.email}</strong><small>{user?.organizations[0]?.name ?? "Lingkup global"}</small></span></div><button onClick={() => go("/admin/profile")}><ShieldCheck />Keamanan akun</button><button className="danger-text" onClick={doLogout}><LogOut />Keluar</button></div>}
          </div>
        </div>
      </header>
      <main className="page-shell">
        <header className="page-header"><div><span className="eyebrow">{areaLabel}</span><h1 tabIndex={-1}>{title}</h1><p>{subtitle}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>
        {children}
      </main>
    </section>
  </div>;
}

export function ComingSoon({ title }: { title: string }) {
  return <div className="empty-state"><Database size={28} /><h3>{title}</h3><p>Modul ini masuk tahap pembangunan berikutnya setelah fondasi administrasi selesai.</p></div>;
}
