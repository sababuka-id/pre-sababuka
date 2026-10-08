const path = require('node:path');
const fs = require('node:fs');
const PptxGenJS = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'SABABUKA Bersinar';
pptx.subject = 'Update master data, alur validasi, dan rencana integrasi SABABUKA';
pptx.title = 'Update SABABUKA Bersinar - 9 Oktober 2026';
pptx.company = 'Kabupaten Kapuas';
pptx.lang = 'id-ID';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'id-ID',
};

const C = {
  navy: '0B2344',
  blue: '17558A',
  teal: '008D83',
  orange: 'D97A22',
  ink: '17324D',
  muted: '5D7186',
  pale: 'F3F7FA',
  line: 'D8E3EC',
  white: 'FFFFFF',
  red: 'B3423E',
  green: '2D7A61',
};
const W = 13.333;
const H = 7.5;
const OUT = path.resolve('output/presentation-final/SABABUKA_Paparan_Update_Alur_dan_Integrasi_9_Oktober_2026.pptx');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

function addBg(slide, color = C.white) {
  slide.background = { color };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.1, line: { color: C.teal, transparency: 100 }, fill: { color: C.teal } });
}

function addFooter(slide, n, label = 'SABABUKA BERSINAR · KABUPATEN KAPUAS') {
  slide.addText(label, { x: 0.55, y: 7.18, w: 6.3, h: 0.16, fontFace: 'Aptos', fontSize: 7.5, color: C.muted, margin: 0, breakLine: false, fit: 'shrink' });
  slide.addText(String(n).padStart(2, '0'), { x: 12.28, y: 7.13, w: 0.5, h: 0.22, fontFace: 'Aptos', fontSize: 9, bold: true, color: C.blue, align: 'right', margin: 0 });
}

function addTitle(slide, title, subtitle, n) {
  slide.addText(title, { x: 0.58, y: 0.42, w: 11.6, h: 0.48, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: C.navy, margin: 0, breakLine: false, fit: 'shrink' });
  if (subtitle) slide.addText(subtitle, { x: 0.6, y: 0.98, w: 11.4, h: 0.3, fontFace: 'Aptos', fontSize: 11.5, color: C.muted, margin: 0, fit: 'shrink' });
  addFooter(slide, n);
}

function text(slide, value, x, y, w, h, opts = {}) {
  slide.addText(value, { x, y, w, h, fontFace: opts.fontFace || 'Aptos', fontSize: opts.fontSize || 16, color: opts.color || C.ink, bold: opts.bold || false, margin: opts.margin ?? 0, breakLine: false, fit: 'shrink', valign: opts.valign || 'mid', align: opts.align || 'left', bullet: opts.bullet, paraSpaceAfterPt: opts.paraSpaceAfterPt });
}

function card(slide, x, y, w, h, title, body, accent = C.blue) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, line: { color: C.line, width: 1 }, fill: { color: C.white } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  text(slide, title, x + 0.22, y + 0.18, w - 0.35, 0.3, { fontSize: 15, bold: true, color: C.navy });
  text(slide, body, x + 0.22, y + 0.58, w - 0.38, h - 0.72, { fontSize: 12.2, color: C.muted, valign: 'top' });
}

function pill(slide, label, x, y, w, color = C.blue) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.08, line: { color, transparency: 100 }, fill: { color } });
  text(slide, label, x + 0.1, y + 0.04, w - 0.2, 0.22, { fontSize: 9, bold: true, color: C.white, align: 'center' });
}

function step(slide, num, title, body, x, y, w, accent) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  text(slide, String(num), x, y + 0.02, 0.42, 0.3, { fontSize: 13, bold: true, color: C.white, align: 'center' });
  text(slide, title, x + 0.58, y - 0.01, w - 0.58, 0.25, { fontSize: 14, bold: true, color: C.navy });
  text(slide, body, x + 0.58, y + 0.3, w - 0.58, 0.45, { fontSize: 10.5, color: C.muted, valign: 'top' });
}

