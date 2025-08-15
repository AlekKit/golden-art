import { getStore } from '@netlify/blobs';
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const ok=(d)=>({statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(d)});
const err=(c,m)=>({statusCode:c,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({message:m})});
const slugify=(s)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

export async function handler(event){
  if(event.httpMethod==='OPTIONS')return ok({ok:true});
  if(event.httpMethod!=='POST')return err(405,'Use POST');
  const body = JSON.parse(event.body||'{}');
  const { name, title, company, phone, email, website, address, logoDataUrl } = body;
  if(!name || !(phone||email)) return err(400,'Name and phone or email are required');

  const slug = slugify(name)+'-'+Math.random().toString(36).slice(2,6);
  const profiles = getStore({ name:'profiles' });
  const logos = getStore({ name:'logos' });

  let logo=false;
  if(logoDataUrl && logoDataUrl.startsWith('data:image/')){
    const b64 = logoDataUrl.split(',')[1];
    await logos.set(slug+'.jpg', Buffer.from(b64,'base64'), { contentType:'image/jpeg' });
    logo=true;
  }

  const profile = { slug, name, title, company, phone, email, website, address, logo };
  await profiles.setJSON(slug+'.json', profile);

  return ok({ slug, card_url:'/card/'+slug, vcf_url:'/.netlify/functions/vcf?slug='+slug });
}
