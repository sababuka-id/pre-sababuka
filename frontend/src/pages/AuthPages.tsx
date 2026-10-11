import { ArrowRight, Bot, Check, Copy, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiClientError, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Notice, Spinner } from "../components";
import { navigate } from "../router";

function AuthBrand() {
  return <aside className="auth-brand">
    <div className="auth-brand-top"><div className="brand-logo auth-logo"><img src="/logo-kapuas.png" alt="Lambang Kabupaten Kapuas" /></div><div><strong>SABABUKA</strong></div></div>
    <div className="auth-copy">
      <span className="eyebrow light">Sistem Analisis Big Data Kabupaten Kapuas</span>
      <h1>Satu ruang kendali untuk data daerah yang dapat dipercaya.</h1>
      <p>Kelola metadata, validasi data OPD, indikator pembangunan, dan informasi pimpinan dalam satu alur yang tercatat.</p>
    </div>
    <div className="auth-features">
      <div><ShieldCheck /><span><strong>Akses berbasis peran</strong><small>Menu dan data mengikuti kewenangan pengguna.</small></span></div>
      <div><Sparkles /><span><strong>Data terkurasi</strong><small>Setiap angka memiliki sumber dan status validasi.</small></span></div>
      <div><Bot /><span><strong>Asisten untuk pimpinan</strong><small>Jawaban hanya dari data yang layak tayang.</small></span></div>
    </div>
    <small className="auth-foot">Pemerintah Kabupaten Kapuas<br /><strong>Dikembangkan oleh Tim IT UPR 2026</strong></small>
  </aside>;
}

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(() => window.localStorage.getItem("sababuka.demo.identifier") ?? "");
  const [password, setPassword] = useState("");
  const [mfaMode, setMfaMode] = useState<"totp" | "recovery" | null>(null);
  const [mfaValue, setMfaValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { window.localStorage.removeItem("sababuka.demo.identifier"); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({
        identifier,
        password,
        ...(mfaMode === "totp" ? { mfa_code: mfaValue } : {}),
        ...(mfaMode === "recovery" ? { recovery_code: mfaValue } : {}),
      });
    } catch (reason) {
      if (reason instanceof ApiClientError && reason.code === "MFA_REQUIRED") {
        setMfaMode("totp");
        setError(null);
      } else {
        setError(reason instanceof Error ? reason.message : "Login tidak berhasil.");
      }
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <div className="login-illustration" aria-hidden="true">
      <span className="login-orbit login-orbit-one" />
      <span className="login-orbit login-orbit-two" />
      <span className="login-dot login-dot-one" />
      <span className="login-dot login-dot-two" />
      <span className="login-dot login-dot-three" />
    </div>
    <section className="login-panel">
      <form className="auth-card login-card" onSubmit={submit}>
        <div className="login-identity">
          <div className="brand-logo login-logo"><img src="/logo-kapuas.png" alt="Lambang Kabupaten Kapuas" /></div>
          <div><strong>SABABUKA</strong><small>Pemerintah Kabupaten Kapuas</small></div>
        </div>
        <div className="auth-card-heading"><span className="eyebrow">Akses aman</span><h2>{mfaMode ? "Verifikasi dua langkah" : "Masuk ke SABABUKA"}</h2><p>{mfaMode ? "Masukkan kode dari aplikasi Authenticator Anda." : "Masuk menggunakan akun SABABUKA yang telah diverifikasi."}</p></div>
        {error && <Notice tone="error">{error}</Notice>}
        {!mfaMode ? <>
          <label className="field"><span>Email atau username</span><input autoFocus autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="nama@kapuaskab.go.id" required /></label>
          <label className="field"><span>Kata sandi</span><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" required minLength={8} /><button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        </> : <>
          <div className="mfa-icon"><LockKeyhole /></div>
          <label className="field"><span>{mfaMode === "totp" ? "Kode Authenticator" : "Recovery code"}</span><input autoFocus inputMode={mfaMode === "totp" ? "numeric" : "text"} autoComplete="one-time-code" value={mfaValue} onChange={(event) => setMfaValue(event.target.value)} placeholder={mfaMode === "totp" ? "000000" : "XXXX-XXXX-XXXX-XXXX"} required /></label>
          <button className="text-button" type="button" onClick={() => { setMfaMode(mfaMode === "totp" ? "recovery" : "totp"); setMfaValue(""); }}>{mfaMode === "totp" ? "Gunakan recovery code" : "Gunakan kode Authenticator"}</button>
          <button className="text-button muted" type="button" onClick={() => { setMfaMode(null); setMfaValue(""); }}>Kembali ke login</button>
        </>}
        <button className="button primary full" disabled={busy}>{busy ? <Spinner label="Memeriksa" /> : <>{mfaMode ? "Verifikasi" : "Masuk"}<ArrowRight size={17} /></>}</button>
        {!mfaMode && <button className="button secondary full" type="button" onClick={() => navigate("/register")}><UserRoundPlus size={17} />Daftar akun baru</button>}
        <div className="security-note"><ShieldCheck size={17} /><span>Session dilindungi cookie HttpOnly, CSRF, dan pencatatan audit.</span></div>
        <small className="login-credit">Dikembangkan oleh Tim IT UPR 2026</small>
      </form>
    </section>
  </main>;
}

export function PasswordSetupPage() {
  const { user, refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setError("Konfirmasi kata sandi belum sama."); return; }
    setBusy(true); setError(null);
    try {
      await api("/me/password", { method: "POST", mutation: true, body: jsonBody({ current_password: currentPassword, new_password: newPassword }) });
      await refresh();
      navigate("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kata sandi belum dapat diubah.");
    } finally { setBusy(false); }
  }

  return <main className="auth-layout"><AuthBrand /><section className="auth-panel"><form className="auth-card" onSubmit={submit}>
    <div className="auth-card-heading"><span className="eyebrow">Langkah pertama</span><h2>Ganti kata sandi</h2><p>Akun demo ini memakai kata sandi awal. Buat kata sandi pribadi sebelum melanjutkan.</p></div>
    {error && <Notice tone="error">{error}</Notice>}
    <label className="field"><span>Kata sandi awal</span><input type="password" autoFocus autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required minLength={8} /></label>
    <label className="field"><span>Kata sandi baru</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} /><small>Minimal 12 karakter.</small></label>
    <label className="field"><span>Ulangi kata sandi baru</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} /></label>
    <button className="button primary full" disabled={busy}>{busy ? <Spinner label="Menyimpan" /> : "Simpan kata sandi"}</button>
    <div className="security-note"><ShieldCheck size={17} /><span>{user?.email}</span></div>
  </form></section></main>;
}

