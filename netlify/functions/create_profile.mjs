// netlify/functions/create_profile.mjs
import { neon } from "@netlify/neon";

// This function creates the table if it doesn't exist and inserts one profile.
// It stores the (optionally compressed) base64 logo in the DB too.
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    if (!data.name || (!data.phone && !data.email)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "name and (phone or email) are required" })
      };
    }

    const sql = neon(); // uses NETLIFY_DATABASE_URL that Netlify set for you

    // Create table once (safe to run every call)
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        company TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        address TEXT,
        logo_base64 TEXT
      )
    `;

    // Make a slug like "ivica-jakimovski-ab12"
    const slugBase = (data.name || "")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2,6)}`;

    await sql`
      INSERT INTO profiles (slug, name, title, company, phone, email, website, address, logo_base64)
      VALUES (
        ${slug},
        ${data.name || ""},
        ${data.title || ""},
        ${data.company || ""},
        ${data.phone || ""},
        ${data.email || ""},
        ${data.website || ""},
        ${data.address || ""},
        ${data.logo_base64 || null}
      )
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, slug })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err?.message || err) })
    };
  }
}