// 1 Cover
{
  const s = pptx.addSlide(); addBg(s, C.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.1, w: 5.0, h: 7.4, line: { color: C.blue, transparency: 100 }, fill: { color: C.blue, transparency: 55 } });
  s.addShape(pptx.ShapeType.arc, { x: 9.1, y: 0.9, w: 4.8, h: 4.8, line: { color: C.teal, width: 3, transparency: 15 }, adjustPoint: 0.25, rotate: 18 });
  s.addShape(pptx.ShapeType.arc, { x: 9.65, y: 1.45, w: 3.7, h: 3.7, line: { color: C.orange, width: 1.5, transparency: 15 }, adjustPoint: 0.25, rotate: 18 });
  text(s, 'SABABUKA', 0.78, 1.0, 4.6, 0.38, { fontSize: 18, bold: true, color: '8EE2D9' });
  text(s, 'BERSINAR', 0.78, 1.42, 4.6, 0.38, { fontSize: 18, bold: true, color: C.white });
  text(s, 'Update master data,\nalur validasi, dan\nrencana integrasi', 0.78, 2.25, 7.2, 1.65, { fontSize: 31, bold: true, color: C.white, valign: 'top' });
  text(s, 'Bahan paparan antara\nJumat, 9 Oktober 2026', 0.8, 5.6, 4.5, 0.65, { fontSize: 14, color: 'C9D8E7', valign: 'top' });
  text(s, 'Kabupaten Kapuas', 9.1, 5.98, 3.2, 0.3, { fontSize: 15, bold: true, color: C.white, align: 'right' });
  text(s, 'Master data indikator pembangunan', 8.2, 6.35, 4.1, 0.3, { fontSize: 11, color: 'C9D8E7', align: 'right' });
  s.addNotes('Sumber: Matrix RPJMD dan catatan keputusan tata kelola SABABUKA. Lingkungan yang ditampilkan adalah demo/UAT lokal.');
}

// 2 Position
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Posisi SABABUKA saat ini', 'Sistem sedang menata fondasi sebelum sinkronisasi data resmi', 2);
  text(s, 'SABABUKA berfungsi sebagai master data indikator dan ruang tata kelola. Angka realisasi dari sumber resmi masuk setelah definisi, pemilik, dan alurnya disepakati.', 0.62, 1.55, 11.9, 0.58, { fontSize: 19, bold: true, color: C.blue, valign: 'top' });
  card(s, 0.65, 2.55, 3.75, 2.45, 'Yang sudah tersedia', 'Master kategori dan indikator\nTarget tahunan 2025-2029\nRole dan scope akses\nAlur draft, review, verifikasi, publikasi', C.teal);
  card(s, 4.78, 2.55, 3.75, 2.45, 'Yang sedang disepakati', 'Fokus kebijakan\nIsu atau kategori strategis\nOPD pemilik dan bidang pengelola\nStatus organisasi yang masuk', C.orange);
  card(s, 8.9, 2.55, 3.75, 2.45, 'Tahap berikutnya', 'Integrasi BPS\nMapping Satu Data Kapuas\nValidasi observasi\nRilis data yang dapat ditelusuri', C.blue);
  pill(s, 'MASTER DATA', 0.68, 5.55, 1.3, C.blue); text(s, 'menyimpan struktur dan aturan', 2.12, 5.57, 2.6, 0.24, { fontSize: 12, color: C.muted });
  pill(s, 'SUMBER RESMI', 5.02, 5.55, 1.52, C.teal); text(s, 'menyediakan realisasi', 6.7, 5.57, 2.4, 0.24, { fontSize: 12, color: C.muted });
  pill(s, 'PIMPINAN', 9.32, 5.55, 1.05, C.orange); text(s, 'membaca hasil yang disetujui', 10.52, 5.57, 2.2, 0.24, { fontSize: 12, color: C.muted });
  s.addNotes('Sumber: docs/18-rundown-ekspose-antara-2026-10-09.md dan audit release 8 Oktober 2026.');
}

