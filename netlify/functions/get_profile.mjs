import { neon } from "@netlify/neon";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const slug =
      event.queryStringParameters?.slug || event.path.split("/").pop();
    if (!slug) {
      return { statusCode: 400, headers: CORS, body: "Missing slug" };
    }

    const sql = neon();

    await sql`CREATE TABLE IF NOT EXISTS profiles (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      company TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      logo_base64 TEXT
    )`;

    // @netlify/neon returns an array, not { rows }
    const rows = await sql`
      SELECT slug, name, title, company, phone, email, website, address, logo_base64
      FROM profiles
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return { statusCode: 404, headers: CORS, body: "Not found" };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify(rows[0]),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: String(err?.message || err) }),
    };
  }
}