interface RegistrationOrganization {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
}

export function RegistrationPage() {
  const [organizations, setOrganizations] = useState<RegistrationOrganization[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    api<{ data: RegistrationOrganization[] }>("/auth/registration-organizations")
      .then((result) => setOrganizations(result.data))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Daftar OPD gagal dimuat."))
      .finally(() => setBusy(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setBusy(true); setError(null);
    try {
      await api("/auth/register", { method: "POST", body: jsonBody({
        email, username: username || null, full_name: fullName,
        organization_id: organizationId, contact_phone: contactPhone,
        job_title: jobTitle, employee_id: employeeId || null,
        request_note: requestNote || null, password,
      }) });
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran tidak berhasil.");
    } finally { setBusy(false); }
  }

  return <main className="auth-layout">
    <AuthBrand />
    <section className="auth-panel">
      <div className="auth-card registration-card">
        {complete ? <>
          <div className="success-symbol"><Check /></div>
          <div className="auth-card-heading centered"><span className="eyebrow">Pendaftaran terkirim</span><h2>Menunggu persetujuan Pengelola Sistem</h2><p>OPD yang dipilih masih berupa pengajuan. Pengelola Sistem akan memeriksa identitas PIC lalu menetapkan OPD dan hak akses final.</p></div>
          <button className="button primary full" onClick={() => navigate("/login")}>Kembali ke halaman masuk</button>
        </> : <form className="form-stack" onSubmit={submit}>
          <div className="auth-card-heading"><span className="eyebrow">Pendaftaran perwakilan OPD</span><h2>Ajukan akun SABABUKA</h2><p>Isi identitas PIC resmi. Pendaftaran ini belum memberi akses sampai diperiksa dan disetujui Pengelola Sistem.</p></div>
          {error && <Notice tone="error">{error}</Notice>}
          <fieldset className="registration-section"><legend>Identitas PIC</legend>
            <label className="field"><span>Nama lengkap</span><input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></label>
            <label className="field"><span>Jabatan dalam OPD</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Contoh: Pranata Komputer Ahli Muda" required /></label>
            <label className="field"><span>NIP/NIK pegawai <small>(opsional)</small></span><input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} inputMode="numeric" placeholder="Untuk membantu verifikasi identitas" /></label>
          </fieldset>
          <fieldset className="registration-section"><legend>Kontak dan perwakilan</legend>
            <label className="field"><span>Email aktif/dinas</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nama@kapuaskab.go.id" required /><small>Dipakai untuk login dan komunikasi status akun.</small></label>
            <label className="field"><span>Nomor HP/WhatsApp aktif</span><input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} autoComplete="tel" inputMode="tel" pattern="[0-9+(). -]+" minLength={8} placeholder="08xx xxxx xxxx" required /></label>
            <label className="field"><span>OPD yang diwakili</span><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required><option value="">Pilih OPD</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.short_name ?? item.name}</option>)}</select><small>Setiap OPD memiliki satu akun PIC. BAPPERIDA dan Diskominfosantik dapat memiliki dua akun untuk memisahkan fungsi internal dan verifikasi/walidata.</small></label>
            <label className="field"><span>Keterangan tambahan <small>(opsional)</small></span><textarea rows={3} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="Contoh: ditunjuk sebagai operator data RPJMD melalui surat tugas." /></label>
          </fieldset>
          <label className="field"><span>Username <small>(opsional)</small></span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" pattern="[A-Za-z0-9._-]+" minLength={3} /></label>
          <label className="field"><span>Kata sandi</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required /><small>Minimal 12 karakter.</small></label>
          <label className="field"><span>Ulangi kata sandi</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} required /></label>
          <Notice tone="success">Pengelola Sistem memverifikasi akun dan menetapkan OPD serta peran final. BAPPERIDA memeriksa substansi indikator/capaian, bukan identitas akun.</Notice>
          <button className="button primary full" disabled={busy || !organizationId}>{busy ? <Spinner label="Mendaftarkan" /> : <>Kirim pendaftaran <ArrowRight size={17} /></>}</button>
          <button className="text-button auth-back-link" type="button" onClick={() => navigate("/login")}>Sudah punya akun? Masuk</button>
        </form>}
      </div>
    </section>
  </main>;
}

