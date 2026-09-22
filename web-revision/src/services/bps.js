const BPS_API_BASE='https://webapi.bps.go.id/v1/api/list/';
export const BPS_KAPUAS_DOMAIN='6203';

export async function getBpsPublications({apiKey,year=2026,signal}={}){
  if(!apiKey)throw new Error('BPS_API_KEY_REQUIRED');
  const params=new URLSearchParams({model:'publication',domain:BPS_KAPUAS_DOMAIN,lang:'ind',year:String(year),key:apiKey});
  const response=await fetch(`${BPS_API_BASE}?${params}`,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`BPS_API_HTTP_${response.status}`);
  const payload=await response.json();
  if(payload.status!=='OK'||!Array.isArray(payload.data))throw new Error('BPS_API_INVALID_RESPONSE');
  const metadata=payload.data[0]||{};
  const publications=Array.isArray(payload.data[1])?payload.data[1]:[];
  return {
    source:'BPS Kabupaten Kapuas',
    domain:BPS_KAPUAS_DOMAIN,
    fetchedAt:new Date().toISOString(),
    total:Number(metadata.total||publications.length),
    items:publications.map(item=>({id:item.pub_id,title:item.title,releaseDate:item.rl_date,updatedDate:item.updt_date||item.rl_date,pdf:item.pdf,size:item.size}))
  };
}

export function normalizeBpsProvenance(item){
  return {publisher:'Badan Pusat Statistik',domain:BPS_KAPUAS_DOMAIN,sourceId:item.id,title:item.title,period:item.releaseDate,retrievedAt:new Date().toISOString(),verificationStatus:'menunggu-bapperida'};
}
