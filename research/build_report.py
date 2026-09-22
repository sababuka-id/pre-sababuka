import json, os, re
from datetime import datetime, timezone
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=r'C:\Users\user\OneDrive\Documents\ChatGPT\SABABUKA Bersinar'
DATA=os.path.join(ROOT,'research','output','ckan-audit.json')
OUT=os.path.join(ROOT,'output','Laporan Investigasi Kesiapan Data OPD Kabupaten Kapuas.docx')
os.makedirs(os.path.dirname(OUT),exist_ok=True)
audit=json.load(open(DATA,encoding='utf-8'))
orgs=audit['organizations']

def shade(cell,color):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),color); tcPr.append(shd)
def set_cell_text(cell,text,bold=False,color=None,size=8):
    cell.text=''; p=cell.paragraphs[0]; r=p.add_run(str(text)); r.bold=bold; r.font.size=Pt(size); r.font.name='Aptos';
    if color:r.font.color.rgb=RGBColor.from_string(color)
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
def add_table(doc,headers,rows,widths=None,font=8):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.style='Table Grid'
    trPr=t.rows[0]._tr.get_or_add_trPr(); tbl_header=OxmlElement('w:tblHeader'); tbl_header.set(qn('w:val'),'true'); trPr.append(tbl_header)
    for i,h in enumerate(headers):set_cell_text(t.rows[0].cells[i],h,True,'FFFFFF',font);shade(t.rows[0].cells[i],'173B61')
    for ri,row in enumerate(rows):
        cells=t.add_row().cells
        for i,v in enumerate(row):set_cell_text(cells[i],v,False,None,font)
        if ri%2: [shade(c,'F2F5F7') for c in cells]
    if widths:
        for row in t.rows:
            for i,w in enumerate(widths):row.cells[i].width=Inches(w)
    return t
def heading(doc,text,level=1):
    p=doc.add_paragraph(style=f'Heading {level}');p.add_run(text);return p
def para(doc,text,bold_start=None):
    p=doc.add_paragraph();p.paragraph_format.space_after=Pt(6);p.paragraph_format.line_spacing=1.08
    if bold_start and text.startswith(bold_start):
        p.add_run(bold_start).bold=True;p.add_run(text[len(bold_start):])
    else:p.add_run(text)
    return p
def bullet(doc,text):
    p=doc.add_paragraph(style='List Bullet');p.paragraph_format.space_after=Pt(3);p.add_run(text);return p
def top_formats(o,n=4):
    return ', '.join(f'{k} ({v})' for k,v in sorted(o['formats'].items(),key=lambda x:x[1],reverse=True)[:n]) or 'Tidak ada'
def score(o):
    cov=0 if o['datasetCount']==0 else 1 if o['datasetCount']<5 else 2
    ratio=o.get('structuredRatio',0);machine=0 if ratio<.15 else 1 if ratio<.6 else 2
    md=o.get('descriptionRatio',0);meta=0 if md<.4 else 1 if md<.8 else 2
    geo=0 if o['geoResources']==0 else 1 if o['geoResources']<10 else 2
    recent=0
    if o.get('latest'):
        try:
            age=(datetime(2026,9,13,tzinfo=timezone.utc)-datetime.fromisoformat(o['latest'].replace('Z','+00:00'))).days
            recent=2 if age<=180 else 1 if age<=730 else 0
        except:pass
    total=cov+machine+meta+geo+recent
    level='Siap untuk pilot' if total>=8 else 'Siap dengan perbaikan' if total>=5 else 'Perlu penguatan dasar'
    return total,level
