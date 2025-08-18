// netlify/functions/update_profile.mjs
import { neon } from '@netlify/neon';

// Simple helpers
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  }
});

const requireAdmin = (req) => {
  const key = req.headers.get('x-admin-key') || '';
  const expected = process.env.ADMIN_KEY || '';
  return key && expected && key === expected;
};

// Normalize a phone to digits/+ only
const normalizePhone = (v = '') => v.replace(/[^\d+]/g, '');

export default async (req) => {
  try {
    if (req.method !== 'PUT') {
      return json(405, { error: 'Method not allowed' });
    }

    if (!requireAdmin(req)) {
      return json(401, { error: 'Unauthorized' });
    }

    // slug comes from query string
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return json(400, { error: 'Missing slug' });

    const body = await req.json().catch(() => ({}));

    // Only allow these columns to be updated
    const allowed = new Set([
      'name', 'title', 'company', 'phone', 'email', 'website', 'address', 'logo_base64'
    ]);

    // Clean + transform inputs
    const clean = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!allowed.has(k)) continue;

      // Ignore undefined
      if (v === undefined) continue;

      // Trim strings
      let val = typeof v === 'string' ? v.trim() : v;

      // Special rules
      if (k === 'phone' && val) val = normalizePhone(val);
      if (k === 'logo_base64') {
        // allow null to clear, string to set, ignore empty string
        if (val === '') continue;
        if (val === null) {
          clean[k] = null;
        } else {
          clean[k] = String(val);
        }
        continue;
      }

      // Allow explicit null to clear, or non-empty string to set
      if (val === null) clean[k] = null;
      else if (val !== '') clean[k] = val;
    }

    // If nothing to update, exit gracefully (prevents "… near $1")
    const fields = Object.keys(clean);
    if (fields.length === 0) {
      return json(400, { error: 'No fields to update' });
    }

    const sql = neon(); // Netlify DB (Neon) — auto-configured by env

    // Build a safe parameterized SET list: col=$1, col2=$2, …
    const setParts = [];
    const values = [];
    fields.forEach((col, i) => {
      setParts.push(`${col} = $${i + 1}`);
      values.push(clean[col]);
    });

    // slug is the last parameter
    const paramIndex = fields.length + 1;
    const text = `
      UPDATE profiles
      SET ${setParts.join(', ')}, updated_at = NOW()
      WHERE slug = $${paramIndex}
      RETURNING slug
    `;

    const result = await sql(text, [...values, slug]);

    if (!result.length) {
      return json(404, { error: 'Profile not found' });
    }

    return json(200, { ok: true, slug: result[0].slug });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
}
