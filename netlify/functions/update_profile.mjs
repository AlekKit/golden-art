import { neon } from "@netlify/neon";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (code, data) => ({
  statusCode: code,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }
  if (!["PUT", "POST"].includes(event.httpMethod)) {
    return json(405, { error: "Use PUT or POST" });
  }

  try {
    const slug =
      event.queryStringParameters?.slug || event.path.split("/").pop();
    if (!slug) return json(400, { error: "Missing slug" });

    const patch = JSON.parse(event.body || "{}");

    // Normalize logo_base64 if provided
    if (typeof patch.logo_base64 === "string" && patch.logo_base64) {
      let b64 = patch.logo_base64;
      if (b64.startsWith("data:image")) {
        const parts = b64.split(",");
        if (parts[1]) b64 = parts[1];
      }
      b64 = b64.replace(/\s+/g, "");
      const approxBytes = Math.floor(b64.length * 0.75);
      if (approxBytes > 1_000_000) {
        return json(413, { error: "Logo too large (>1MB) after compression" });
      }
      patch.logo_base64 = b64;
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

    const exists = await sql`SELECT slug FROM profiles WHERE slug = ${slug} LIMIT 1`;
    if (!exists || exists.length === 0) {
      return json(404, { error: "Profile not found" });
    }

    // Whitelist fields and update only provided ones
    const fields = [
      "name",
      "title",
      "company",
      "phone",
      "email",
      "website",
      "address",
      "logo_base64",
    ];
    for (const key of fields) {
      if (patch[key] !== undefined) {
        await sql`UPDATE profiles SET ${sql(key)} = ${patch[key]} WHERE slug = ${slug}`;
      }
    }

    const rows = await sql`
      SELECT slug, name, title, company, phone, email, website, address, logo_base64
      FROM profiles WHERE slug=${slug} LIMIT 1
    `;
    return json(200, rows[0]);
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
}