def recommendation(o):
    if o['datasetCount']==0:return 'Tetapkan produsen data, pilih lima dataset prioritas, lalu terbitkan metadata dan CSV/XLSX terstruktur.'
    if o['id'].startswith('data-pejabat'):return 'Pisahkan arsip dokumen dari dataset analitis. Buat indeks dokumen, klasifikasi akses, dan metadata yang konsisten.'
    if o['id'].startswith('data-pemerintah'):return 'Gunakan sebagai katalog lintas sumber, tetapi cegah duplikasi dengan dataset OPD melalui ID indikator, kode wilayah, periode, dan versi.'
    if o['geoResources']>0:return 'Konsolidasikan berkas shapefile menjadi paket lengkap dan layanan GeoJSON/WFS. Tambahkan kode wilayah, sistem koordinat, tanggal, dan pemilik layer.'
    if o.get('structuredRatio',0)<.6:return 'Ubah dokumen utama menjadi CSV/XLSX atau JSON. Pertahankan PDF sebagai bukti publikasi, bukan sumber mesin utama.'
    if o['datasetCount']<5:return 'Perluas cakupan indikator prioritas dan tetapkan jadwal pembaruan, penanggung jawab, serta endpoint pertukaran data.'
    return 'Lanjutkan uji konektor CKAN, pemetaan indikator, validasi sampel, dan SLA pembaruan.'

doc=Document();sec=doc.sections[0];sec.top_margin=Inches(.7);sec.bottom_margin=Inches(.65);sec.left_margin=Inches(.7);sec.right_margin=Inches(.7)
styles=doc.styles
styles['Normal'].font.name='Aptos';styles['Normal'].font.size=Pt(9);styles['Normal']._element.rPr.rFonts.set(qn('w:ascii'),'Aptos');styles['Normal']._element.rPr.rFonts.set(qn('w:hAnsi'),'Aptos')
for n,size,color in [('Title',24,'111111'),('Heading 1',16,'173B61'),('Heading 2',12,'173B61'),('Heading 3',10,'2F5F83')]:
    s=styles[n];s.font.name='Aptos';s.font.size=Pt(size);s.font.color.rgb=RGBColor.from_string(color);s.font.bold=True

p=doc.add_paragraph(style='Title');p.add_run('Investigasi Kesiapan Data OPD Kabupaten Kapuas')
p=doc.add_paragraph();p.add_run('Bahan kerja FGD integrasi SABABUKA BERSINAR').bold=True
para(doc,'Laporan ini menilai kesiapan data organisasi yang terdaftar pada CKAN Satu Data Kabupaten Kapuas. Penilaian mencakup ketersediaan dataset, format yang dapat diproses mesin, kelengkapan deskripsi, unsur geospasial, kebaruan metadata, jalur integrasi, dan tindak lanjut yang perlu disepakati dalam FGD.')
para(doc,'Kesimpulan utama: fondasi CKAN sudah tersedia, tetapi kesiapan antarorganisasi tidak merata. Integrasi dapat dimulai dari katalog dan beberapa dataset terstruktur. Sistem belum dapat memperlakukan seluruh konten portal sebagai data analitis karena sebagian besar koleksi PPID berupa dokumen, empat organisasi belum memiliki dataset, dan layanan API aplikasi OPD belum terdokumentasi secara publik.')

heading(doc,'Ringkasan eksekutif',1)
total=sum(o['datasetCount'] for o in orgs);zero=sum(o['datasetCount']==0 for o in orgs);pilot=sum(score(o)[1]=='Siap untuk pilot' for o in orgs);geo=sum(o['geoResources'] for o in orgs)
add_table(doc,['Ukuran','Hasil audit'],[['Organisasi CKAN',len(orgs)],['Dataset terpetakan ke organisasi',f'{total:,}'.replace(',','.')],['Jumlah portal yang dilaporkan CKAN','3.927'],['Dataset yang perlu rekonsiliasi','21'],['Organisasi tanpa dataset',zero],['Organisasi siap untuk pilot menurut penilaian awal',pilot],['Resource geospasial teridentifikasi',geo]],[2.8,3.7],9)
para(doc,'Portal telah menyediakan API CKAN publik untuk katalog dan metadata. Integrasi langsung sebaiknya dimulai dari API CKAN, bukan scraping halaman website OPD. Website OPD yang diuji sebelumnya dapat diakses manusia, tetapi endpoint WordPress API dan RSS mengembalikan HTTP 403. Temuan tersebut menunjukkan perlunya endpoint resmi, whitelist server, atau pertukaran berkas terjadwal.')
bullet(doc,'Prioritas pertama adalah rekonsiliasi katalog besar Data Pemerintah Kabupaten Kapuas 2025 agar dataset tidak menggandakan dataset milik OPD.')
bullet(doc,'Prioritas kedua adalah DPUPR karena memiliki resource geospasial, tetapi paket shapefile dan metadata layer perlu distandarkan sebelum digunakan pada peta.')
bullet(doc,'Prioritas ketiga adalah Dinas Kesehatan, Pendidikan, Ketahanan Pangan, dan beberapa OPD lain yang sudah memiliki resource terstruktur untuk uji konektor.')
bullet(doc,'BAPPERIDA perlu bertindak sebagai koordinator definisi indikator dan kelayakan penggunaan. OPD tetap bertanggung jawab terhadap substansi data sektoral.')

