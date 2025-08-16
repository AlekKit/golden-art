export function requireAdmin(event) {
  const key = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  const ok = process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
  if (!ok) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }
  return null; // authorized
}