// 3 Current build
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Fondasi yang sudah berjalan', 'Pilot lokal memisahkan master, data demo, dan data bersumber resmi', 3);
  const stats = [ ['5', 'kategori pilot'], ['15', 'indikator pilot'], ['2025-2029', 'cakupan target tahunan'], ['5', 'role aplikasi'] ];
  stats.forEach((item, i) => { const x = 0.7 + i * 3.05; s.addShape(pptx.ShapeType.roundRect, { x, y: 1.55, w: 2.65, h: 1.18, rectRadius: 0.06, line: { color: C.line }, fill: { color: C.pale } }); text(s, item[0], x + 0.16, 1.72, 2.3, 0.38, { fontSize: i === 2 ? 22 : 29, bold: true, color: C.blue }); text(s, item[1], x + 0.16, 2.18, 2.25, 0.22, { fontSize: 11, color: C.muted }); });
  step(s, 1, 'Master indikator', 'Definisi, satuan, target, OPD pemilik, dan status workflow.', 0.9, 3.25, 5.4, C.blue);
  step(s, 2, 'Review dan verifikasi', 'BAPPERIDA memutuskan substansi. OPD memeriksa sisi teknis.', 0.9, 4.15, 5.4, C.teal);
  step(s, 3, 'Sumber data', 'Konektor Satu Data dan profil BPS sudah tersedia untuk mapping terkontrol.', 6.75, 3.25, 5.4, C.orange);
  step(s, 4, 'Dashboard pimpinan', 'Hanya membaca data yang sudah disetujui dan dipublikasikan.', 6.75, 4.15, 5.4, C.green);
  text(s, 'Label demo tetap dipertahankan sampai OPD dan sumber resmi mengonfirmasi angka.', 0.9, 5.65, 11.4, 0.35, { fontSize: 14, bold: true, color: C.red, align: 'center' });
  s.addNotes('Angka pilot dan batasan demo mengikuti rundown ekspose antara.');
}

