import { neon } from "@netlify/neon";
import { requireAdmin } from "./_admin_guard.mjs";

const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET,OPTIONS", "Access-Control-Allow-Headers":"Content-Type,x-admin-key" };

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  const auth = requireAdmin(event);
  if (auth) return { ...auth, headers: { ...CORS, "Content-Type":"application/json" } };

  try {
    const q = event.queryStringParameters?.q?.trim() || "";
    const limit  = Math.min(parseInt(event.queryStringParameters?.limit || "20", 10), 100);
    const offset = Math.max(parseInt(event.queryStringParameters?.offset || "0", 10), 0);

    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS profiles (
      slug TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT, company TEXT, phone TEXT,
      email TEXT, website TEXT, address TEXT, logo_base64 TEXT
    )`;

    let rows = [];
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      rows = await sql`
        SELECT slug, name, title, company, phone, email, website, address,
               (logo_base64 IS NOT NULL) AS has_logo
        FROM profiles
        WHERE LOWER(name) LIKE ${like}
           OR LOWER(company) LIKE ${like}
           OR LOWER(email) LIKE ${like}
           OR REPLACE(phone,' ','') LIKE REPLACE(${q},' ','')
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT slug, name, title, company, phone, email, website, address,
               (logo_base64 IS NOT NULL) AS has_logo
        FROM profiles
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type":"application/json" },
      body: JSON.stringify(rows)
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
}
