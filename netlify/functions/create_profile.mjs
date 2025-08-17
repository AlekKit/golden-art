import { neon } from "@netlify/neon";

const json = (code, data) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Basic validation
    if (!data.name || (!data.phone && !data.email)) {
      return json(400, { error: "name and (phone or email) are required" });
    }

    // Normalize logo to pure base64 (optional field)
    let b64 = data.logo_base64 || null;
    if (b64 && typeof b64 === "string") {
      if (b64.startsWith("data:image")) {
        const parts = b64.split(",");
        if (parts[1]) b64 = parts[1];
      }
      b64 = b64.replace(/\s+/g, "");
      const approxBytes = Math.floor(b64.length * 0.75);
      if (approxBytes > 1_000_000) {
        return json(413, { error: "Logo too large (>1MB) after compression" });
      }
    }

    const sql = neon();

    // Ensure table exists (safe to run every call)
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

    // Create slug like "ivica-jakimovski-ab12"
    const slugBase = (data.name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

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
        ${b64}
      )
    `;

    return json(200, {
      ok: true,
      slug,
      card_url: `/card/${slug}`,
      vcf_url: `/.netlify/functions/vcf?slug=${slug}`,
    });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
}