// 4 Data hierarchy
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Struktur master data', 'Matrix RPJMD menjadi bahan awal untuk membangun struktur yang dapat menerima sumber data', 4);
  const nodes = [
    ['Matrix RPJMD', 'bahan draft', C.blue],
    ['Fokus kebijakan', 'pengelompokan strategis', C.teal],
    ['Isu / kategori', 'unit pengelolaan', C.orange],
    ['Indikator', 'definisi dan versi', C.blue],
    ['Target tahunan', 'rencana capaian', C.teal],
    ['Sumber dan realisasi', 'data masuk setelah validasi', C.green],
  ];
  nodes.forEach((n, i) => { const x = 0.7 + i * 2.08; s.addShape(pptx.ShapeType.roundRect, { x, y: 2.25, w: 1.72, h: 1.3, rectRadius: 0.06, line: { color: n[2] }, fill: { color: C.white } }); text(s, n[0], x + 0.12, 2.47, 1.48, 0.42, { fontSize: 14, bold: true, color: C.navy, align: 'center' }); text(s, n[1], x + 0.12, 3.03, 1.48, 0.28, { fontSize: 9.5, color: C.muted, align: 'center' }); if (i < nodes.length - 1) s.addShape(pptx.ShapeType.line, { x: x + 1.72, y: 2.9, w: 0.34, h: 0, line: { color: C.muted, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' } }); });
  card(s, 1.05, 4.55, 3.3, 1.1, 'Aturan istilah', 'Fokus menjadi pengelompokan. Kategori atau isu menjadi unit yang dikelola.', C.teal);
  card(s, 5.0, 4.55, 3.3, 1.1, 'Status', 'Draft, review, verifikasi, approved, active, published.', C.orange);
  card(s, 8.95, 4.55, 3.3, 1.1, 'Batas tahap ini', 'Master dan alur sudah disiapkan. Sinkronisasi dilakukan bertahap.', C.blue);
  s.addNotes('Sumber: Matrix RPJMD dan keputusan struktur fokus-kategori-indikator pada diskusi proyek.');
}

// 5 Roles
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Peran dan fungsi yang diperbarui', 'Keputusan substansi berada pada BAPPERIDA dan OPD pemilik', 5);
  const rows = [
    ['UPR', 'Menyusun draft dari Matrix RPJMD', C.blue],
    ['BAPPERIDA', 'Menilai fokus, isu, indikator, target, dan kelayakan tayang', C.teal],
    ['OPD pemilik', 'Memvalidasi kewenangan, definisi, sumber, dan nilai data', C.orange],
    ['Superadmin / developer', 'Menjaga aplikasi, konektor, keamanan, akun, dan reset demo', C.navy],
    ['Kominfo', 'Memantau layanan, alur data, dan keterbukaan dalam mode baca saja', C.muted],
    ['Pimpinan', 'Membaca data yang telah disetujui dan dipublikasikan', C.green],
  ];
  rows.forEach((r, i) => { const y = 1.42 + i * 0.75; s.addShape(pptx.ShapeType.rect, { x: 0.78, y, w: 2.25, h: 0.56, line: { color: r[2], transparency: 100 }, fill: { color: r[2] } }); text(s, r[0], 0.92, y + 0.13, 1.96, 0.22, { fontSize: 14, bold: true, color: C.white, align: 'center' }); s.addShape(pptx.ShapeType.rect, { x: 3.12, y, w: 9.35, h: 0.56, line: { color: C.line }, fill: { color: i % 2 === 0 ? C.pale : C.white } }); text(s, r[1], 3.4, y + 0.13, 8.75, 0.22, { fontSize: 13, color: C.ink }); });
  text(s, 'Operator BAPPERIDA atau Kominfo tetap dapat memakai role OPD dengan scope organisasinya ketika organisasi tersebut menjadi pemilik indikator.', 0.9, 6.28, 11.6, 0.34, { fontSize: 12, color: C.muted, align: 'center' });
  s.addNotes('Perubahan role Kominfo diterapkan melalui migration 027: Kominfo tidak lagi memiliki menu input atau permission aksi konektor.');
}

// 6 Workflow
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Alur persetujuan indikator', 'Persetujuan BAPPERIDA dan verifikasi OPD memiliki fungsi yang berbeda', 6);
  const items = [
    ['1', 'Draft UPR', 'Matrix RPJMD menjadi bahan awal', C.blue],
    ['2', 'Review BAPPERIDA', 'Menilai fokus, isu, indikator, dan target', C.teal],
    ['3', 'Verifikasi OPD', 'Memastikan definisi, sumber, dan operator', C.orange],
    ['4', 'Persetujuan akhir', 'BAPPERIDA menetapkan indikator aktif', C.green],
    ['5', 'Data dan rilis', 'Sumber masuk, diperiksa, lalu dipublikasikan', C.navy],
  ];
  items.forEach((it, i) => { const x = 0.72 + i * 2.48; s.addShape(pptx.ShapeType.ellipse, { x: x + 0.62, y: 1.55, w: 0.72, h: 0.72, line: { color: it[3], transparency: 100 }, fill: { color: it[3] } }); text(s, it[0], x + 0.62, 1.75, 0.72, 0.23, { fontSize: 17, bold: true, color: C.white, align: 'center' }); if (i < items.length - 1) s.addShape(pptx.ShapeType.line, { x: x + 1.34, y: 1.91, w: 1.75, h: 0, line: { color: C.line, width: 2, endArrowType: 'triangle' } }); text(s, it[1], x, 2.58, 2.05, 0.28, { fontSize: 14, bold: true, color: C.navy, align: 'center' }); text(s, it[2], x, 2.98, 2.05, 0.52, { fontSize: 10.5, color: C.muted, align: 'center', valign: 'top' }); });
  card(s, 0.95, 4.5, 3.45, 1.15, 'Jika tidak sesuai', 'BAPPERIDA mengembalikan atau menolak dengan catatan.', C.red);
  card(s, 4.95, 4.5, 3.45, 1.15, 'Jika teknis belum siap', 'OPD mengembalikan kepada BAPPERIDA dengan koreksi sumber.', C.orange);
  card(s, 8.95, 4.5, 3.45, 1.15, 'Jika sudah lengkap', 'Master aktif dan data dapat masuk antrean pemeriksaan.', C.green);
  s.addNotes('Alur ini membedakan persetujuan kebijakan, validasi teknis, dan publikasi data.');
}

// 7 Demo scenario
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Skenario simulasi lintas dashboard', 'Satu indikator diproses dari draft sampai terlihat oleh Pimpinan', 7);
  pill(s, 'CONTOH DEMO', 0.72, 1.35, 1.25, C.orange);
  text(s, 'Ketahanan Pangan Daerah · Ketersediaan Pangan · Indeks Ketahanan Pangan', 2.15, 1.39, 10.4, 0.25, { fontSize: 15, bold: true, color: C.navy });
  const steps = [
    ['UPR', 'membuat draft', C.blue], ['BAPPERIDA', 'menyetujui kategori', C.teal], ['DKPP', 'memvalidasi teknis', C.orange], ['Superadmin', 'mengatur mapping', C.navy], ['BAPPERIDA', 'menyetujui data', C.green], ['Pimpinan', 'melihat rilis', C.blue],
  ];
  steps.forEach((it, i) => { const x = 0.7 + (i % 3) * 4.1; const y = 2.25 + Math.floor(i / 3) * 1.65; s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.55, h: 1.0, rectRadius: 0.06, line: { color: it[2] }, fill: { color: C.white } }); s.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: y + 0.28, w: 0.42, h: 0.42, line: { color: it[2], transparency: 100 }, fill: { color: it[2] } }); text(s, String(i + 1), x + 0.18, y + 0.39, 0.42, 0.16, { fontSize: 10, bold: true, color: C.white, align: 'center' }); text(s, it[0], x + 0.78, y + 0.23, 2.45, 0.22, { fontSize: 13, bold: true, color: C.navy }); text(s, it[1], x + 0.78, y + 0.54, 2.45, 0.2, { fontSize: 11, color: C.muted }); });
  text(s, 'Semua baris demo diberi tag paket dan dapat di-reset Superadmin tanpa menghapus master resmi.', 0.9, 5.95, 11.5, 0.34, { fontSize: 13, bold: true, color: C.red, align: 'center' });
  s.addNotes('Skenario menggunakan data latihan. Sinkronisasi yang ditunjukkan berarti SABABUKA membaca dataset Satu Data, bukan menulis balik.');
}