heading(doc,'Metode penilaian',1)
para(doc,'Audit menggunakan endpoint publik CKAN organization_list dan package_search pada 13 September 2026. Seluruh hasil package_search dibaca dengan pagination. Penilaian tidak menguji basis data internal, kredensial aplikasi, kualitas nilai di dalam setiap berkas, atau kebenaran substansi indikator.')
add_table(doc,['Dimensi','Rentang','Makna'],[
['Cakupan dataset','0 sampai 2','Jumlah dataset yang tersedia pada organisasi'],['Format terstruktur','0 sampai 2','Proporsi resource CSV, XLS/XLSX, JSON, GeoJSON, KML, SHP, WMS, atau WFS'],['Kelengkapan deskripsi','0 sampai 2','Proporsi dataset yang memiliki deskripsi'],['Kesiapan geospasial','0 sampai 2','Ketersediaan resource spasial dan berkas pendamping'],['Kebaruan metadata','0 sampai 2','Jarak waktu pembaruan terakhir terhadap tanggal audit']],[1.55,.8,4.15],8)
para(doc,'Skor 8 sampai 10 menunjukkan kandidat pilot. Skor 5 sampai 7 menunjukkan kesiapan dengan perbaikan. Skor di bawah 5 menunjukkan kebutuhan penguatan dasar. Skor ini merupakan alat prioritisasi FGD, bukan penilaian kinerja resmi OPD.')

heading(doc,'Temuan lintas organisasi',1)
heading(doc,'Volume katalog dan risiko duplikasi',2)
para(doc,f'Dua organisasi katalog umum menampung {orgs[0]["datasetCount"]+orgs[1]["datasetCount"]:,} dataset. Koleksi Data Pemerintah Kabupaten Kapuas 2025 memiliki banyak resource terstruktur, sedangkan koleksi PPID didominasi dokumen. SABABUKA harus menggunakan identitas kanonik agar satu angka tidak muncul sebagai beberapa indikator hanya karena dipublikasikan ulang oleh organisasi berbeda.')
heading(doc,'Format dan API',2)
para(doc,'CKAN API dapat menjadi pintu masuk metadata, daftar resource, organisasi, tag, lisensi, serta waktu pembaruan. CSV, XLSX, dan JSON dapat diproses setelah skema kolom dipetakan. PDF perlu ekstraksi dan pemeriksaan manual. WordPress sebaiknya digunakan untuk berita atau konteks program, bukan sebagai sumber nilai indikator, kecuali OPD menyediakan endpoint yang terstruktur dan disepakati.')
heading(doc,'Data geospasial',2)
para(doc,'DPUPR memiliki resource spasial paling menonjol. Berkas SHP, SHX, DBF, dan PRJ harus diperlakukan sebagai satu paket. Tahap produksi sebaiknya mengubah paket tersebut menjadi GeoJSON atau layanan WFS/Feature Service dan menambahkan kode wilayah baku. Sistem perlu mencatat sistem koordinat, tanggal representasi, skala, pemilik layer, dan batas penggunaan.')
heading(doc,'Data sensitif dan akses',2)
para(doc,'Disdukcapil, kesehatan, sosial, kepegawaian, pendapatan, dan penanggulangan bencana dapat menyimpan data yang tidak layak dipublikasikan secara rinci. Dashboard publik hanya menerima agregat. Dashboard OPD menerima data sesuai tugas. BAPPERIDA menerima data yang dibutuhkan untuk perencanaan. Bupati menerima ringkasan strategis, perbandingan sumber, serta rekomendasi internal dengan jejak audit.')

heading(doc,'Matriks kesiapan organisasi',1)
rows=[]
for o in orgs:
    sc,lv=score(o);rows.append([o['title'],o['datasetCount'],top_formats(o,2),o['geoResources'],f'{sc}/10',lv])
