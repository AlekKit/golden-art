import { neon } from "@netlify/neon";
import { requireAdmin } from "./_admin_guard.mjs";

const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"DELETE,OPTIONS", "Access-Control-Allow-Headers":"Content-Type,x-admin-key" };

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS };
  if (event.httpMethod !== "DELETE") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  const auth = requireAdmin(event);
  if (auth) return { ...auth, headers: { ...CORS, "Content-Type":"application/json" } };

  try {
    const slug = event.queryStringParameters?.slug || event.path.split("/").pop();
    if (!slug) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing slug" }) };

    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS profiles (
      slug TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT, company TEXT, phone TEXT,
      email TEXT, website TEXT, address TEXT, logo_base64 TEXT
    )`;

    await sql`DELETE FROM profiles WHERE slug=${slug}`;
    return { statusCode: 200, headers: { ...CORS, "Content-Type":"application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
}
