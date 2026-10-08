import { Check, Copy, Flag, KeyRound, Plus, Save, Settings2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge, formatDate, Modal, Notice, Spinner, useAsync } from "../components";
import type { FeatureFlag, SystemSetting } from "../types";

interface Configuration {
  settings: SystemSetting[];
  feature_flags: FeatureFlag[];
}

export function SystemPage() {
  const { user } = useAuth();
  const result = useAsync(() => api<Configuration>("/system/configuration"), []);
  const [settingOpen, setSettingOpen] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  async function toggleFlag(flag: FeatureFlag) {
    setBusyCode(flag.code); setMessage(null);
    try {
      await api(`/system/feature-flags/${flag.code}`, { method: "PUT", mutation: true, body: jsonBody({ is_enabled: !flag.is_enabled, configuration: flag.configuration }) });
      setMessage({ tone: "success", text: `${flag.name} berhasil ${flag.is_enabled ? "dinonaktifkan" : "diaktifkan"}.` });
      result.reload();
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Kendali fitur gagal diperbarui." }); }
    finally { setBusyCode(null); }
  }
  async function resetDemo() {
    setResetBusy(true); setMessage(null);
    try {
      const summary = await api<{ batches_removed: number; observations_removed: number; publications_removed: number; targets_preserved: number }>(
        "/demo/reset", { method: "POST", mutation: true, body: jsonBody({ confirmation: "RESET_DATA_DEMO" }) },
      );
      setResetOpen(false);
      setMessage({ tone: "success", text: `Data demo direset. ${summary.batches_removed} kiriman, ${summary.observations_removed} capaian, dan ${summary.publications_removed} publikasi dihapus; ${summary.targets_preserved} target demo dipertahankan.` });
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Reset data demo gagal." }); }
    finally { setResetBusy(false); }
  }
  if (result.loading) return <div className="panel-loading"><Spinner /></div>;
  if (result.error || !result.data) return <Notice tone="error">{result.error?.message ?? "Konfigurasi tidak dapat dimuat."}</Notice>;
  return <div className="settings-layout">{message && <Notice tone={message.tone}>{message.text}</Notice>}
    <section className="panel"><header className="panel-heading"><div><span className="eyebrow">Kendali fitur</span><h2>Fitur aplikasi</h2><p>Aktifkan modul secara bertahap tanpa mengubah kode aplikasi.</p></div><Flag /></header><div className="flag-list">{result.data.feature_flags.map((flag) => <div key={flag.code}><span className={`flag-icon ${flag.is_enabled ? "on" : ""}`}><Flag /></span><span><strong>{flag.name}</strong><small>{flag.description}</small><code>{flag.code}</code></span><label className="switch"><input aria-label={`Aktifkan ${flag.name}`} type="checkbox" checked={flag.is_enabled} disabled={busyCode === flag.code} onChange={() => toggleFlag(flag)} /><i /></label></div>)}</div></section>
    <section className="panel"><header className="panel-heading"><div><span className="eyebrow">Parameter aplikasi</span><h2>Pengaturan nonrahasia</h2><p>Rahasia integrasi tidak boleh disimpan pada bagian ini.</p></div><button className="button primary" onClick={() => setSettingOpen(true)}><Plus />Tambah pengaturan</button></header>{result.data.settings.length ? <div className="setting-list">{result.data.settings.map((setting) => <div key={setting.key}><span className="setting-icon"><Settings2 /></span><span><strong>{setting.key}</strong><small>{setting.description || "Tanpa keterangan"}</small></span><code>{JSON.stringify(setting.value)}</code><small>{formatDate(setting.updated_at)}</small></div>)}</div> : <div className="empty-inline">Belum ada pengaturan khusus. Nilai bawaan aplikasi masih digunakan.</div>}</section>
    {user?.roles.some((role) => role.code === "superadmin") && <section className="panel demo-reset-panel"><header className="panel-heading"><div><span className="eyebrow">Lingkungan demonstrasi</span><h2>Reset Data Demo</h2><p>Hapus transaksi dari dua paket demo dan kembalikan status paket ke draf. Master RPJMD dan target resminya tetap aman.</p></div><ShieldCheck /></header><div className="modal-actions"><button className="button danger" onClick={() => setResetOpen(true)}>Reset Data Demo</button></div></section>}
    {settingOpen && <SettingForm onClose={() => setSettingOpen(false)} onSaved={() => { setSettingOpen(false); result.reload(); }} />}
    {resetOpen && <Modal title="Reset Data Demo" onClose={() => { if (!resetBusy) setResetOpen(false); }}><Notice tone="warning">Tindakan ini menghapus kiriman, capaian, bukti dukung, riwayat proses, dan publikasi dari paket presentasi serta latihan. Master RPJMD dan target resmi tidak dihapus.</Notice><p>Ketik <strong>RESET_DATA_DEMO</strong> pada konfirmasi untuk melanjutkan.</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void resetDemo(); }}><label className="field"><span>Konfirmasi</span><input pattern="RESET_DATA_DEMO" placeholder="RESET_DATA_DEMO" required disabled={resetBusy} /></label><footer className="modal-actions"><button type="button" className="button secondary" onClick={() => setResetOpen(false)} disabled={resetBusy}>Batal</button><button className="button danger" disabled={resetBusy}>{resetBusy ? "Mereset…" : "Reset sekarang"}</button></footer></form></Modal>}
  </div>;
}

