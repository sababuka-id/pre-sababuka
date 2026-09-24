import {readFileSync} from 'node:fs';
const dataSource=readFileSync(new URL('../src/data/data.js',import.meta.url),'utf8');
const {years,indicators,strategicIssues,districts,opds,alerts,sources,validations,services,finance}=await import(`data:text/javascript;base64,${Buffer.from(dataSource).toString('base64')}`);

const errors=[];
const check=(condition,message)=>{if(!condition)errors.push(message)};
const unique=items=>new Set(items).size===items.length;
const normalize=value=>String(value??'').toUpperCase().replace(/[^A-Z]/g,'');
const numberFromLabel=value=>Number(String(value).replace(/[^0-9,.-]/g,'').replace(',','.'));

check(years.length===5&&unique(years),'Daftar tahun harus berisi lima periode unik.');
check(indicators.length===12&&unique(indicators.map(item=>item.id)),'Indikator harus berjumlah 12 dengan ID unik.');
for(const item of indicators){
  check(item.trend.length===years.length,`${item.name}: panjang tren tidak sama dengan daftar tahun.`);
  check(Number.isFinite(item.value)&&Number.isFinite(item.target)&&item.target>0,`${item.name}: nilai atau target tidak valid.`);
  check(['good','attention','critical'].includes(item.status),`${item.name}: status indikator tidak dikenal.`);
}

check(strategicIssues.length===8&&unique(strategicIssues.map(item=>item.id)),'Fokus strategis harus berjumlah 8 dengan ID unik.');
check(strategicIssues.filter(item=>item.group==='Prioritas Pimpinan').length===4,'Ringkasan pimpinan harus memuat tepat 4 fokus utama.');
for(const item of strategicIssues){
  check(Boolean(item.lead&&item.support&&item.decision),`${item.title}: pengampu, pendukung, atau keputusan belum lengkap.`);
}

const roads=indicators.find(item=>item.id==='roads');
const stunting=indicators.find(item=>item.id==='stunting');
check(numberFromLabel(strategicIssues.find(item=>item.id==='infrastructure')?.value)===roads?.value,'Nilai jalan pada fokus strategis tidak sinkron dengan indikator.');
check(numberFromLabel(strategicIssues.find(item=>item.id==='stunting')?.value)===stunting?.value,'Nilai stunting pada fokus strategis tidak sinkron dengan indikator.');

check(districts.length===17&&unique(districts.map(item=>normalize(item.name))),'Profil wilayah harus berisi 17 kecamatan unik.');
const geo=JSON.parse(readFileSync(new URL('../src/data/kapuas-kecamatan.geojson',import.meta.url),'utf8'));
const geoNames=geo.features.map(feature=>normalize(feature.properties?.Kecamatan));
check(geo.features.length===17&&unique(geoNames),'GeoJSON harus berisi 17 geometri kecamatan unik.');
for(const district of districts)check(geoNames.includes(normalize(district.name)),`Geometri Kecamatan ${district.name} tidak ditemukan.`);

check(unique(opds.map(item=>item.id)),'ID OPD tidak unik.');
for(const item of opds)check(item.target>0&&item.score>=0,`${item.name}: target atau realisasi tidak valid.`);
check(unique(alerts.map(item=>item.id)),'ID peringatan tidak unik.');
for(const item of alerts)check(['Baru','Ditinjau','Selesai'].includes(item.status),`${item.title}: status peringatan tidak dikenal.`);
check(unique(sources.map(item=>item.id)),'ID sumber data tidak unik.');
check(unique(validations.map(item=>item.id)),'ID antrean validasi tidak unik.');
for(const item of validations)check(['Menunggu','Diperiksa','Disetujui','Perbaikan','Ditolak'].includes(item.status),`${item.indicator}: status validasi tidak dikenal.`);
check(services.length===6&&services.every(item=>item.done<=item.volume),'Data pelayanan publik tidak konsisten.');
check(finance.spend<=finance.budget&&finance.income>=0,'Data ringkas keuangan tidak konsisten.');

if(errors.length){
  console.error(`Validasi data gagal (${errors.length} temuan):`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validasi data lulus: ${strategicIssues.length} fokus, ${indicators.length} indikator, ${districts.length} kecamatan, ${opds.length} OPD, ${sources.length} sumber.`);
