'use strict';
/* ==========================================================================
   SABABUKA BERSINAR - Prototipe Portal DIES
   Seluruh data pada berkas ini adalah data DUMMY/karangan untuk kebutuhan
   ilustrasi paparan internal. Tidak ada bagian dari berkas ini yang
   merepresentasikan kondisi nyata Kabupaten Kapuas, tidak terhubung ke
   OPD, database, WhatsApp, atau layanan AI mana pun.

   Cakupan v1: hanya Beranda Eksekutif, Data Lintas Sektor, dan Analisis
   Kecamatan yang dibangun penuh - ini yang menjawab kebutuhan utama
   (pimpinan melihat data OPD dalam satu dashboard). Menu lain (Pusat Data,
   Monitoring OPD, Pusat Laporan, Administrasi) baru berupa halaman rencana
   pengembangan dan akan digarap sebagai pekerjaan terpisah.
   ========================================================================== */

/* ==========================================================================
   1. DATA DUMMY TERPUSAT
   ========================================================================== */

const DISTRICT_NAMES = [
  'Selat', 'Kapuas Hilir', 'Kapuas Timur', 'Pulau Petak', 'Kapuas Murung',
  'Kapuas Kuala', 'Basarang', 'Kapuas Barat', 'Mantangai', 'Timpah',
  'Kapuas Tengah', 'Kapuas Hulu', 'Bataguh', 'Tamban Catur', 'Dadahup',
  'Pasak Talawang', 'Mandau Talawang'
];

// [nama, stunting%, capaianPAD%, kemiskinan%, pengangguran%, indeksInfrastruktur]
const DISTRICT_RAW = [
  ['Selat', 16.8, 61, 5.1, 3.4, 82],
  ['Kapuas Hilir', 17.9, 58, 5.6, 3.7, 78],
  ['Kapuas Timur', 15.7, 64, 4.8, 3.1, 85],
  ['Pulau Petak', 19.4, 49, 6.4, 4.2, 70],
  ['Kapuas Murung', 20.1, 46, 6.9, 4.6, 66],
  ['Kapuas Kuala', 18.9, 51, 6.1, 4.0, 72],
  ['Basarang', 16.2, 67, 4.6, 3.0, 87],
  ['Kapuas Barat', 18.1, 55, 5.8, 3.8, 76],
  ['Mantangai', 21.3, 43, 7.8, 5.1, 60],
  ['Timpah', 19.8, 48, 7.0, 4.7, 65],
  ['Kapuas Tengah', 20.6, 45, 7.4, 4.9, 62],
  ['Kapuas Hulu', 21.0, 42, 8.1, 5.4, 58],
  ['Bataguh', 17.1, 60, 5.3, 3.5, 80],
  ['Tamban Catur', 18.6, 53, 6.0, 3.9, 74],
  ['Dadahup', 19.2, 50, 6.6, 4.3, 69],
  ['Pasak Talawang', 20.4, 44, 7.6, 5.0, 61],
  ['Mandau Talawang', 21.5, 41, 8.4, 5.6, 55]
];

const DISTRICTS = DISTRICT_RAW.map(([nama, stunting, pad, kemiskinan, pengangguran, infrastruktur], idx) => ({
  id: 'kec-' + idx,
  nama,
  stunting,
  pad,
  kemiskinan,
  pengangguran,
  infrastruktur,
  trend: Array.from({ length: 6 }, (_, i) => +(stunting + (5 - i) * 0.35 + Math.sin(idx + i) * 0.15).toFixed(1))
}));

function districtAverage(field) {
  const total = DISTRICTS.reduce((sum, d) => sum + d[field], 0);
  return +(total / DISTRICTS.length).toFixed(1);
}

