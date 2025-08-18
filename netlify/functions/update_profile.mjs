// netlify/functions/update_profile.mjs
import { neon } from '@netlify/neon';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });

const okAdmin = (req) => {
  const got = req.headers.get('x-admin-key') || '';
  const need = process.env.ADMIN_KEY || '';
  return got && need && got === need;
};

const normalizePhone = (v = '') => v.replace(/[^\d+]/g, '');

export default async (req) => {
  try {
    if (req.method !== 'PUT') return json(405, { error: 'Method not allowed' });
    if (!okAdmin(req)) return json(401, { error: 'Unauthorized' });

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return json(400, { error: 'Missing slug' });

    const body = await req.json().catch(() => ({}));

    // Only allow these columns
    const allowed = new Set([
      'name', 'title', 'company', 'phone', 'email', 'website', 'address', 'logo_base64',
    ]);

    const clean = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!allowed.has(k)) continue;
      if (v === undefined) continue;

      let val = typeof v === 'string' ? v.trim() : v;

      if (k === 'phone' && val) val = normalizePhone(val);

      if (k === 'logo_base64') {
        if (val === '') continue;          // ignore empty string
        clean[k] = val === null ? null : String(val);
        continue;
      }

      if (val === null) clean[k] = null;   // allow clearing
      else if (val !== '') clean[k] = val; // keep non-empty strings
    }

    const fields = Object.keys(clean);
    if (fields.length === 0) {
      return json(400, { error: 'No fields to update' });
    }

    const sql = neon();

    // Build: SET col1=$1, col2=$2, ...
    const setParts = [];
    const values = [];
    fields.forEach((col, i) => {
      setParts.push(`${col} = $${i + 1}`);
      values.push(clean[col]);
    });

    const text = `
      UPDATE profiles
      SET ${setParts.join(', ')}
      WHERE slug = $${fields.length + 1}
      RETURNING slug
    `;

    const rows = await sql(text, [...values, slug]);
    if (!rows.length) return json(404, { error: 'Profile not found' });

    return json(200, { ok: true, slug: rows[0].slug });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
};
