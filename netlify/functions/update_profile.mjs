import { getStore } from '@netlify/blobs';
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const ok=(d)=>({statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(d)});
const err=(c,m)=>({statusCode:c,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({message:m})});
export async function handler(event){
  if(event.httpMethod==='OPTIONS')return ok({ok:true});
  if(event.httpMethod!=='PUT' && event.httpMethod!=='POST')return err(405,'Use PUT or POST');
  const slug = event.queryStringParameters.slug;
  if(!slug) return err(400,'Missing slug');
  const profiles = getStore({ name:'profiles' });
  const logos = getStore({ name:'logos' });
  const body = JSON.parse(event.body||'{}');
  const existing = await profiles.getJSON(slug+'.json');
  if(!existing) return err(404,'Profile not found');

  if(body.logoDataUrl && body.logoDataUrl.startsWith('data:image/')){
    const b64 = body.logoDataUrl.split(',')[1];
    await logos.set(slug+'.jpg', Buffer.from(b64,'base64'), { contentType:'image/jpeg' });
    existing.logo = true;
  }
  for (const k of ['name','title','company','phone','email','website','address']){
    if (body[k] !== undefined) existing[k] = body[k];
  }
  await profiles.setJSON(slug+'.json', existing);
  return ok(existing);
}
