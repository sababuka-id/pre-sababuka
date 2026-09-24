export const years=[2022,2023,2024,2025,2026];
export const indicators=[
{id:'growth',name:'Pertumbuhan Ekonomi',value:5.18,unit:'%',target:5.4,prev:4.86,status:'attention',opd:'Bapperida',period:'Triwulan II 2026',updated:'26 Agu 2026',higher:true,trend:[5.10,4.62,4.94,4.86,5.18]},
{id:'poverty',name:'Tingkat Kemiskinan',value:4.88,unit:'%',target:4.6,prev:5.12,status:'attention',opd:'Bapperida',period:'Maret 2026',updated:'25 Agu 2026',higher:false,trend:[5.74,5.46,5.55,5.12,4.88]},
{id:'unemployment',name:'Pengangguran Terbuka',value:4.12,unit:'%',target:4.0,prev:4.31,status:'attention',opd:'Dinas Tenaga Kerja',period:'Februari 2026',updated:'24 Agu 2026',higher:false,trend:[4.96,4.58,4.72,4.31,4.12]},
{id:'stunting',name:'Prevalensi Stunting',value:19.8,unit:'%',target:18.0,prev:22.1,status:'critical',opd:'Dinas Kesehatan',period:'Semester I 2026',updated:'27 Agu 2026',higher:false,trend:[28.6,25.9,26.4,22.1,19.8]},
{id:'hdi',name:'Indeks Pembangunan Manusia',value:72.46,unit:'poin',target:72.2,prev:71.88,status:'good',opd:'Bapperida',period:'2026',updated:'20 Agu 2026',higher:true,trend:[69.84,70.61,70.48,71.88,72.46]},
{id:'life',name:'Angka Harapan Hidup',value:70.82,unit:'tahun',target:70.7,prev:70.45,status:'good',opd:'Dinas Kesehatan',period:'2026',updated:'20 Agu 2026',higher:true,trend:[69.88,70.07,69.98,70.45,70.82]},
{id:'roads',name:'Jalan Kondisi Mantap',value:68.4,unit:'%',target:72.0,prev:65.7,status:'critical',opd:'DPUPRPKP',period:'Semester I 2026',updated:'22 Agu 2026',higher:true,trend:[58.4,61.2,60.6,65.7,68.4]},
{id:'water',name:'Air Minum Layak',value:84.6,unit:'%',target:85.0,prev:82.9,status:'good',opd:'DPUPRPKP',period:'Semester I 2026',updated:'23 Agu 2026',higher:true,trend:[77.8,80.3,79.7,82.9,84.6]},
{id:'rice',name:'Produksi Padi',value:315.6,unit:'ribu ton',target:330,prev:301.4,status:'critical',opd:'Dinas Pertanian',period:'Jan–Jul 2026',updated:'26 Agu 2026',higher:true,trend:[276.2,289.8,283.5,301.4,315.6]},
{id:'income',name:'Realisasi Pendapatan',value:61.8,unit:'%',target:60,prev:55.2,status:'good',opd:'Bapenda',period:'Agustus 2026',updated:'28 Agu 2026',higher:true,trend:[57.3,54.9,59.1,55.2,61.8]},
{id:'budget',name:'Penyerapan Anggaran',value:58.7,unit:'%',target:60,prev:52.9,status:'attention',opd:'BPKAD',period:'Agustus 2026',updated:'28 Agu 2026',higher:true,trend:[54.2,57.6,55.4,52.9,58.7]},
{id:'satisfaction',name:'Indeks Kepuasan Masyarakat',value:88.4,unit:'poin',target:87,prev:86.9,status:'good',opd:'Diskominfosantik',period:'Semester I 2026',updated:'21 Agu 2026',higher:true,trend:[82.1,84.6,83.8,86.9,88.4]}
];
export const districts=['Basarang','Bataguh','Dadahup','Kapuas Barat','Kapuas Hilir','Kapuas Hulu','Kapuas Kuala','Kapuas Murung','Kapuas Tengah','Kapuas Timur','Mandau Talawang','Mantangai','Pasak Talawang','Pulau Petak','Selat','Tamban Catur','Timpah'].map((name,i)=>({name,score:[82,78,68,74,80,64,71,66,73,84,61,69,63,77,88,75,70][i],poverty:[3.8,4.5,5.9,4.9,3.7,6.2,5.5,6.0,5.0,3.5,6.8,5.7,6.4,4.6,2.9,4.8,5.2][i],stunting:[15,17,24,20,16,26,23,25,21,14,28,22,27,19,12,18,20][i],roads:[77,72,58,68,75,55,62,57,66,79,49,60,52,70,86,69,65][i]}));
export const opds=[
['Bapperida',18,91,90,'Hari ini'],['Dinas Kesehatan',24,82,85,'Hari ini'],['Dinas Pendidikan',22,88,86,'Kemarin'],['DPUPRPKP',19,76,82,'2 hari lalu'],['Dinas Ketahanan Pangan dan Perikanan',13,84,82,'Kemarin'],['Dinas Pertanian',16,73,80,'2 hari lalu'],['BPKAD',17,86,85,'Hari ini'],['Bapenda',14,89,88,'Hari ini'],['BPBD',11,81,82,'3 hari lalu'],['DPMD',15,78,83,'2 hari lalu'],['Diskominfosantik',12,92,90,'Hari ini']
].map(([name,count,score,target,updated],i)=>({id:i+1,name,count,score,target,updated,status:score>=target?'Tercapai':score/target>=.95?'Dalam Jalur':'Perlu Tindak Lanjut'}));
export const alerts=[
{id:1,urgency:'Kritis',title:'Prevalensi stunting masih di atas target',opd:'Dinas Kesehatan',time:'18 menit lalu',type:'Indikator',status:'Baru'},
{id:2,urgency:'Kritis',title:'Kemantapan jalan belum mencapai target semester',opd:'DPUPRPKP',time:'42 menit lalu',type:'Indikator',status:'Baru'},
{id:3,urgency:'Kritis',title:'Produksi padi perlu percepatan realisasi program',opd:'Dinas Pertanian',time:'1 jam lalu',type:'Indikator',status:'Ditinjau'},
{id:4,urgency:'Tinggi',title:'Pembaruan dataset pelayanan desa terlambat',opd:'DPMD',time:'2 jam lalu',type:'Pembaruan',status:'Baru'},
{id:5,urgency:'Sedang',title:'Perubahan nilai kemiskinan perlu verifikasi',opd:'Bapperida',time:'3 jam lalu',type:'Validasi',status:'Ditinjau'},
{id:6,urgency:'Sedang',title:'Sinkronisasi sumber pendidikan perlu diulang',opd:'Dinas Pendidikan',time:'5 jam lalu',type:'Sinkronisasi',status:'Selesai'}
];
export const sources=[
['BPS Kabupaten Kapuas','BPS','WebAPI + publikasi resmi','Sesuai jadwal rilis','27 Feb 2026',3,'Terhubung'],['CKAN Satu Data','Diskominfosantik','CKAN','Harian','28 Agu, 06.40',48,'Terhubung'],['API Kesehatan','Dinas Kesehatan','API OPD','Harian','28 Agu, 06.10',19,'Terhubung'],['Rekap Pendidikan','Dinas Pendidikan','XLSX','Mingguan','27 Agu, 16.20',14,'Terhubung'],['Rekap Infrastruktur','DPUPRPKP','CSV','Mingguan','26 Agu, 15.00',12,'Perhatian'],['Portal Pertanian','Dinas Pertanian','Website OPD','Mingguan','25 Agu, 09.10',9,'Terhubung'],['Verifikasi Kecamatan','Bapperida','Input terverifikasi','Bulanan','24 Agu, 13.35',17,'Terhubung']
].map((x,i)=>({id:i+1,name:x[0],owner:x[1],type:x[2],schedule:x[3],last:x[4],datasets:x[5],status:x[6]}));
export const validations=[
['Prevalensi Stunting','Dinas Kesehatan','22,1%','19,8%','-10,4%','API Kesehatan','28 Agu 2026','Menunggu'],['Jalan Kondisi Mantap','DPUPRPKP','65,7%','68,4%','+4,1%','Rekap Infrastruktur','27 Agu 2026','Menunggu'],['Tingkat Kemiskinan','Bapperida','5,12%','4,88%','-4,7%','BPS Kabupaten Kapuas · Susenas','27 Agu 2026','Diperiksa'],['Produksi Padi','Dinas Pertanian','301,4 rb ton','315,6 rb ton','+4,7%','Portal Pertanian','26 Agu 2026','Menunggu']
].map((x,i)=>({id:i+1,indicator:x[0],opd:x[1],prev:x[2],latest:x[3],change:x[4],source:x[5],date:x[6],status:x[7]}));
export const services=[
{name:'Administrasi Kependudukan',volume:18420,done:17220,satisfaction:91,time:1.8},{name:'Kesehatan',volume:12640,done:11980,satisfaction:88,time:2.4},{name:'Pendidikan',volume:7820,done:7460,satisfaction:87,time:2.1},{name:'Perizinan',volume:5240,done:4870,satisfaction:89,time:2.8},{name:'Infrastruktur',volume:3910,done:3410,satisfaction:82,time:4.2},{name:'Pemerintahan Desa',volume:6180,done:5750,satisfaction:86,time:3.1}
];
export const finance={income:1.42,budget:2.31,spend:1.356,absorption:58.7,targetIncome:1.36,monthly:[42,45,48,51,55,58.7],composition:[['Belanja Operasi',48],['Belanja Modal',31],['Transfer',17],['Tidak Terduga',4]]};
