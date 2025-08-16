// netlify/functions/get_profile.mjs
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
      event.queryStringParameters?.slug ||
      event.path.split("/").pop(); // supports /get_profile?slug=... or /get_profile/<slug>

    if (!slug) {
      return { statusCode: 400, headers: CORS, body: "Missing slug" };
    }

    const sql = neon(); // uses NETLIFY_DATABASE_URL injected by Netlify
    const { rows } = await sql`
      SELECT slug, name, title, company, phone, email, website, address, logo_base64
      FROM profiles
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (!rows.length) {
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