function SettingForm({ onClose, onSaved }: { onClose(): void; onSaved(): void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { parsed = value; }
      await api(`/system/settings/${key}`, { method: "PUT", mutation: true, body: jsonBody({ value: parsed, description: description || null }) });
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan."); }
    finally { setBusy(false); }
  }
  return <Modal title="Tambah pengaturan" onClose={onClose}>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}><label className="field"><span>Kunci</span><input value={key} onChange={(event) => setKey(event.target.value.toLowerCase())} pattern="[a-z][a-z0-9._-]*" placeholder="dashboard.refresh_seconds" required /></label><label className="field"><span>Nilai</span><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder='300 atau {"mode":"internal"}' required /></label><label className="field"><span>Keterangan</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><Notice tone="warning">Jangan memasukkan password, token, API key, atau rahasia lain.</Notice><footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}><Save />{busy ? "Menyimpan…" : "Simpan pengaturan"}</button></footer></form></Modal>;
}

export function SecurityPage() {
  const { user, refresh } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; provisioning_uri: string; issuer: string; account: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function start() {
    setBusy(true); setError(null);
    try {
      setSetup(await api<{ secret: string; provisioning_uri: string; issuer: string; account: string }>(
        "/me/mfa/totp/setup",
        { method: "POST", mutation: true },
      ));
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Enrollment MFA gagal."); }
    finally { setBusy(false); }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await api<{ recovery_codes: string[] }>("/me/mfa/totp/confirm", { method: "POST", mutation: true, body: jsonBody({ mfa_code: code }) });
      setRecovery(response.recovery_codes); setSetup(null); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kode Authenticator tidak valid."); }
    finally { setBusy(false); }
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  return <section className="security-grid"><article className="panel security-overview"><span className={`security-shield ${user?.mfa_required ? "active" : ""}`}><ShieldCheck /></span><div><span className="eyebrow">Status keamanan</span><h2>{user?.mfa_required ? "MFA aktif" : "MFA belum diaktifkan"}</h2><p>{user?.mfa_required ? "Login berikutnya membutuhkan kode Authenticator atau recovery code." : "Aktifkan autentikasi dua langkah sebelum sistem digunakan pada lingkungan production."}</p>{user?.mfa_required ? <Badge tone="success"><Check size={14} /> Akun terlindungi</Badge> : <button className="button primary" onClick={start} disabled={busy}><KeyRound />{busy ? "Menyiapkan…" : "Aktifkan Authenticator"}</button>}</div></article>{error && <Notice tone="error">{error}</Notice>}
    {setup && <article className="panel setup-panel"><header><div><span className="eyebrow">Langkah 1</span><h2>Tambahkan ke Authenticator</h2></div></header><p>Masukkan kunci berikut secara manual pada Google Authenticator, Microsoft Authenticator, atau aplikasi TOTP lain.</p><div className="secret-box"><span>Kunci setup</span><code>{setup.secret}</code><button onClick={() => copy(setup.secret)}>{copied ? <Check /> : <Copy />}</button></div><form className="inline-confirm" onSubmit={confirm}><label className="field"><span>Kode enam digit</span><input inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} placeholder="000000" required /></label><button className="button primary" disabled={busy}>Verifikasi dan aktifkan</button></form></article>}
    {recovery && <article className="panel recovery-panel"><header><div><span className="eyebrow">Langkah terakhir</span><h2>Simpan recovery code</h2></div></header><Notice tone="warning">Kode hanya ditampilkan sekali. Setiap kode hanya dapat dipakai satu kali.</Notice><div className="recovery-grid">{recovery.map((item) => <code key={item}>{item}</code>)}</div><button className="button secondary" onClick={() => copy(recovery.join("\n"))}>{copied ? <Check /> : <Copy />}{copied ? "Tersalin" : "Salin semua kode"}</button></article>}
  </section>;
}