// 8 Observation review
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Pemeriksaan data masuk', 'BAPPERIDA memeriksa data yang sudah melewati validasi otomatis', 8);
  text(s, 'Sumber masuk', 0.8, 1.42, 2.3, 0.25, { fontSize: 14, bold: true, color: C.blue });
  ['Satu Data Kapuas', 'BPS', 'Unggah OPD', 'Input manual'].forEach((v, i) => { pill(s, v, 0.82, 1.85 + i * 0.47, 1.75, i < 2 ? C.teal : C.orange); });
  s.addShape(pptx.ShapeType.line, { x: 2.75, y: 2.75, w: 1.1, h: 0, line: { color: C.line, width: 2, endArrowType: 'triangle' } });
  card(s, 4.05, 1.6, 2.75, 2.35, 'Validasi sistem', 'Tahun dan wilayah\nSatuan dan tipe nilai\nKelengkapan\nDuplikasi\nRentang nilai', C.teal);
  s.addShape(pptx.ShapeType.line, { x: 6.9, y: 2.75, w: 1.1, h: 0, line: { color: C.line, width: 2, endArrowType: 'triangle' } });
  card(s, 8.2, 1.6, 3.85, 2.35, 'Keputusan BAPPERIDA', 'Setujui untuk publikasi\nKembalikan untuk koreksi\nTolak dengan catatan\nSimpan sumber dan waktu pengambilan', C.orange);
  text(s, 'Yang diperiksa BAPPERIDA', 0.8, 4.55, 3.1, 0.25, { fontSize: 14, bold: true, color: C.navy });
  text(s, 'Indikator dan versinya · sumber dan URL · periode · wilayah · satuan · status OPD · kewajaran nilai · kesesuaian target', 0.8, 4.95, 11.5, 0.55, { fontSize: 16, color: C.muted, valign: 'top' });
  text(s, 'Data yang belum disetujui tidak masuk publikasi pimpinan.', 0.8, 6.1, 11.5, 0.3, { fontSize: 14, bold: true, color: C.red, align: 'center' });
  s.addNotes('Dashboard pemeriksaan data masuk menjadi kebutuhan yang perlu diperjelas di aplikasi.');
}

