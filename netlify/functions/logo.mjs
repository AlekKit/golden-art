import { getStore } from '@netlify/blobs';
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
export async function handler(event){
  if(event.httpMethod==='OPTIONS')return{statusCode:200,headers:CORS};
  const slug = event.queryStringParameters.slug;
  if(!slug) return { statusCode:400, headers:CORS, body:'Missing slug' };
  const logos = getStore({ name:'logos' });
  const arr = await logos.get(slug+'.jpg', { type:'arrayBuffer' });
  if(!arr) return { statusCode:404, headers:CORS, body:'Not found' };
  return {
    statusCode:200,
    headers:{ ...CORS, 'Content-Type':'image/jpeg', 'Cache-Control':'public, max-age=31536000' },
    body: Buffer.from(arr).toString('base64'),
    isBase64Encoded: true
  };
}