add_table(doc,['Organisasi','Dataset','Format dominan','Geo','Skor','Kesiapan'],rows,[2.25,.55,1.4,.4,.5,1.15],7)

heading(doc,'Temuan dan tindak lanjut setiap organisasi',1)
for idx,o in enumerate(orgs,1):
    sc,lv=score(o);heading(doc,f'{idx} {o["title"]}',2)
    add_table(doc,['Dataset','Resource','Terstruktur','Geospasial','Skor'],[[o['datasetCount'],o['totalResources'],o['structuredResources'],o['geoResources'],f'{sc}/10']],[1,1,1.2,1.1,1],8)
    para(doc,f'Format dominan: {top_formats(o)}. Pembaruan metadata terakhir: {(o.get("latest") or "tidak tersedia")[:10]}. Kesiapan awal: {lv}.')
    para(doc,'Temuan: '+('Belum ada dataset yang dapat diperiksa.' if o['datasetCount']==0 else f'{round(o.get("structuredRatio",0)*100)} persen resource termasuk format yang berpotensi diproses mesin dan {round(o.get("descriptionRatio",0)*100)} persen dataset memiliki deskripsi.'))
    para(doc,'Tindak lanjut FGD: '+recommendation(o))
    if o.get('sampleDatasets'):
        para(doc,'Contoh dataset: '+'; '.join(x['title'] for x in o['sampleDatasets'][:3])+'.')

heading(doc,'Arsitektur pertukaran data yang disarankan',1)
add_table(doc,['Sumber','Fungsi','Cara integrasi','Kendali'],[
['CKAN Satu Data Kapuas','Katalog, metadata, resource publik','CKAN API package_search dan package_show','ID dataset, organisasi, lisensi, versi, waktu pembaruan'],['Aplikasi OPD','Data administrasi dan operasional','API terotorisasi, database view, atau ekspor terjadwal','Hak akses, agregasi, log, dan persetujuan OPD'],['Website WordPress OPD','Berita dan konteks kegiatan','RSS atau REST API jika diaktifkan','Tidak menjadi sumber utama angka indikator'],['BPS dan hasil Susenas','Statistik resmi serta indikator rumah tangga','WebAPI BPS atau tabel resmi terpetakan','Kode wilayah, konsep, metode, level estimasi, dan periode'],['BAPPENAS','Target serta konteks perencanaan nasional','Service Bus, katalog metadata, atau pertukaran resmi','Versi target dan dokumen perencanaan'],['Layanan geospasial','Batas wilayah, fasilitas, jaringan, dan sebaran','GeoJSON, WFS, WMS, Feature Service','CRS, kode wilayah, skala, tanggal, dan klasifikasi akses']],[1.2,1.45,1.7,2.15],7.5)

heading(doc,'Aturan pencegahan data tumpang tindih',1)
para(doc,'Setiap observasi harus memiliki kunci yang memuat ID indikator, kode wilayah, periode, sumber, metode, dan versi. Data dari sumber berbeda tidak boleh ditimpa atau dirata-ratakan secara otomatis. Sistem menyimpan semuanya sebagai versi sumber, lalu menandai satu versi sebagai rujukan untuk konteks penggunaan tertentu.')
bullet(doc,'BPS menjadi rujukan statistik dasar dan hasil survei resmi pada level estimasi yang tersedia.')
bullet(doc,'OPD menjadi rujukan data administrasi, program, fasilitas, layanan, serta data sektoral yang menjadi kewenangannya.')
bullet(doc,'BAPPENAS dan dokumen daerah menjadi rujukan target, klasifikasi program, dan konteks kebijakan.')
bullet(doc,'BAPPERIDA menetapkan pemetaan indikator dan kelayakan penggunaan setelah OPD mengonfirmasi substansi.')
bullet(doc,'Perbedaan angka ditampilkan bersama penjelasan definisi, periode, cakupan, dan status validasi.')