// 9 Integrations
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Integrasi BPS dan Satu Data', 'Konektor teknis sudah disiapkan, penggunaan resmi tetap menunggu metadata dan akses', 9);
  card(s, 0.72, 1.45, 5.7, 3.8, 'Satu Data Kapuas', 'Discovery katalog\nDataset dan resource\nMapping indikator eksplisit\nPreview dan staging\nImport terkontrol\nProvenance dan checksum', C.teal);
  card(s, 6.92, 1.45, 5.7, 3.8, 'BPS', 'Endpoint atau WebAPI resmi\nAPI key jika diperlukan\nKode indikator dan wilayah\nDefinisi dan satuan\nJadwal rilis\nPenanganan perbedaan angka', C.blue);
  text(s, 'Target RPJMD tetap menjadi target perencanaan. BPS atau Satu Data menyediakan realisasi yang kemudian diperiksa.', 0.9, 5.75, 11.5, 0.5, { fontSize: 17, bold: true, color: C.navy, align: 'center' });
  text(s, 'SABABUKA menarik data dari sumber. Sistem tidak menulis balik ke Satu Data tanpa API dan persetujuan resmi.', 1.15, 6.35, 11.0, 0.28, { fontSize: 12.5, color: C.muted, align: 'center' });
  s.addNotes('Sumber: docs/external-connectors.md dan audit release.');
}

// 10 Data gaps
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Jika OPD belum punya dataset atau website', 'Ketiadaan API tidak menghalangi OPD menjadi pemilik indikator', 10);
  const options = [
    ['Form SABABUKA', 'Input capaian dan keterangan sumber', C.blue],
    ['CSV atau XLSX', 'Template terstruktur dengan periode dan satuan', C.teal],
    ['Dokumen resmi', 'Berkas yang disahkan OPD dan dapat ditelusuri', C.orange],
    ['Sumber resmi lain', 'BPS atau dataset yang disepakati kemudian', C.green],
  ];
  options.forEach((it, i) => { const x = 0.7 + (i % 2) * 6.05; const y = 1.55 + Math.floor(i / 2) * 1.55; card(s, x, y, 5.5, 1.05, it[0], it[1], it[2]); });
  text(s, 'Setiap data tetap membutuhkan pemilik, periode, satuan, wilayah, waktu pembaruan, dan status verifikasi.', 0.9, 5.15, 11.5, 0.45, { fontSize: 16, bold: true, color: C.navy, align: 'center' });
  text(s, 'Sumber diberi label: Manual OPD · Dokumen resmi OPD · Satu Data Kapuas · BPS', 1.15, 5.85, 11.0, 0.3, { fontSize: 13, color: C.muted, align: 'center' });
  s.addNotes('Tidak semua OPD harus memiliki website atau API pada tahap awal.');
}

