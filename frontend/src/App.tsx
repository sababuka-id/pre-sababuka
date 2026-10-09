import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { LoadingScreen, Notice } from "./components";
import { AdminLayout, ComingSoon } from "./layout/AdminLayout";
import { navigate, usePathname } from "./router";
import { RolesPage, MenusPage } from "./pages/AccessPages";
import { InvitationPage, LoginPage, PasswordSetupPage, RegistrationPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { SecurityPage, SystemPage } from "./pages/SystemPage";
import { UsersPage } from "./pages/UsersPage";
import { CategoriesPage, IndicatorsPage } from "./pages/GovernancePages";
import { SubmissionsPage } from "./pages/SubmissionPages";
import { ExecutivePage } from "./pages/ExecutivePage";
import { PublicationsPage } from "./pages/PublicationsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AuditPage, NotificationsPage } from "./pages/MonitoringPages";
import { OperationsPage } from "./pages/OperationsPage";
import { ConnectorsPage } from "./pages/ConnectorsPage";

const pageMeta: Record<string, { title: string; subtitle: string; permission?: string }> = {
  "/admin": { title: "Beranda Administrasi", subtitle: "Ringkasan konfigurasi, akses pengguna, dan kesiapan sistem.", permission: "system.configure" },
  "/dashboard": { title: "Beranda SABABUKA", subtitle: "Ringkasan data yang aman untuk pembacaan pimpinan.", permission: "executive_dashboard.view" },
  "/executive": { title: "Ringkasan Pimpinan", subtitle: "Capaian terkurasi dari data yang telah disetujui dan dipublikasikan.", permission: "executive_dashboard.view" },
  "/assistant": { title: "Asisten Data", subtitle: "Asisten pimpinan berbasis data SABABUKA yang telah dipublikasikan.", permission: "assistant.use" },
  "/notifications": { title: "Notifikasi", subtitle: "Pembaruan kategori, indikator, verifikasi OPD, pengiriman, dan publikasi." },
  "/audit": { title: "Audit Aktivitas", subtitle: "Jejak perubahan permanen sesuai lingkup organisasi.", permission: "audit.view" },
  "/operations": { title: "Dashboard Operasional", subtitle: "Pantau form pelaporan capaian OPD per periode, antrean pemeriksaan, koreksi, dan persetujuan.", permission: "submission.view" },
  "/admin/organizations": { title: "Organisasi dan OPD", subtitle: "Kelola struktur organisasi yang menjadi lingkup pengguna dan pemilik data.", permission: "organization.view" },
  "/admin/users": { title: "Pengguna", subtitle: "Verifikasi pendaftaran, pantau status akun, dan tetapkan peran sesuai tugas.", permission: "user.view" },
  "/admin/roles": { title: "Peran dan Hak Akses", subtitle: "Atur kewenangan setiap peran dengan prinsip akses minimum.", permission: "role.view" },
  "/admin/menus": { title: "Pengaturan Menu", subtitle: "Tentukan menu yang tampil untuk setiap peran.", permission: "menu.manage" },
  "/admin/system": { title: "Konfigurasi Sistem", subtitle: "Kelola kendali fitur dan parameter aplikasi yang tidak bersifat rahasia.", permission: "system.configure" },
  "/admin/profile": { title: "Keamanan Akun", subtitle: "Kelola Authenticator dan perlindungan akun Anda." },
  "/governance/categories": { title: "Kategori Indikator", subtitle: "Kelompokkan indikator pilot berdasarkan fokus kebijakan.", permission: "category.view" },
  "/governance/indicators": { title: "Master Indikator", subtitle: "Kelola definisi, sumber, target tahunan, dan perangkat daerah terkait.", permission: "indicator.view" },
  "/submissions": { title: "Realisasi Indikator", subtitle: "Isi dan kirim capaian indikator OPD per periode pelaporan.", permission: "submission.view" },
  "/reviews": { title: "Pemeriksaan Capaian OPD", subtitle: "Periksa, kembalikan, atau setujui capaian yang dikirim perangkat daerah.", permission: "submission.review" },
  "/publications": { title: "Kurasi dan Publikasi", subtitle: "Pilih capaian yang disetujui sebelum diterbitkan ke dashboard pimpinan.", permission: "publication.view" },
  "/connectors": { title: "Sumber Data", subtitle: "Hubungkan dataset BPS dan Satu Data Kapuas melalui mapping tahunan yang disetujui.", permission: "connector.view" },
};

function ProtectedApp() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user && !["/login", "/activate", "/register"].includes(pathname)) navigate("/login");
    if (!loading && user?.must_change_password && pathname !== "/security/setup") navigate("/security/setup");
    if (!loading && user && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
      const landing = user.roles.some((role) => role.code === "superadmin") ? "/admin"
        : user.roles.some((role) => role.code === "pimpinan") ? "/dashboard"
        : user.permissions.includes("submission.view") ? "/operations" : "/dashboard";
      navigate(landing);
    }
  }, [loading, user, pathname]);

  if (pathname === "/activate") return <InvitationPage />;
  if (pathname === "/register") return <RegistrationPage />;
  if (pathname === "/security/setup") return user ? <PasswordSetupPage /> : <LoginPage />;
  if (loading) return <LoadingScreen />;
  if (!user || pathname === "/login") return <LoginPage />;
  const meta = pageMeta[pathname] ?? { title: "Modul SABABUKA", subtitle: "Modul sedang disiapkan." };
  const denied = meta.permission && !user.permissions.includes(meta.permission);
  let content;
  if (denied) content = <Notice tone="error">Anda tidak memiliki hak akses untuk membuka halaman ini.</Notice>;
  else if (pathname === "/admin") content = <DashboardPage />;
  else if (pathname === "/admin/organizations") content = <OrganizationsPage />;
  else if (pathname === "/admin/users") content = <UsersPage />;
  else if (pathname === "/admin/roles") content = <RolesPage />;
  else if (pathname === "/admin/menus") content = <MenusPage />;
  else if (pathname === "/admin/system") content = <SystemPage />;
  else if (pathname === "/admin/profile") content = <SecurityPage />;
  else if (pathname === "/governance/categories") content = <CategoriesPage />;
  else if (pathname === "/governance/indicators") content = <IndicatorsPage />;
  else if (pathname === "/submissions") content = <SubmissionsPage />;
  else if (pathname === "/reviews") content = <SubmissionsPage review />;
  else if (pathname === "/dashboard" || pathname === "/executive") content = <ExecutivePage />;
  else if (pathname === "/publications") content = <PublicationsPage />;
  else if (pathname === "/assistant") content = <AssistantPage />;
  else if (pathname === "/notifications") content = <NotificationsPage />;
  else if (pathname === "/audit") content = <AuditPage />;
  else if (pathname === "/operations") content = <OperationsPage />;
  else if (pathname === "/connectors") content = <ConnectorsPage />;
  else content = <ComingSoon title={meta.title} />;

  return <AdminLayout pathname={pathname} title={meta.title} subtitle={meta.subtitle}>{content}</AdminLayout>;
}

export default function App() {
  return <AuthProvider><ProtectedApp /></AuthProvider>;
}