heading(doc,'Alur komunikasi menuju integrasi',1)
add_table(doc,['Tahap','Pelaksana','Kegiatan','Keluaran'],[
['1 Penetapan PIC','BAPPERIDA dan kepala OPD','Menetapkan PIC substansi dan PIC teknis setiap OPD','Daftar kontak dan kewenangan'],['2 Klinik inventarisasi','PIC OPD, wali data, tim SABABUKA','Memeriksa dataset, sistem sumber, format, kode wilayah, akses, dan sensitivitas','Lembar inventarisasi per OPD'],['3 Pemetaan indikator','BAPPERIDA dan OPD','Menyepakati definisi, satuan, periode, target, sumber utama, dan sumber pembanding','Kamus indikator dan matriks sumber'],['4 Uji konektor','Tim teknis dan pengelola aplikasi','Menguji CKAN API, file terjadwal, API OPD, serta layanan geospasial','Hasil uji dan daftar kesalahan'],['5 Validasi sampel','OPD dan BAPPERIDA','Membandingkan nilai sumber dengan tampilan SABABUKA','Berita acara validasi'],['6 Operasional','Wali data dan pengelola sistem','Menetapkan jadwal, SLA, notifikasi, koreksi, dan audit akses','SOP integrasi dan pemeliharaan']],[.75,1.2,2.55,1.7],7.5)

heading(doc,'Agenda keputusan dalam FGD',1)
for x in ['Daftar indikator prioritas untuk pilot dan OPD pemiliknya','Sumber utama serta sumber pembanding untuk setiap indikator','Kode wilayah yang digunakan dan tingkat penyajian terendah','Format pertukaran, endpoint, frekuensi pembaruan, dan batas waktu koreksi','Data yang boleh dipublikasikan serta data yang hanya tersedia bagi pejabat berwenang','PIC substansi, PIC teknis, validator OPD, dan verifikator penggunaan di BAPPERIDA','Dua sampai empat OPD kandidat pilot berdasarkan kesiapan dan nilai kebijakan']:bullet(doc,x)

heading(doc,'Rekomendasi tahap awal',1)
para(doc,'Pilot sebaiknya memakai sumber yang sudah terstruktur dan mewakili kebutuhan lintas sektor. Dinas Kesehatan, Dinas Pendidikan, Dinas Ketahanan Pangan dan Perikanan, serta DPUPR layak masuk pembahasan awal. DPUPR penting untuk menguji geospasial, sedangkan Dinas Kesehatan dan Pendidikan membantu menguji indikator pelayanan dasar. Pemilihan akhir tetap memerlukan konfirmasi kualitas isi dan kesiapan PIC.')
para(doc,'BAPPERIDA perlu meminta pengelola Satu Data melakukan rekonsiliasi 21 dataset yang tidak terpetakan ke 25 organisasi pada hasil audit. Katalog umum juga perlu diperiksa terhadap dataset OPD agar publikasi ulang tidak menghasilkan duplikasi analisis.')

heading(doc,'Sumber',1)
sources=[
('Satu Data Kabupaten Kapuas','Kumpulan data dan CKAN API','https://satudata.kapuaskab.go.id/dataset/'),
('Satu Data Kabupaten Kapuas','CKAN organization_list','https://satudata.kapuaskab.go.id/api/3/action/organization_list?all_fields=true&include_dataset_count=true'),
('Satu Data Kabupaten Kapuas','CKAN package_search','https://satudata.kapuaskab.go.id/api/3/action/package_search'),
('Pemerintah Kabupaten Kapuas','Daftar website organisasi perangkat daerah','https://kapuaskab.go.id/web/page/opd'),
('Badan Pusat Statistik','WebAPI BPS','https://webapi.bps.go.id/developer'),
('Kementerian PPN Bappenas','Service katalog metadata geospasial','https://api.bappenas.go.id/katalog/details/53e4c3ce-5079-4d3c-87d3-b55b1131296c'),
('JDIH Bappenas','Standar data dan metadata statistik serta geospasial','https://jdih.bappenas.go.id/data/peraturan/2024sesesmenppn001.pdf')]
for i,(pub,title,url) in enumerate(sources,1):para(doc,f'{i}. {pub}. {title}. {url}')

for section in doc.sections:
    footer=section.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run('Investigasi Kesiapan Data OPD Kabupaten Kapuas  |  Bahan FGD').font.size=Pt(8)
doc.save(OUT)
print(OUT)
