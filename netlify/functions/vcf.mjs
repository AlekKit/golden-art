import { getStore } from '@netlify/blobs';
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const crlf = (s) => s.replace(/\r?\n/g, '\r\n');
function wrap76(b64){ return b64.replace(/(.{76})/g,'$1\r\n '); }
export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers: CORS };
  const slug = event.queryStringParameters.slug;
  if (!slug) return { statusCode:400, headers:CORS, body:'Missing slug' };

  const profiles = getStore({ name: 'profiles' });
  const logos = getStore({ name: 'logos' });
  const p = await profiles.getJSON(slug + '.json');
  if (!p) return { statusCode:404, headers:CORS, body:'Not found' };

  const tel = (p.phone || '').replace(/\s+/g,'');
  const url = p.website || '';
  const adr = p.address || '';

  let photoBlock = '';
  if (p.logo){
    const img = await logos.get(slug + '.jpg', { type: 'arrayBuffer' });
    if (img){
      const b64 = Buffer.from(img).toString('base64');
      photoBlock = 'PHOTO;ENCODING=b;TYPE=JPEG:' + wrap76(b64);
    }
  }

  const vcf = crlf(`BEGIN:VCARD
VERSION:3.0
N:;${p.name || ''};;;
FN:${p.name || ''}
ORG:${p.company || ''}
TITLE:${p.title || ''}
${tel ? 'TEL;TYPE=CELL,VOICE:' + tel : ''}
${p.email ? 'EMAIL;TYPE=INTERNET,WORK:' + p.email : ''}
${url ? 'URL:' + url : ''}
${adr ? 'ADR;TYPE=WORK:;;' + adr + ';;;;' : ''}
${photoBlock}
END:VCARD`);

  return {
    statusCode: 200,
    headers: {
      ...CORS,
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.vcf"`
    },
    body: vcf
  };
}