// 11 Organization confirmation
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Konfirmasi daftar organisasi', 'Daftar organisasi perlu disepakati sebelum pemetaan indikator diperluas', 11);
  const heads = ['Organisasi', 'Jenis', 'Status', 'Catatan'];
  const widths = [3.65, 1.55, 2.4, 4.7]; let x = 0.65;
  heads.forEach((h, i) => { s.addShape(pptx.ShapeType.rect, { x, y: 1.52, w: widths[i], h: 0.5, line: { color: C.navy, transparency: 100 }, fill: { color: C.navy } }); text(s, h, x + 0.12, 1.67, widths[i] - 0.24, 0.18, { fontSize: 11, bold: true, color: C.white }); x += widths[i]; });
  const vals = [ ['Dinas contoh', 'OPD', 'Menunggu konfirmasi', 'Pastikan masuk atau dikeluarkan'], ['Kecamatan contoh', 'Kecamatan', 'Terdaftar', 'Pisahkan dari daftar OPD'], ['Organisasi contoh', 'OPD', 'Perlu koreksi', 'Periksa kode dan nama resmi'] ];
  vals.forEach((row, r) => { let xx = 0.65; row.forEach((v, i) => { s.addShape(pptx.ShapeType.rect, { x: xx, y: 2.02 + r * 0.58, w: widths[i], h: 0.58, line: { color: C.line }, fill: { color: r % 2 ? C.pale : C.white } }); text(s, v, xx + 0.12, 2.18 + r * 0.58, widths[i] - 0.24, 0.18, { fontSize: 10.5, color: C.ink }); xx += widths[i]; }); });
  text(s, 'Pilihan status: Masuk · Tidak masuk · Perlu koreksi · Perlu digabung · Menunggu forum', 0.85, 4.3, 11.5, 0.3, { fontSize: 14, bold: true, color: C.blue, align: 'center' });
  card(s, 2.05, 5.0, 4.0, 1.05, 'Form OPD', 'Website, portal data, PIC, operator, kontak resmi, dan kebutuhan integrasi.', C.teal);
  card(s, 7.25, 5.0, 4.0, 1.05, 'Koordinasi', 'URL grup resmi dan QR code ditampilkan setelah link dikonfirmasi.', C.orange);
  s.addNotes('Daftar organisasi dipakai sebagai bahan konfirmasi forum, bukan langsung sebagai keputusan final.');
}

// 12 IP security
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Perlindungan IP dan keamanan sistem', 'Frontend dapat diamati browser, sehingga aturan penting harus tetap berada di backend', 12);
  const cols = [
    ['Kode dan aturan', 'Workflow, permission, dan keputusan bisnis berada di backend.\nRepository dan credential deployment dibatasi.', C.blue],
    ['Data dan secret', 'API key, token, password, data personal, dan endpoint internal tidak masuk bundle frontend.', C.teal],
    ['Build dan akses', 'Source map produksi dimatikan. CORS, CSP, cookie, rate limit, audit, dan environment dipisahkan.', C.orange],
  ];
  cols.forEach((it, i) => card(s, 0.7 + i * 4.15, 1.65, 3.7, 3.25, it[0], it[1], it[2]));
  text(s, 'Tidak ada aplikasi web yang dapat dibuat sepenuhnya tidak dapat di-inspect. Perlindungan utama berada pada backend, secret management, access control, dan repository privat.', 1.0, 5.55, 11.35, 0.55, { fontSize: 15, bold: true, color: C.navy, align: 'center' });
  s.addNotes('Catatan keamanan ini menjadi batas teknis yang perlu dipahami saat materi dipresentasikan.');
}

