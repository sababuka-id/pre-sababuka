import fs from 'node:fs/promises';
import https from 'node:https';

const base='https://satudata.kapuaskab.go.id/api/3/action';
const get=url=>new Promise((resolve,reject)=>https.get(url,{headers:{'User-Agent':'SABABUKA-readiness-audit/1.0'}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`${res.statusCode} ${url}`));try{resolve(JSON.parse(b))}catch(e){reject(e)}})}).on('error',reject));
const orgs=(await get(`${base}/organization_list?all_fields=true&include_dataset_count=true`)).result;
const rows=[];
for(const org of orgs){
  const datasets=[]; let start=0,total=0;
  do{const q=await get(`${base}/package_search?rows=100&start=${start}&fq=organization:${encodeURIComponent(org.name)}`);total=q.result.count;datasets.push(...q.result.results);start+=q.result.results.length;}while(start<total&&start<5000);
  const formats={},years={},licenses={},resourceUrls=[];
  let withResources=0,withDescription=0,withTags=0,withGeo=0,structured=0,latest=null,oldest=null;
  for(const d of datasets){
    if((d.notes||'').trim())withDescription++;
    if((d.tags||[]).length)withTags++;
    licenses[d.license_title||d.license_id||'Tidak disebutkan']=(licenses[d.license_title||d.license_id||'Tidak disebutkan']||0)+1;
    const modified=d.metadata_modified||d.metadata_created;
    if(modified){if(!latest||modified>latest)latest=modified;if(!oldest||modified<oldest)oldest=modified;}
    const ym=(d.title||'').match(/\b(20\d{2})\b/g)||[]; for(const y of ym)years[y]=(years[y]||0)+1;
    if((d.resources||[]).length)withResources++;
    for(const r of d.resources||[]){
      const f=(r.format||'Tidak disebutkan').trim().toUpperCase();formats[f]=(formats[f]||0)+1;
      if(['CSV','JSON','XLS','XLSX','GEOJSON','KML','SHP','WMS','WFS'].includes(f))structured++;
      if(['GEOJSON','KML','SHP','WMS','WFS','SBN','SBX','SHX','DBF','PRJ'].includes(f))withGeo++;
      if(r.url)resourceUrls.push(r.url);
    }
  }
  const totalResources=Object.values(formats).reduce((a,b)=>a+b,0);
  const structuredRatio=totalResources?structured/totalResources:0,descriptionRatio=datasets.length?withDescription/datasets.length:0;
  const readiness=datasets.length===0?'Belum ada dataset':structuredRatio>=.6&&descriptionRatio>=.6?'Siap ditindaklanjuti':structuredRatio>=.15?'Perlu standardisasi':'Perlu peningkatan mendasar';
  rows.push({id:org.name,title:org.title,description:org.description||'',datasetCount:datasets.length,totalResources,withResources,withDescription,withTags,structuredResources:structured,structuredRatio,descriptionRatio,geoResources:withGeo,latest,oldest,formats,years,licenses,readiness,site:org.image_display_url||'',sampleDatasets:datasets.slice(0,5).map(d=>({title:d.title,name:d.name,modified:d.metadata_modified,formats:(d.resources||[]).map(r=>r.format)}))});
}
rows.sort((a,b)=>b.datasetCount-a.datasetCount);
await fs.mkdir('research/output',{recursive:true});
await fs.writeFile('research/output/ckan-audit.json',JSON.stringify({auditedAt:new Date().toISOString(),site:'Satu Data Kabupaten Kapuas',organizationCount:rows.length,organizations:rows},null,2));
console.log(JSON.stringify({organizations:rows.length,datasets:rows.reduce((s,x)=>s+x.datasetCount,0),top:rows.map(x=>({title:x.title,datasets:x.datasetCount,structured:x.structuredResources,geo:x.geoResources,readiness:x.readiness}))},null,2));
