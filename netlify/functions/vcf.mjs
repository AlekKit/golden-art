import { neon } from "@netlify/neon";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const crlf = (s) => s.replace(/\r?\n/g, "\r\n");
const wrap76 = (b64) => b64.replace(/(.{76})/g, "$1\r\n ");

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

    const rows = await sql`
      SELECT name, title, company, phone, email, website, address, logo_base64
      FROM profiles
      WHERE slug = ${slug}
      LIMIT 1
    `;
    if (!rows || rows.length === 0) {
      return { statusCode: 404, headers: CORS, body: "Not found" };
    }
    const p = rows[0];

    const lines = [];
    lines.push("BEGIN:VCARD", "VERSION:3.0");
    lines.push(`N:;${p.name || ""};;;`);
    lines.push(`FN:${p.name || ""}`);
    if (p.company) lines.push(`ORG:${p.company}`);
    if (p.title) lines.push(`TITLE:${p.title}`);
    if (p.phone) lines.push(`TEL;TYPE=CELL,VOICE:${(p.phone || "").replace(/\s+/g, "")}`);
    if (p.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${p.email}`);
    if (p.website) lines.push(`URL:${p.website}`);
    if (p.address) lines.push(`ADR;TYPE=WORK:;;${p.address};;;;`);
    if (p.logo_base64) lines.push("PHOTO;ENCODING=b;TYPE=JPEG:" + wrap76(p.logo_base64));
    lines.push("END:VCARD");

    const vcf = crlf(lines.join("\n"));
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.vcf"`,
      },
      body: vcf,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: String(err?.message || err) }),
    };
  }
}