// 13 Simulation mode
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Mode Simulasi lintas role', 'Superadmin menguji alur menggunakan akun demo terpisah', 13);
  const roles = [ ['BAPPERIDA', 'Review dan persetujuan', C.teal], ['OPD', 'Verifikasi teknis', C.orange], ['Kominfo', 'Baca status layanan', C.muted], ['Pimpinan', 'Baca hasil rilis', C.blue] ];
  roles.forEach((r, i) => { const x = 0.85 + i * 3.08; s.addShape(pptx.ShapeType.roundRect, { x, y: 1.55, w: 2.55, h: 1.45, rectRadius: 0.06, line: { color: r[2] }, fill: { color: C.white } }); text(s, r[0], x + 0.15, 1.87, 2.25, 0.26, { fontSize: 15, bold: true, color: C.navy, align: 'center' }); text(s, r[1], x + 0.15, 2.28, 2.25, 0.26, { fontSize: 11, color: C.muted, align: 'center' }); });
  card(s, 1.05, 3.75, 3.3, 1.25, 'Pilih akun demo', 'Tombol Superadmin mengisi akun demo di halaman login; autentikasi tetap normal.', C.blue);
  card(s, 5.0, 3.75, 3.3, 1.25, 'Audit tindakan', 'Setiap tindakan lintas role dicatat oleh backend sesuai audit log.', C.teal);
  card(s, 8.95, 3.75, 3.3, 1.25, 'Reset aman', 'Seed demo menghapus transaksi latihan tanpa menyentuh master resmi.', C.orange);
  text(s, 'Tujuannya agar OPD dapat belajar mandiri dari draft sampai dashboard pimpinan.', 0.85, 5.85, 11.5, 0.35, { fontSize: 16, bold: true, color: C.navy, align: 'center' });
  s.addNotes('Mode simulasi hanya untuk environment demo/development.');
}

// 14 Decisions
{
  const s = pptx.addSlide(); addBg(s); addTitle(s, 'Keputusan yang diperlukan dari forum', 'Hasil forum menentukan isi master dan urutan integrasi', 14);
  const decisions = [
    'OPD dan kecamatan yang masuk SABABUKA',
    'Fokus dan kategori strategis',
    'Indikator pilot dan OPD pemilik',
    'Bidang, PIC, dan operator',
    'Sumber data serta jadwal pembaruan',
    'Batas data untuk dashboard pimpinan',
    'Dataset Satu Data dan rujukan BPS',
    'URL grup koordinasi dan persetujuan simulasi',
  ];
  decisions.forEach((d, i) => { const x = 0.9 + (i % 2) * 6.05; const y = 1.45 + Math.floor(i / 2) * 0.95; s.addShape(pptx.ShapeType.ellipse, { x, y: y + 0.04, w: 0.32, h: 0.32, line: { color: i < 4 ? C.teal : C.orange, transparency: 100 }, fill: { color: i < 4 ? C.teal : C.orange } }); text(s, String(i + 1), x, y + 0.12, 0.32, 0.12, { fontSize: 8, bold: true, color: C.white, align: 'center' }); text(s, d, x + 0.52, y + 0.06, 5.1, 0.26, { fontSize: 13, color: C.ink }); });
  text(s, 'Keputusan forum menjadi dasar perubahan status draft menjadi master resmi.', 1.0, 6.0, 11.3, 0.35, { fontSize: 16, bold: true, color: C.blue, align: 'center' });
  s.addNotes('Daftar keputusan mengikuti kebutuhan konfirmasi organisasi, indikator, sumber, dan koordinasi.');
}

// 15 Close
{
  const s = pptx.addSlide(); addBg(s, C.navy);
  text(s, 'SABABUKA', 0.8, 1.0, 4.5, 0.4, { fontSize: 20, bold: true, color: '8EE2D9' });
  text(s, 'Fondasi sudah disiapkan.\nTahap berikutnya adalah\nmenetapkan master dan sumber resmi.', 0.8, 2.0, 8.9, 1.85, { fontSize: 30, bold: true, color: C.white, valign: 'top' });
  text(s, 'BAPPERIDA menetapkan arah dan kelayakan. OPD memastikan data. Sistem menjaga alur dan bukti.', 0.82, 4.75, 8.5, 0.55, { fontSize: 16, color: 'C9D8E7', valign: 'top' });
  text(s, 'Terima kasih', 9.25, 5.9, 3.0, 0.35, { fontSize: 16, bold: true, color: C.white, align: 'right' });
  text(s, 'Kabupaten Kapuas · 9 Oktober 2026', 8.15, 6.35, 4.1, 0.28, { fontSize: 11, color: 'C9D8E7', align: 'right' });
  s.addNotes('Penutup. Tekankan bahwa sistem siap menjadi wadah master data dan alur validasi sebelum integrasi resmi diperluas.');
}

pptx.writeFile({ fileName: OUT });
console.log(OUT);
