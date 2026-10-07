import { ArrowRight, Building2, Flag, PanelLeft, ShieldCheck, Users } from "lucide-react";
import { api } from "../api";
import { Notice, PageLoading, useAsync } from "../components";
import { navigate } from "../router";
import type { FeatureFlag, Organization, PageResponse, Role, SystemSetting, UserSummary } from "../types";

interface DashboardData {
  organizations: PageResponse<Organization>;
  users: PageResponse<UserSummary>;
  categories: PageResponse<{ id: string }>;
  indicators: PageResponse<{ id: string }>;
  roles: { data: Role[] };
  configuration: { settings: SystemSetting[]; feature_flags: FeatureFlag[] };
}

export function DashboardPage() {
  const result = useAsync<DashboardData>(() => Promise.all([
    api<PageResponse<Organization>>("/organizations?page_size=100"),
    api<PageResponse<UserSummary>>("/users?page_size=1"),
    api<PageResponse<{ id: string }>>("/categories?page_size=1"),
    api<PageResponse<{ id: string }>>("/indicators?page_size=1"),
    api<{ data: Role[] }>("/roles"),
    api<{ settings: SystemSetting[]; feature_flags: FeatureFlag[] }>("/system/configuration"),
  ]).then(([organizations, users, categories, indicators, roles, configuration]) => ({ organizations, users, categories, indicators, roles, configuration })), []);

  if (result.loading) return <PageLoading label="Memuat ringkasan administrasi" />;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Ringkasan belum dapat dimuat."}</Notice>;
  const enabledFlags = result.data.configuration.feature_flags.filter((flag) => flag.is_enabled).length;
  const directoryOrganizations = result.data.organizations.data.filter((organization) => ["opd", "district"].includes(organization.organization_type)).length;
  const directoryReady = directoryOrganizations >= 45;
  const cards = [
    { label: directoryReady ? "OPD dan kecamatan" : "Organisasi/OPD", value: directoryReady ? directoryOrganizations : result.data.organizations.meta.total_items, icon: Building2, tone: "blue", path: "/admin/organizations" },
    { label: "Pengguna", value: result.data.users.meta.total_items, icon: Users, tone: "teal", path: "/admin/users" },
    { label: "Kelompok isu usulan", value: result.data.categories.meta.total_items, icon: Flag, tone: "amber", path: "/governance/categories" },
    { label: "Indikator draf", value: result.data.indicators.meta.total_items, icon: PanelLeft, tone: "blue", path: "/governance/indicators" },
    { label: "Peran sistem", value: result.data.roles.data.length, icon: ShieldCheck, tone: "violet", path: "/admin/roles" },
    { label: "Fitur aktif", value: enabledFlags, icon: Flag, tone: "amber", path: "/admin/system" },
  ];

  return <>
    <section className="metric-grid">{cards.map(({ label, value, icon: Icon, tone, path }) => <button className="metric-card" key={label} onClick={() => navigate(path)}><span className={`metric-icon ${tone}`}><Icon /></span><span><small>{label}</small><strong>{value}</strong></span><ArrowRight /></button>)}</section>
    <section className="dashboard-grid">
      <article className="panel quick-panel"><header><div><span className="eyebrow">Kendali sistem</span><h2>Konfigurasi utama</h2></div><PanelLeft /></header><div className="quick-list">
        <button onClick={() => navigate("/admin/users")}><span><strong>Kelola pengguna dan undangan</strong><small>Buat akun, salin tautan aktivasi, dan tetapkan role.</small></span><ArrowRight /></button>
        <button onClick={() => navigate("/admin/roles")}><span><strong>Atur peran dan hak akses</strong><small>Pastikan setiap peran hanya menerima kewenangan yang diperlukan.</small></span><ArrowRight /></button>
        <button onClick={() => navigate("/admin/menus")}><span><strong>Susun menu berdasarkan peran</strong><small>Tampilan navigasi mengikuti tugas masing-masing pengguna.</small></span><ArrowRight /></button>
      </div></article>
      <article className="panel readiness-panel"><header><div><span className="eyebrow">Kesiapan lokal</span><h2>Status fondasi</h2></div></header><div className="readiness-list">
        <div><span className="check-dot">✓</span><p><strong>Autentikasi dan MFA</strong><small>Session, TOTP, dan recovery code aktif.</small></p></div>
        <div><span className="check-dot">✓</span><p><strong>RBAC dinamis</strong><small>42 hak akses dan menu berbasis peran.</small></p></div>
        <div><span className="check-dot">✓</span><p><strong>Audit perubahan</strong><small>Mutasi administrasi tercatat.</small></p></div>
        <div><span className="pending-dot">○</span><p><strong>Domain development</strong><small>Ditunda sampai aplikasi siap.</small></p></div>
      </div></article>
    </section>
  </>;
}
