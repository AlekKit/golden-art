import { getStore } from '@netlify/blobs';
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const ok=(d)=>({statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(d)});
const nf=()=>({statusCode:404,headers:CORS,body:'Not found'});
export async function handler(event){
  if(event.httpMethod==='OPTIONS')return ok({ok:true});
  const slug = event.queryStringParameters.slug;
  if(!slug)return nf();
  const profiles = getStore({ name:'profiles' });
  const data = await profiles.getJSON(slug+'.json');
  if(!data) return nf();
  return ok(data);
}
