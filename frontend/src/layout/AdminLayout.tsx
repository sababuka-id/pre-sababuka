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
  Plug,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth";
import { navigate } from "../router";
import type { MenuItem } from "../types";
import { api } from "../api";

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
  connectors: Plug,
};

const supportedRoutes = new Set(["/admin", "/dashboard", "/executive", "/assistant", "/notifications", "/audit", "/operations", "/admin/organizations", "/admin/users", "/admin/roles", "/admin/menus", "/admin/system", "/governance/categories", "/governance/indicators", "/submissions", "/reviews", "/publications", "/connectors"]);

const navigationLabels: Record<string, string> = {
  submissions: "Realisasi Indikator",
  reviews: "Pemeriksaan Capaian",
  assistant: "Asisten Data",
  roles: "Peran dan Hak Akses",
};

const roleLabels: Record<string, string> = {
  superadmin: "Developer",
  pimpinan: "Pimpinan",
  bapperida: "Bapperida",
  kominfo: "Kominfo",
  opd: "Operator OPD",
};

const demoRoleOptions = [
  { label: "BAPPERIDA", email: "bapperida@sababuka.com" },
  { label: "OPD Dinkes", email: "opd.dinkes@sababuka.com" },
  { label: "OPD DKPP", email: "opd.dkpp@sababuka.com" },
  { label: "Kominfo baca-saja", email: "kominfo@sababuka.com" },
  { label: "Pimpinan", email: "pimpinan@sababuka.com" },
] as const;

function sectionChildren(menu: MenuItem[], code: string): MenuItem[] {
  return menu.find((item) => item.code === code)?.children.filter((item) => item.route_name && supportedRoutes.has(item.route_name)) ?? [];
}

export function AdminLayout({ pathname, title, subtitle, actions, children }: { pathname: string; title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  const { user, menu, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const governanceEntries = useMemo(() => sectionChildren(menu, "governance"), [menu]);
  const adminEntries = useMemo(() => sectionChildren(menu, "administration"), [menu]);
  const operationalEntries = useMemo(() => menu.filter((item) => ["operations", "submissions", "reviews", "publications"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const sourceEntries = useMemo(() => menu.filter((item) => item.code === "connectors" && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const primaryEntries = useMemo(() => menu.filter((item) => ["dashboard", "assistant"].includes(item.code) && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const auditEntries = useMemo(() => menu.filter((item) => item.code === "audit" && item.route_name && supportedRoutes.has(item.route_name)), [menu]);
  const isSuperadmin = user?.roles.some((role) => role.code === "superadmin") ?? false;
  const areaLabel = pathname.startsWith("/admin") ? "Konfigurasi Internal"
    : ["/dashboard", "/executive", "/assistant"].includes(pathname) ? "Ruang Pimpinan"
    : pathname.startsWith("/governance") || pathname === "/connectors" ? "Tata Kelola Data"
    : ["/operations", "/submissions", "/reviews", "/publications"].includes(pathname) ? "Pelaporan Capaian"
    : "Ruang Kerja SABABUKA";
  const initials = user?.full_name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SA";

  useEffect(() => {
    setProfileOpen(false);
    window.scrollTo({ top: 0, left: 0 });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".topbar-context strong")?.focus());
  }, [pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadUnread = async () => {
      try {
        const result = await api<{ unread_count: number }>("/notifications?unread_only=true");
        if (active) setUnreadNotifications(result.unread_count);
      } catch { if (active) setUnreadNotifications(0); }
    };
    void loadUnread();
    const timer = window.setInterval(() => { void loadUnread(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.id, pathname]);

  const go = (path: string) => { navigate(path); setMobile(false); setProfileOpen(false); };
  const doLogout = async () => { await logout(); navigate("/login"); };
  const chooseDemoRole = async (email: string) => { await logout(); window.localStorage.setItem("sababuka.demo.identifier", email); go("/login"); };

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
        {sourceEntries.length > 0 && <div className="nav-label">Sumber data</div>}
        {sourceEntries.map((entry) => { const Icon = iconByCode[entry.code] ?? Plug; return <button key={entry.code} className={`nav-link ${pathname === entry.route_name ? "active" : ""}`} onClick={() => go(entry.route_name!)}><Icon /><span>{navigationLabels[entry.code] ?? entry.label}</span></button>; })}
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
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{collapsed ? "Perbesar" : "Perkecil sidebar"}</span></button>
    </aside>
    {mobile && <button className="mobile-overlay" onClick={() => setMobile(false)} aria-label="Tutup menu" />}
    <section className="workspace-main">
      <header className="topbar">
        <button className="icon-button mobile-trigger" aria-label="Buka menu" onClick={() => setMobile(true)}><Menu /></button>
        <nav className="topbar-context" aria-label="Lokasi halaman" title={subtitle}><span>{areaLabel}</span><i aria-hidden>/</i><strong tabIndex={-1}>{title}</strong></nav>
        <div className="topbar-actions">
          {actions}
          <button className="icon-button notification" aria-label={`Buka notifikasi${unreadNotifications ? `, ${unreadNotifications} belum dibaca` : ""}`} onClick={() => go("/notifications")}><Bell />{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</button>
          <div className="profile-wrap" ref={profileRef}>
            <button className="profile-button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}><span className="avatar">{initials}</span><span><strong>{user?.full_name}</strong><small>{roleLabels[user?.roles[0]?.code ?? ""] ?? "Pengguna"}</small></span><ChevronDown /></button>
            {profileOpen && <div className="profile-popover"><div className="profile-identity"><UserRound /><span><strong>{user?.email}</strong><small>{user?.organizations[0]?.name ?? "Lingkup global"}</small></span></div><button onClick={() => go("/admin/profile")}><ShieldCheck />Keamanan akun</button>{isSuperadmin && <div className="profile-demo"><small>Mode simulasi</small>{demoRoleOptions.map((option) => <button key={option.email} onClick={() => void chooseDemoRole(option.email)}><Users />Masuk sebagai {option.label}</button>)}</div>}<button className="danger-text" onClick={doLogout}><LogOut />Keluar</button></div>}
          </div>
        </div>
      </header>
      <main className="page-shell">
        {children}
      </main>
    </section>
  </div>;
}

export function ComingSoon({ title }: { title: string }) {
  return <div className="empty-state"><Database size={28} /><h3>{title}</h3><p>Modul ini masuk tahap pembangunan berikutnya setelah fondasi administrasi selesai.</p></div>;
}
