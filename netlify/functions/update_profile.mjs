import { neon } from "@netlify/neon";
import { requireAdmin } from "./_admin_guard.mjs";

const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"PUT,POST,OPTIONS", "Access-Control-Allow-Headers":"Content-Type,x-admin-key" };

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS };
  if (!["PUT","POST"].includes(event.httpMethod)) return { statusCode: 405, headers: CORS, body: "Use PUT or POST" };

  const auth = requireAdmin(event);
  if (auth) return { ...auth, headers: { ...CORS, "Content-Type":"application/json" } };

  try {
    const slug = event.queryStringParameters?.slug || event.path.split("/").pop();
    if (!slug) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing slug" }) };
    const patch = JSON.parse(event.body || "{}");

    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS profiles (
      slug TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT, company TEXT, phone TEXT,
      email TEXT, website TEXT, address TEXT, logo_base64 TEXT
    )`;

    const { rows: exists } = await sql`SELECT slug FROM profiles WHERE slug=${slug} LIMIT 1`;
    if (!exists.length) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Profile not found" }) };

    const fields = ["name","title","company","phone","email","website","address","logo_base64"];
    for (const key of fields) {
      if (patch[key] !== undefined) {
        await sql`UPDATE profiles SET ${sql(key)} = ${patch[key]} WHERE slug=${slug}`;
      }
    }

    const { rows } = await sql`
      SELECT slug, name, title, company, phone, email, website, address, logo_base64
      FROM profiles WHERE slug=${slug} LIMIT 1
    `;
    return { statusCode: 200, headers: { ...CORS, "Content-Type":"application/json" }, body: JSON.stringify(rows[0]) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
}