interface InvitationInfo {
  email: string;
  full_name: string;
  expires_at: string;
  mfa_setup_started: boolean;
}

interface TotpSetup {
  secret: string;
  provisioning_uri: string;
  issuer: string;
  account: string;
}

export function InvitationPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { setError("Token undangan tidak tersedia."); setBusy(false); return; }
    api<InvitationInfo>(`/auth/invitations/${encodeURIComponent(token)}`).then(setInfo).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Undangan tidak valid.")).finally(() => setBusy(false));
  }, [token]);

  async function beginSetup() {
    setBusy(true); setError(null);
    try { setSetup(await api<TotpSetup>(`/auth/invitations/${encodeURIComponent(token)}/mfa/setup`, { method: "POST" })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Setup MFA gagal."); }
    finally { setBusy(false); }
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Konfirmasi kata sandi belum sama."); return; }
    setBusy(true); setError(null);
    try {
      const response = await api<{ recovery_codes: string[] }>(`/auth/invitations/${encodeURIComponent(token)}/accept`, { method: "POST", body: jsonBody({ password, mfa_code: code }) });
      setRecoveryCodes(response.recovery_codes);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aktivasi akun gagal."); }
    finally { setBusy(false); }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return <main className="auth-layout">
    <AuthBrand />
    <section className="auth-panel">
      <div className="auth-card activation-card">
        {busy && !info ? <Spinner label="Memeriksa undangan" /> : error && !info ? <><Notice tone="error">{error}</Notice><button className="button secondary full" onClick={() => navigate("/login")}>Kembali ke login</button></> : recoveryCodes ? <>
          <div className="success-symbol"><Check /></div><div className="auth-card-heading"><span className="eyebrow">Akun aktif</span><h2>Simpan recovery code Anda</h2><p>Kode berikut hanya ditampilkan sekali. Simpan di lokasi aman dan jangan kirim melalui grup percakapan.</p></div>
          <div className="recovery-grid">{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div>
          <button className="button secondary full" onClick={() => copyText(recoveryCodes.join("\n"))}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Tersalin" : "Salin semua kode"}</button>
          <button className="button primary full" onClick={() => navigate("/login")}>Lanjut ke login <ArrowRight size={17} /></button>
        </> : info && !setup ? <>
          <div className="auth-card-heading"><span className="eyebrow">Undangan pengguna</span><h2>Selamat datang, {info.full_name}</h2><p>{info.email}</p></div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="activation-steps"><div className="active"><span>1</span><p><strong>Hubungkan Authenticator</strong><small>Wajib untuk melindungi akun pemerintah.</small></p></div><div><span>2</span><p><strong>Buat kata sandi</strong><small>Minimal 12 karakter.</small></p></div><div><span>3</span><p><strong>Simpan recovery code</strong><small>Digunakan jika perangkat hilang.</small></p></div></div>
          <button className="button primary full" onClick={beginSetup} disabled={busy}><KeyRound size={17} />{busy ? "Menyiapkan…" : info.mfa_setup_started ? "Buat ulang kode Authenticator" : "Siapkan Authenticator"}</button>
        </> : setup ? <form onSubmit={activate}>
          <div className="auth-card-heading"><span className="eyebrow">Aktivasi aman</span><h2>Hubungkan Authenticator</h2><p>Tambahkan akun secara manual menggunakan kunci berikut, lalu masukkan kode enam digit.</p></div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="secret-box"><span>Kunci setup</span><code>{setup.secret}</code><button type="button" onClick={() => copyText(setup.secret)}>{copied ? <Check /> : <Copy />}</button></div>
          <p className="helper">Issuer: <strong>{setup.issuer}</strong> · Akun: <strong>{setup.account}</strong></p>
          <label className="field"><span>Kode Authenticator</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} pattern="[0-9]{6}" placeholder="000000" required /></label>
          <label className="field"><span>Kata sandi baru</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label className="field"><span>Ulangi kata sandi</span><input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          <button className="button primary full" disabled={busy}>{busy ? <Spinner label="Mengaktifkan" /> : <>Aktifkan akun <ArrowRight size={17} /></>}</button>
        </form> : null}
      </div>
    </section>
  </main>;
}