const PERIODS = [
  { id: 'p1', label: 'Januari - Juni 2026', months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'] },
  { id: 'p2', label: 'Juli - Desember 2025', months: ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] },
  { id: 'p3', label: 'Januari - Juni 2025', months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'] }
];

const KPI_DEFS = [
  { id: 'stunting', label: 'Prevalensi Stunting', unit: '%', decimals: 1, better: 'down',
    byPeriod: { p1: 18.4, p2: 19.8, p3: 21.0 }, prevByPeriod: { p1: 19.6, p2: 21.0, p3: 21.6 } },
  { id: 'inflasi', label: 'Inflasi Lokal Tahunan', unit: '%', decimals: 2, better: 'down',
    byPeriod: { p1: 2.71, p2: 3.10, p3: 3.42 }, prevByPeriod: { p1: 3.10, p2: 3.42, p3: 3.55 } },
  { id: 'pad', label: 'Realisasi PAD', unit: 'Rp M', decimals: 1, better: 'up',
    byPeriod: { p1: 186.3, p2: 342.0, p3: 158.4 }, prevByPeriod: { p1: 158.4, p2: 305.0, p3: 140.2 } },
  { id: 'kemiskinan', label: 'Tingkat Kemiskinan', unit: '%', decimals: 2, better: 'down',
    byPeriod: { p1: 6.42, p2: 6.71, p3: 7.05 }, prevByPeriod: { p1: 6.71, p2: 7.05, p3: 7.30 } },
  { id: 'pengangguran', label: 'Tingkat Pengangguran Terbuka', unit: '%', decimals: 2, better: 'down',
    byPeriod: { p1: 4.12, p2: 4.35, p3: 4.58 }, prevByPeriod: { p1: 4.35, p2: 4.58, p3: 4.70 } },
  { id: 'kesehatan', label: 'Cakupan Layanan Kesehatan Dasar', unit: '%', decimals: 1, better: 'up',
    byPeriod: { p1: 87.6, p2: 85.2, p3: 82.9 }, prevByPeriod: { p1: 85.2, p2: 82.9, p3: 80.5 } }
];

const STUNTING_TREND_BY_PERIOD = {
  p1: [20.3, 20.0, 19.6, 19.1, 18.8, 18.4],
  p2: [21.6, 21.2, 20.9, 20.5, 20.1, 19.8],
  p3: [21.9, 21.8, 21.6, 21.4, 21.2, 21.0]
};

const PAD_TARGET_VS_REALISASI = {
  p1: { target: [40, 75, 115, 150, 180, 210], realisasi: [35, 68, 101, 132, 161, 186.3] },
  p2: { target: [60, 130, 200, 260, 320, 380], realisasi: [52, 118, 185, 245, 300, 342] },
  p3: { target: [30, 62, 95, 120, 148, 175], realisasi: [26, 55, 84, 108, 132, 158.4] }
};

const SECTORS = [
  { id: 'kesehatan', nama: 'Kesehatan', opd: 'Dinas Kesehatan', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif layanan kesehatan dasar dan gizi masyarakat.',
    indikator: [
      { nama: 'Prevalensi Stunting', nilai: '18,4%' },
      { nama: 'Cakupan Imunisasi Dasar', nilai: '91,2%' },
      { nama: 'Rasio Tenaga Kesehatan per 1.000 Penduduk', nilai: '1,8' },
      { nama: 'Kunjungan Posyandu', nilai: '76,5%' }
    ],
    trend: [20.3, 20.0, 19.6, 19.1, 18.8, 18.4] },
  { id: 'pendidikan', nama: 'Pendidikan', opd: 'Dinas Pendidikan dan Kebudayaan', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif capaian pendidikan dasar dan menengah.',
    indikator: [
      { nama: 'Angka Partisipasi Sekolah', nilai: '94,1%' },
      { nama: 'Rata-rata Lama Sekolah', nilai: '8,2 tahun' },
      { nama: 'Angka Melek Huruf', nilai: '98,6%' },
      { nama: 'Rasio Guru per Siswa', nilai: '1:16' }
    ],
    trend: [90.5, 91.2, 91.9, 92.6, 93.4, 94.1] },
  { id: 'kependudukan', nama: 'Kependudukan', opd: 'Dinas Kependudukan dan Pencatatan Sipil', kualitas: 'Perlu Pemeriksaan',
    deskripsi: 'Indikator ilustratif kependudukan dan administrasi.',
    indikator: [
      { nama: 'Jumlah Penduduk (ilustrasi)', nilai: '412.500 jiwa' },
      { nama: 'Laju Pertumbuhan Penduduk', nilai: '1,3%' },
      { nama: 'Kepemilikan KTP-el', nilai: '89,7%' },
      { nama: 'Kepemilikan Akta Kelahiran', nilai: '83,4%' }
    ],
    trend: [88.0, 88.4, 88.9, 89.1, 89.4, 89.7] },
  { id: 'ekonomi', nama: 'Ekonomi dan Inflasi', opd: 'Dinas Perindustrian dan Perdagangan', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif pertumbuhan ekonomi dan harga.',
    indikator: [
      { nama: 'Inflasi Tahunan', nilai: '2,71%' },
      { nama: 'Pertumbuhan Ekonomi', nilai: '4,6%' },
      { nama: 'Indeks Harga Konsumen', nilai: '106,8' },
      { nama: 'Harga Beras Rata-rata', nilai: 'Rp13.400/kg' }
    ],
    trend: [3.4, 3.2, 3.0, 2.9, 2.8, 2.71] },
  { id: 'pad-sektor', nama: 'Pendapatan Daerah', opd: 'Badan Pengelolaan Keuangan dan Aset Daerah', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif realisasi pendapatan asli daerah.',
    indikator: [
      { nama: 'Realisasi PAD', nilai: 'Rp186,3 M' },
      { nama: 'Capaian Terhadap Target', nilai: '54%' },
      { nama: 'Pajak Daerah', nilai: 'Rp98,2 M' },
      { nama: 'Retribusi Daerah', nilai: 'Rp21,7 M' }
    ],
    trend: [35, 68, 101, 132, 161, 186.3] },
  { id: 'infrastruktur', nama: 'Infrastruktur', opd: 'Dinas Pekerjaan Umum dan Penataan Ruang', kualitas: 'Perlu Pemeriksaan',
    deskripsi: 'Indikator ilustratif kondisi infrastruktur dasar.',
    indikator: [
      { nama: 'Jalan Kondisi Baik', nilai: '68,4%' },
      { nama: 'Akses Air Bersih Layak', nilai: '79,1%' },
      { nama: 'Akses Sanitasi Layak', nilai: '74,6%' },
      { nama: 'Rasio Elektrifikasi', nilai: '96,3%' }
    ],
    trend: [63.0, 64.2, 65.5, 66.7, 67.6, 68.4] },
  { id: 'sosial', nama: 'Sosial dan Kemiskinan', opd: 'Dinas Sosial', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif kesejahteraan sosial dan kemiskinan.',
    indikator: [
      { nama: 'Tingkat Kemiskinan', nilai: '6,42%' },
      { nama: 'Penerima Bantuan Sosial', nilai: '18.230 KK' },
      { nama: 'Indeks Gini', nilai: '0,31' },
      { nama: 'PMKS Tertangani', nilai: '61,2%' }
    ],
    trend: [7.3, 7.1, 6.9, 6.7, 6.55, 6.42] },
  { id: 'pertanian', nama: 'Pertanian dan Ketahanan Pangan', opd: 'Dinas Pertanian dan Ketahanan Pangan', kualitas: 'Terverifikasi (ilustrasi)',
    deskripsi: 'Indikator ilustratif produksi pertanian dan ketahanan pangan.',
    indikator: [
      { nama: 'Produksi Padi', nilai: '212.400 ton' },
      { nama: 'Luas Panen', nilai: '58.100 ha' },
      { nama: 'Skor Pola Pangan Harapan', nilai: '84,2' },
      { nama: 'Cadangan Pangan Daerah', nilai: '412 ton' }
    ],
    trend: [78.6, 79.8, 80.9, 82.1, 83.2, 84.2] },
  { id: 'lingkungan', nama: 'Lingkungan', opd: 'Dinas Lingkungan Hidup', kualitas: 'Belum Tersedia',
    deskripsi: 'Indikator ilustratif kualitas lingkungan hidup.',
    indikator: [
      { nama: 'Indeks Kualitas Udara', nilai: '78,4' },
      { nama: 'Indeks Kualitas Air', nilai: '65,1' },
      { nama: 'Penanganan Sampah', nilai: '57,3%' },
      { nama: 'Luas Tutupan Lahan Gambut Terjaga', nilai: '71,0%' }
    ],
    trend: [61.0, 62.4, 63.1, 64.0, 64.6, 65.1] },
  { id: 'pelayanan', nama: 'Pelayanan Publik', opd: 'Dinas Penanaman Modal dan PTSP', kualitas: 'Perlu Pemeriksaan',
    deskripsi: 'Indikator ilustratif pelayanan publik dan perizinan.',
    indikator: [
      { nama: 'Indeks Kepuasan Masyarakat', nilai: '82,1' },
      { nama: 'Waktu Layanan Perizinan Rata-rata', nilai: '4,2 hari' },
      { nama: 'Perizinan Terbit Tepat Waktu', nilai: '88,9%' },
      { nama: 'Pengaduan Terselesaikan', nilai: '90,4%' }
    ],
    trend: [77.5, 78.6, 79.8, 80.6, 81.4, 82.1] }
];

const SECTOR_UPDATED_DUMMY = {
  kesehatan: '2026-06-20', pendidikan: '2026-06-18', kependudukan: '2026-05-30',
  ekonomi: '2026-06-22', 'pad-sektor': '2026-06-25', infrastruktur: '2026-05-12',
  sosial: '2026-06-15', pertanian: '2026-06-10', lingkungan: '2026-04-28', pelayanan: '2026-06-19'
};

// Konten untuk 4 menu yang pada v1 ini baru berupa rencana pengembangan
// (belum dibangun penuh) - lihat README bagian "Fitur yang masih ilustrasi".
const ROADMAP_CONTENT = {
  'pusat-data': {
    title: 'Pusat Data',
    intro: 'Katalog terpusat seluruh dataset dari OPD, lengkap dengan status kualitas dan klasifikasi akses.',
    planned: [
      'Katalog dataset per sektor dan OPD sumber, dengan pencarian dan filter status',
      'Detail dataset: periode, tingkat wilayah, pembaruan terakhir, dan klasifikasi akses',
      'Mekanisme unduh data sesuai hak akses pengguna'
    ]
  },
  'monitoring-opd': {
    title: 'Monitoring OPD',
    intro: 'Pemantauan status integrasi data dari seluruh OPD di Kabupaten Kapuas.',
    planned: [
      'Ringkasan jumlah sumber aktif, perlu pemeriksaan, gagal, dan belum terhubung',
      'Riwayat sinkronisasi dan kegagalan per sumber data',
      'Filter berdasarkan status dan tipe sumber (HTML, PDF, Excel, API)'
    ]
  },
  laporan: {
    title: 'Pusat Laporan',
    intro: 'Pembuatan laporan otomatis dari data yang sudah tervalidasi.',
    planned: [
      'Templat laporan: ringkasan eksekutif, profil kecamatan, indikator strategis, rekap OPD, kualitas data',
      'Ekspor laporan ke PDF dengan periode dan penanggung jawab yang jelas'
    ]
  },
  administrasi: {
    title: 'Administrasi',
    intro: 'Pengelolaan pengguna, peran, dan hak akses portal.',
    planned: [
      'Manajemen akun pengguna dan peran (Bupati/Pimpinan, Administrator, Operator Data, Pengguna OPD, Auditor)',
      'Matriks hak akses per modul',
      'Katalog indikator resmi dan log audit aktivitas'
    ]
  }
};

/* ==========================================================================
   2. STATE & UTIL
   ========================================================================== */

const state = {
  activePage: 'beranda',
  periodId: 'p1',
  selectedDistrictId: DISTRICTS[0].id,
  gridIndicator: 'stunting',
  sidebarCollapsed: false,
  mobileOpen: false
};

const chartRegistry = [];

function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatNumber(value, decimals) {
  return value.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function currentPeriod() { return PERIODS.find((p) => p.id === state.periodId) || PERIODS[0]; }
function statusChipClass(status) {
  if (status.indexOf('Terverifikasi') === 0) return 'chip-green';
  if (status.indexOf('Perlu') === 0) return 'chip-amber';
  if (status.indexOf('Belum') === 0) return 'chip-muted';
  return 'chip-blue';
}

function showToast(message, type) {
  const container = qs('#toastContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'toast' + (type ? ' ' + type : '');
  div.setAttribute('role', 'status');
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => { div.remove(); }, 3400);
}

function openModal({ title, bodyHtml, actions }) {
  const root = qs('#modalRoot');
  const actionsHtml = (actions || [{ label: 'Tutup', variant: 'btn' }])
    .map((a, i) => `<button type="button" class="${a.variant || 'btn'}" data-modal-action="${i}">${escapeHtml(a.label)}</button>`)
    .join('');
  root.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button type="button" class="modal-close" id="modalCloseBtn" aria-label="Tutup dialog">Tutup</button>
        <h2 id="modalTitle">${escapeHtml(title)}</h2>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions">${actionsHtml}</div>
      </div>
    </div>`;
  const overlay = qs('#modalOverlay');
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('#modalCloseBtn').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  qsa('[data-modal-action]', root).forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const action = (actions || [])[i];
      if (action && typeof action.onClick === 'function') action.onClick();
      close();
    });
  });
  qs('#modalCloseBtn').focus();
}

/* ==========================================================================
   3. CHART HELPERS (canvas, tanpa dependency eksternal)
   ========================================================================== */

function setupCanvas(canvas) {
  const scale = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 220;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { ctx, width, height };
}

function drawLineChart(canvasId, labels, series, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const pad = { left: 46, right: 16, top: 16, bottom: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const allValues = series.flatMap((s) => s.values);
  let min = opts && opts.min !== undefined ? opts.min : Math.min(...allValues);
  let max = opts && opts.max !== undefined ? opts.max : Math.max(...allValues);
  if (min === max) { min -= 1; max += 1; }
  const paddPad = (max - min) * 0.12;
  min -= paddPad; max += paddPad;

  ctx.font = '11px Segoe UI, Arial';
  ctx.strokeStyle = '#dce3e9';
  ctx.fillStyle = '#5c6b7a';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = min + ((max - min) / steps) * i;
    const py = pad.top + h - ((val - min) / (max - min)) * h;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(width - pad.right, py); ctx.stroke();
    ctx.fillText(val.toFixed(1), 4, py + 4);
  }

  series.forEach((s) => {
    const points = s.values.map((v, i) => ({
      x: pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * w : w / 2),
      y: pad.top + h - ((v - min) / (max - min)) * h
    }));
    if (s.fill) {
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.lineTo(points[points.length - 1].x, pad.top + h);
      ctx.lineTo(points[0].x, pad.top + h);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
      gradient.addColorStop(0, s.color + '48');
      gradient.addColorStop(1, s.color + '04');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle = s.color; ctx.lineWidth = s.dashed ? 2 : 3;
    if (s.dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
    points.forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
    });
  });

  ctx.fillStyle = '#5c6b7a'; ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    const x = pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * w : w / 2);
    ctx.fillText(label, x, height - 10);
  });
  ctx.textAlign = 'left';
}

function drawBarChart(canvasId, labels, series, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const pad = { left: 46, right: 16, top: 16, bottom: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const allValues = series.flatMap((s) => s.values);
  const max = (opts && opts.max) || Math.max(...allValues) * 1.15;
  const groupW = w / labels.length;
  const barW = (groupW * 0.62) / series.length;

  ctx.strokeStyle = '#dce3e9'; ctx.fillStyle = '#5c6b7a'; ctx.font = '11px Segoe UI, Arial';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (max / steps) * i;
    const py = pad.top + h - (val / max) * h;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(width - pad.right, py); ctx.stroke();
    ctx.fillText(Math.round(val).toString(), 4, py + 4);
  }

  labels.forEach((label, gi) => {
    const groupX = pad.left + gi * groupW + groupW * 0.19;
    series.forEach((s, si) => {
      const val = s.values[gi];
      const barH = (val / max) * h;
      const x = groupX + si * barW;
      const y = pad.top + h - barH;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y, barW * 0.86, barH);
    });
    ctx.fillStyle = '#5c6b7a'; ctx.textAlign = 'center';
    ctx.fillText(label, pad.left + gi * groupW + groupW / 2, height - 10);
  });
  ctx.textAlign = 'left';
}

/* ==========================================================================
   4. RENDER: BERANDA EKSEKUTIF
   ========================================================================== */

function renderBeranda() {
  const p = currentPeriod();
  const watch = [...DISTRICTS].sort((a, b) => b.stunting - a.stunting).slice(0, 3);

  const kpiCardsHtml = KPI_DEFS.map((k) => {
    const value = k.byPeriod[p.id];
    const prev = k.prevByPeriod[p.id];
    const diff = +(value - prev).toFixed(2);
    const improved = k.better === 'down' ? diff < 0 : diff > 0;
    const deltaClass = diff === 0 ? 'flat' : (improved ? 'up' : 'down');
    const arrow = diff === 0 ? '=' : (diff > 0 ? 'naik' : 'turun');
    const valueStr = k.unit === 'Rp M' ? `Rp${formatNumber(value, k.decimals)} M` : `${formatNumber(value, k.decimals)}%`;
    return `
      <article class="card kpi-card">
        <div class="card-label">${k.label}</div>
        <div class="card-value">${valueStr}</div>
        <div class="delta ${deltaClass}">${arrow} ${formatNumber(Math.abs(diff), k.decimals)} dibanding periode sebelumnya (ilustrasi)</div>
        <span class="dummy-chip">Data dummy</span>
      </article>`;
  }).join('');

  const watchHtml = watch.map((d) => `
    <div class="watch-item">
      <div><strong>${d.nama}</strong><span>Stunting dummy ${formatNumber(d.stunting, 1)}% - Capaian PAD dummy ${d.pad}%</span></div>
      <span class="chip chip-red">Perlu perhatian (ilustrasi)</span>
    </div>`).join('');

  qs('#pageRoot').innerHTML = `
    <div class="page-section">
      <div class="exec-note">
        <h2>Salam eksekutif</h2>
        <p>Selamat datang, <strong>Bupati/Pimpinan (Demo)</strong>. Berikut ringkasan ilustratif kondisi lintas sektor untuk periode <strong>${p.label}</strong>. Seluruh angka pada halaman ini adalah data dummy untuk keperluan paparan internal.</p>
        <span class="dummy-chip">Data dummy - diperbarui (ilustrasi) 25 Juni 2026, 09.00 WIB</span>
      </div>

      <section class="kpi-grid" aria-label="Indikator strategis dummy">${kpiCardsHtml}</section>

      <section class="two-col">
        <article class="panel">
          <div class="panel-head">
            <div><h2>Tren ilustratif prevalensi stunting</h2><p>Enam bulan terakhir pada periode ${p.label} - data dummy</p></div>
            <span class="dummy-chip">Bukan data resmi</span>
          </div>
          <div class="chart-wrap"><canvas id="chartTrenStunting" role="img" aria-label="Grafik tren stunting dummy enam bulan"></canvas></div>
          <p class="chart-summary">Ringkasan teks: nilai bergerak dari ${STUNTING_TREND_BY_PERIOD[p.id][0]}% menjadi ${STUNTING_TREND_BY_PERIOD[p.id][5]}% (ilustrasi, tren membaik).</p>
        </article>
        <article class="panel">
          <div class="panel-head">
            <div><h2>3 kecamatan perlu perhatian</h2><p>Diurutkan dari stunting dummy tertinggi</p></div>
          </div>
          <div class="watch-list">${watchHtml}</div>
        </article>
      </section>

      <section class="two-col">
        <article class="panel">
          <div class="panel-head">
            <div><h2>Target vs realisasi PAD</h2><p>Kumulatif enam bulan, periode ${p.label} - data dummy dalam miliar rupiah</p></div>
            <span class="dummy-chip">Data dummy</span>
          </div>
          <div class="chart-wrap"><canvas id="chartTargetRealisasi" role="img" aria-label="Grafik target vs realisasi PAD dummy"></canvas></div>
          <p class="chart-summary">Ringkasan teks: realisasi kumulatif akhir periode Rp${PAD_TARGET_VS_REALISASI[p.id].realisasi[5]} M dari target Rp${PAD_TARGET_VS_REALISASI[p.id].target[5]} M (ilustrasi).</p>
        </article>
        <article class="panel">
          <div class="panel-head"><div><h2>Ringkasan lintas sektor</h2><p>Status kualitas data ilustratif per sektor</p></div></div>
          <div class="watch-list">
            ${SECTORS.slice(0, 5).map((s) => `
              <div class="watch-item">
                <div><strong>${s.nama}</strong><span>OPD sumber (contoh): ${s.opd}</span></div>
                <span class="chip ${statusChipClass(s.kualitas)}">${s.kualitas}</span>
              </div>`).join('')}
          </div>
        </article>
      </section>

      <section class="warning-panel">
        <h2>Early warning (ilustratif)</h2>
        <p><strong>Fitur ilustratif - ambang dan data belum divalidasi.</strong> Contoh tampilan: 3 kecamatan di atas ditandai memerlukan perhatian berdasarkan ambang dummy yang belum divalidasi. Pada sistem sesungguhnya, ambang, sumber data, dan mekanisme tindak lanjut harus ditetapkan bersama OPD terkait sebelum dijadikan dasar keputusan.</p>
      </section>
    </div>
    <p class="page-foot-note">Halaman Beranda Eksekutif - seluruh indikator, tren, dan narasi adalah data dummy - bukan hasil analisis resmi Kabupaten Kapuas.</p>`;

  chartRegistry.length = 0;
  chartRegistry.push(() => drawLineChart('chartTrenStunting', p.months, [
    { values: STUNTING_TREND_BY_PERIOD[p.id], color: '#2d6fa3', fill: true }
  ]));
  chartRegistry.push(() => drawBarChart('chartTargetRealisasi', p.months, [
    { values: PAD_TARGET_VS_REALISASI[p.id].target, color: '#c9d6df' },
    { values: PAD_TARGET_VS_REALISASI[p.id].realisasi, color: '#1f8a63' }
  ]));
  redrawCharts();
}

/* ==========================================================================
   5. RENDER: DATA LINTAS SEKTOR
   ========================================================================== */

let sektorState = { activeId: SECTORS[0].id, search: '', wilayah: 'Semua Kecamatan' };

function renderLintasSektor() {
  const sector = SECTORS.find((s) => s.id === sektorState.activeId) || SECTORS[0];
  const filteredIndikator = sector.indikator.filter((i) =>
    i.nama.toLowerCase().includes(sektorState.search.toLowerCase()));

  const sectorCardsHtml = SECTORS.map((s) => `
    <button type="button" class="sector-card ${s.id === sector.id ? 'active' : ''}" data-sector="${s.id}">
      <strong>${s.nama}</strong>
      <span>OPD contoh: ${s.opd}</span>
    </button>`).join('');

  const indikatorHtml = filteredIndikator.length ? filteredIndikator.map((i) => `
    <div class="indicator-tile">
      <div class="label">${i.nama}</div>
      <div class="value">${i.nilai}</div>
    </div>`).join('') : `
    <div class="empty-state" style="grid-column: 1/-1;">
      Tidak ada indikator yang cocok dengan pencarian "${escapeHtml(sektorState.search)}".
    </div>`;

  qs('#pageRoot').innerHTML = `
    <div class="page-section">
      <section class="sector-grid" aria-label="Kategori sektor">${sectorCardsHtml}</section>

      <div class="filter-bar" role="search">
        <div class="field">
          <label for="sektorSearch">Cari indikator</label>
          <input id="sektorSearch" type="text" placeholder="Contoh: stunting, inflasi..." value="${escapeHtml(sektorState.search)}">
        </div>
        <div class="field">
          <label for="sektorWilayah">Filter kecamatan</label>
          <select id="sektorWilayah">
            <option ${sektorState.wilayah === 'Semua Kecamatan' ? 'selected' : ''}>Semua Kecamatan</option>
            ${DISTRICTS.map((d) => `<option ${sektorState.wilayah === d.nama ? 'selected' : ''}>${d.nama}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="sektorPeriode">Periode</label>
          <select id="sektorPeriode">
            ${PERIODS.map((per) => `<option value="${per.id}" ${per.id === state.periodId ? 'selected' : ''}>${per.label}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn" id="resetSektorFilter">Reset filter</button>
      </div>

      <section class="panel" style="margin-bottom:16px;">
        <div class="panel-head">
          <div>
            <h2>${sector.nama}</h2>
            <p>${sector.deskripsi}</p>
          </div>
          <span class="chip ${statusChipClass(sector.kualitas)}">${sector.kualitas}</span>
        </div>
        <div class="meta-row">
          <span>Sumber OPD (contoh): <strong>${sector.opd}</strong></span>
          <span>Pembaruan (dummy): <strong>${SECTOR_UPDATED_DUMMY[sector.id]}</strong></span>
          <span>Wilayah terpilih: <strong>${sektorState.wilayah}</strong></span>
        </div>
        <div class="indicator-list" style="margin-top:14px;">${indikatorHtml}</div>
        <div class="chart-wrap"><canvas id="chartSektor" role="img" aria-label="Grafik tren indikator sektor ${sector.nama}"></canvas></div>
        <p class="chart-summary">Ringkasan teks: tren dummy ${sector.trend[0]} menjadi ${sector.trend[5]} sepanjang enam periode contoh.</p>
        <p class="illustrative-note">Label kualitas data adalah contoh mekanisme, bukan status data sesungguhnya.</p>
      </section>
    </div>
    <p class="page-foot-note">Halaman Data Lintas Sektor - seluruh indikator dan grafik adalah data dummy dari 10 kategori sektor ilustratif.</p>`;

  qsa('.sector-card').forEach((btn) => btn.addEventListener('click', () => {
    sektorState.activeId = btn.dataset.sector;
    renderLintasSektor();
  }));
  qs('#sektorSearch').addEventListener('input', (e) => {
    sektorState.search = e.target.value;
    renderLintasSektor();
    qs('#sektorSearch').focus();
    qs('#sektorSearch').selectionStart = qs('#sektorSearch').value.length;
  });
  qs('#sektorWilayah').addEventListener('change', (e) => {
    sektorState.wilayah = e.target.value;
    showToast('Filter kecamatan diterapkan (ilustrasi): ' + e.target.value);
    renderLintasSektor();
  });
  qs('#sektorPeriode').addEventListener('change', (e) => {
    state.periodId = e.target.value;
    syncPeriodSelect();
    renderLintasSektor();
  });
  qs('#resetSektorFilter').addEventListener('click', () => {
    sektorState = { activeId: sector.id, search: '', wilayah: 'Semua Kecamatan' };
    showToast('Filter sektor direset.');
    renderLintasSektor();
  });

  chartRegistry.length = 0;
  chartRegistry.push(() => drawLineChart('chartSektor', currentPeriod().months, [
    { values: sector.trend, color: '#2d6fa3', fill: true }
  ]));
  redrawCharts();
}

/* ==========================================================================
   6. RENDER: ANALISIS KECAMATAN
   ========================================================================== */

function renderKecamatan() {
  const district = DISTRICTS.find((d) => d.id === state.selectedDistrictId) || DISTRICTS[0];
  const avgStunting = districtAverage('stunting');
  const avgPad = districtAverage('pad');
  const avgKemiskinan = districtAverage('kemiskinan');
  const ranking = [...DISTRICTS].sort((a, b) => b.stunting - a.stunting);

  const indicatorColors = { stunting: '#b7392f', pad: '#1f8a63', kemiskinan: '#b8790f', infrastruktur: '#2d6fa3' };
  const gridValues = DISTRICTS.map((d) => d[state.gridIndicator]);
  const gMin = Math.min(...gridValues), gMax = Math.max(...gridValues);
  const higherIsBad = state.gridIndicator === 'stunting' || state.gridIndicator === 'kemiskinan';

  function cellColor(value) {
    const ratio = gMax === gMin ? 0.5 : (value - gMin) / (gMax - gMin);
    const intensity = higherIsBad ? ratio : 1 - ratio;
    if (intensity > 0.66) return '#f3c9c2';
    if (intensity > 0.33) return '#f6e2b2';
    return '#c7e7d8';
  }

  const gridHtml = DISTRICTS.map((d) => `
    <button type="button" class="map-cell ${d.id === district.id ? 'selected' : ''}" style="background:${cellColor(d[state.gridIndicator])}"
      data-district="${d.id}" title="${d.nama}: ${d[state.gridIndicator]}${state.gridIndicator === 'pad' ? '%' : state.gridIndicator === 'infrastruktur' ? ' indeks' : '%'}">
      ${d.nama}
    </button>`).join('');

  const rankingRows = ranking.map((d, i) => `
    <tr>
      <td>${i + 1}</td><td>${d.nama}</td>
      <td class="num">${formatNumber(d.stunting, 1)}%</td>
      <td class="num">${d.pad}%</td>
      <td class="num">${formatNumber(d.kemiskinan, 1)}%</td>
    </tr>`).join('');

  qs('#pageRoot').innerHTML = `
    <div class="page-section">
      <div class="district-toolbar">
        <div class="field">
          <label for="districtSelect">Pilih kecamatan</label>
          <select id="districtSelect">
            ${DISTRICTS.map((d) => `<option value="${d.id}" ${d.id === district.id ? 'selected' : ''}>${d.nama}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="gridIndicatorSelect">Warnai grid berdasarkan</label>
          <select id="gridIndicatorSelect">
            <option value="stunting" ${state.gridIndicator === 'stunting' ? 'selected' : ''}>Stunting</option>
            <option value="pad" ${state.gridIndicator === 'pad' ? 'selected' : ''}>Capaian PAD</option>
            <option value="kemiskinan" ${state.gridIndicator === 'kemiskinan' ? 'selected' : ''}>Kemiskinan</option>
            <option value="infrastruktur" ${state.gridIndicator === 'infrastruktur' ? 'selected' : ''}>Indeks infrastruktur</option>
          </select>
        </div>
      </div>

      <section class="two-col">
        <article class="panel district-profile">
          <div class="panel-head">
            <div><h2>Profil kecamatan ${district.nama}</h2><p>Seluruh nilai adalah data dummy</p></div>
            <span class="dummy-chip">Data dummy</span>
          </div>
          <div class="indicator-list">
            <div class="indicator-tile"><div class="label">Stunting</div><div class="value">${formatNumber(district.stunting, 1)}%</div></div>
            <div class="indicator-tile"><div class="label">Capaian PAD</div><div class="value">${district.pad}%</div></div>
            <div class="indicator-tile"><div class="label">Kemiskinan</div><div class="value">${formatNumber(district.kemiskinan, 1)}%</div></div>
            <div class="indicator-tile"><div class="label">Pengangguran</div><div class="value">${formatNumber(district.pengangguran, 1)}%</div></div>
            <div class="indicator-tile"><div class="label">Indeks infrastruktur</div><div class="value">${district.infrastruktur}</div></div>
          </div>
          <div class="chart-wrap"><canvas id="chartDistrictTrend" role="img" aria-label="Tren stunting dummy kecamatan ${district.nama}"></canvas></div>
          <p class="chart-summary">Ringkasan teks: tren stunting dummy ${district.trend[0]}% menjadi ${district.trend[5]}%.</p>
        </article>

        <article class="panel">
          <div class="panel-head"><div><h2>Perbandingan vs rata-rata kabupaten</h2><p>Data dummy</p></div></div>
          <div class="compare-bars">
            ${[
              ['Stunting (%)', district.stunting, avgStunting, 25],
              ['Capaian PAD (%)', district.pad, avgPad, 100],
              ['Kemiskinan (%)', district.kemiskinan, avgKemiskinan, 10]
            ].map(([label, val, avg, maxScale]) => `
              <div class="compare-row"><span>${label}</span>
                <div class="compare-track">
                  <div class="compare-fill average" style="width:${Math.min(100, (avg / maxScale) * 100)}%"></div>
                  <div class="compare-fill selected" style="width:${Math.min(100, (val / maxScale) * 100)}%; opacity:.85"></div>
                </div>
                <span>${formatNumber(val, 1)}</span>
              </div>`).join('')}
          </div>
          <div class="legend">
            <span><i style="background:var(--blue)"></i>${district.nama}</span>
            <span><i style="background:var(--amber)"></i>Rata-rata kabupaten (dummy)</span>
          </div>
        </article>
      </section>

      <section class="panel" style="margin-bottom:16px;">
        <div class="panel-head"><div><h2>Peta placeholder 17 kecamatan</h2><p>Klik salah satu wilayah untuk melihat detail</p></div></div>
        <div class="map-grid" role="group" aria-label="Placeholder grid 17 kecamatan">${gridHtml}</div>
        <div class="legend">
          <span><i style="background:#c7e7d8"></i>Ilustrasi rendah</span>
          <span><i style="background:#f6e2b2"></i>Ilustrasi sedang</span>
          <span><i style="background:#f3c9c2"></i>Ilustrasi tinggi</span>
        </div>
        <p class="illustrative-note">Visualisasi wilayah ini hanya placeholder, bukan peta administratif/GIS.</p>
      </section>

      <section class="panel table-panel">
        <div class="panel-head"><div><h2>Tabel peringkat dummy (berdasarkan stunting)</h2><p>Nama wilayah resmi, nilai indikator dummy</p></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Kecamatan</th><th class="num">Stunting</th><th class="num">Capaian PAD</th><th class="num">Kemiskinan</th></tr></thead>
            <tbody>${rankingRows}</tbody>
          </table>
        </div>
      </section>
    </div>
    <p class="page-foot-note">Halaman Analisis Kecamatan - 17 nama kecamatan sesuai referensi wilayah resmi, seluruh nilai indikator adalah data dummy.</p>`;

  qs('#districtSelect').addEventListener('change', (e) => {
    state.selectedDistrictId = e.target.value;
    renderKecamatan();
  });
  qs('#gridIndicatorSelect').addEventListener('change', (e) => {
    state.gridIndicator = e.target.value;
    renderKecamatan();
  });
  qsa('.map-cell').forEach((cell) => cell.addEventListener('click', () => {
    state.selectedDistrictId = cell.dataset.district;
    renderKecamatan();
  }));

  chartRegistry.length = 0;
  chartRegistry.push(() => drawLineChart('chartDistrictTrend', currentPeriod().months, [
    { values: district.trend, color: indicatorColors[state.gridIndicator] || '#2d6fa3', fill: true }
  ]));
  redrawCharts();
}

/* ==========================================================================
   7. RENDER: WHATSAPP BOT (embed)
   ========================================================================== */

function renderWaBot() {
  qs('#pageRoot').innerHTML = `
    <div class="page-section">
      <section class="panel wa-embed-wrap">
        <div class="wa-embed-head">
          <div><h2 style="margin:0;color:var(--navy-2);">Ilustrasi WhatsApp Bot</h2><p style="margin:2px 0 0;color:var(--muted);font-size:.8rem;">Simulasi percakapan, tidak terhubung ke WhatsApp sungguhan</p></div>
          <div style="display:flex;gap:8px;">
            <span class="dummy-chip">Tidak terhubung ke WhatsApp</span>
            <a class="btn btn-sm" href="wa-bot-preview.html" target="_blank" rel="noopener">Buka di tab baru</a>
          </div>
        </div>
        <iframe src="wa-bot-preview.html" title="Ilustrasi percakapan WhatsApp Bot SABABUKA"></iframe>
      </section>
    </div>
    <p class="page-foot-note">Halaman WhatsApp Bot - seluruh percakapan adalah simulasi lokal di browser, tidak ada pesan yang benar-benar terkirim. Ke depan, portal ini direncanakan dibungkus menjadi aplikasi Android dan terhubung dengan bot ini.</p>`;
  chartRegistry.length = 0;
}

/* ==========================================================================
   8. RENDER: HALAMAN RENCANA PENGEMBANGAN (Pusat Data, Monitoring OPD,
   Pusat Laporan, Administrasi)

   Keempat menu ini sengaja belum dibangun penuh pada v1. Tujuan utama versi
   ini adalah dashboard ringkasan eksekutif (Beranda, Lintas Sektor,
   Kecamatan). Detail fitur di bawah akan digarap sebagai pekerjaan
   terpisah setelah kebutuhan dan sumber data OPD lebih jelas.
   ========================================================================== */

function renderRoadmapPage(pageId) {
  const content = ROADMAP_CONTENT[pageId];
  qs('#pageRoot').innerHTML = `
    <div class="page-section">
      <section class="panel roadmap-panel">
        <p class="roadmap-tag">Rencana pengembangan lanjutan, belum dibangun pada v1</p>
        <h2>${content.title}</h2>
        <p>${content.intro}</p>
        <p style="margin-top:14px;color:var(--muted);font-size:.82rem;">Yang direncanakan pada tahap pekerjaan berikutnya:</p>
        <ul class="roadmap-list">
          ${content.planned.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    </div>
    <p class="page-foot-note">Halaman ${content.title} baru berupa rencana - fokus v1 ada pada Beranda Eksekutif, Data Lintas Sektor, dan Analisis Kecamatan.</p>`;
  chartRegistry.length = 0;
}

/* ==========================================================================
   9. ROUTER, NAV, TOPBAR, INIT
   ========================================================================== */

const PAGES = {
  beranda: { title: 'Beranda Eksekutif', subtitle: 'Ringkasan indikator strategis lintas sektor', render: renderBeranda },
  'lintas-sektor': { title: 'Data Lintas Sektor', subtitle: '10 kategori data OPD dalam satu portal', render: renderLintasSektor },
  kecamatan: { title: 'Analisis Kecamatan', subtitle: '17 kecamatan Kabupaten Kapuas', render: renderKecamatan },
  'pusat-data': { title: 'Pusat Data', subtitle: 'Rencana pengembangan lanjutan', render: () => renderRoadmapPage('pusat-data') },
  'monitoring-opd': { title: 'Monitoring OPD', subtitle: 'Rencana pengembangan lanjutan', render: () => renderRoadmapPage('monitoring-opd') },
  laporan: { title: 'Pusat Laporan', subtitle: 'Rencana pengembangan lanjutan', render: () => renderRoadmapPage('laporan') },
  'wa-bot': { title: 'WhatsApp Bot', subtitle: 'Ilustrasi asisten WhatsApp khusus pimpinan', render: renderWaBot },
  administrasi: { title: 'Administrasi', subtitle: 'Rencana pengembangan lanjutan', render: () => renderRoadmapPage('administrasi') }
};

function redrawCharts() {
  chartRegistry.forEach((fn) => fn());
}

function syncPeriodSelect() {
  const sel = qs('#periodSelect');
  if (sel) sel.value = state.periodId;
}

function setLoading(callback) {
  const root = qs('#pageRoot');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.innerHTML = `<div class="page-section"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block" style="height:220px;"></div></div>`;
  setTimeout(callback, reduceMotion ? 0 : 220);
}

function navigateTo(pageId) {
  if (!PAGES[pageId]) return;
  state.activePage = pageId;
  const page = PAGES[pageId];
  qs('#pageTitle').textContent = page.title;
  qs('#pageSubtitle').textContent = page.subtitle;
  qsa('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
  document.title = page.title + ' - SABABUKA BERSINAR (Prototipe)';
  setLoading(() => { page.render(); qs('#pageTitle').focus(); });
  closeMobileSidebar();
}

function closeMobileSidebar() {
  state.mobileOpen = false;
  qs('#appShell').classList.remove('mobile-open');
}

function buildSidebar() {
  qs('#navList').innerHTML = Object.keys(PAGES).map((id) => `
    <button type="button" class="nav-item ${id === state.activePage ? 'active' : ''}" data-page="${id}">
      <span class="nav-label">${PAGES[id].title}</span>
    </button>`).join('');
  qsa('.nav-item').forEach((btn) => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
}

function initTopbar() {
  qs('#periodSelect').innerHTML = PERIODS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
  syncPeriodSelect();
  qs('#periodSelect').addEventListener('change', (e) => {
    state.periodId = e.target.value;
    showToast('Periode ilustrasi diperbarui: ' + currentPeriod().label);
    PAGES[state.activePage].render();
  });

  qs('#sidebarToggle').addEventListener('click', () => {
    const shell = qs('#appShell');
    if (window.matchMedia('(max-width: 880px)').matches) {
      state.mobileOpen = !state.mobileOpen;
      shell.classList.toggle('mobile-open', state.mobileOpen);
    } else {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      shell.classList.toggle('collapsed', state.sidebarCollapsed);
      setTimeout(redrawCharts, 200);
    }
  });
  qs('#sidebarBackdrop').addEventListener('click', closeMobileSidebar);

  qs('#fullscreenBtn').addEventListener('click', () => {
    try {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : Promise.reject())
          .catch(() => showToast('Mode layar penuh tidak didukung pada browser ini.', 'warning'));
      } else {
        document.exitFullscreen();
      }
    } catch (e) {
      showToast('Mode layar penuh tidak didukung pada browser ini.', 'warning');
    }
  });

  qs('#helpBtn').addEventListener('click', () => openModal({
    title: 'Tentang prototipe DIES',
    bodyHtml: `<p>Portal ini adalah <strong>mockup statis</strong> untuk paparan internal SABABUKA BERSINAR. Tidak ada backend, database, scraper, ataupun koneksi WhatsApp/AI yang sesungguhnya. Seluruh angka adalah data karangan.</p>
      <p>Fokus v1 ada pada Beranda Eksekutif, Data Lintas Sektor, dan Analisis Kecamatan - tiga halaman ini yang menjawab kebutuhan utama, yaitu pimpinan dapat melihat data OPD dalam satu dashboard. Menu lain masih berupa rencana pengembangan.</p>`,
    actions: [{ label: 'Mengerti', variant: 'btn-primary' }]
  }));

  qs('#userChip').addEventListener('click', () => openModal({
    title: 'Profil pengguna (contoh)',
    bodyHtml: `<dl><dt>Nama</dt><dd>Akun Demo - Pimpinan</dd><dt>Peran</dt><dd>Bupati/Pimpinan (contoh)</dd><dt>Status login</dt><dd>Simulasi, belum ada autentikasi sungguhan</dd></dl>`,
    actions: [{ label: 'Tutup', variant: 'btn-primary' }]
  }));
}

function init() {
  buildSidebar();
  initTopbar();
  navigateTo('beranda');
  window.addEventListener('resize', () => redrawCharts());
}

document.addEventListener('DOMContentLoaded', init);
