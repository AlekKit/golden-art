import { getStore } from '@netlify/blobs';

export async function handler() {
  try {
    const store = getStore({ name: 'profiles' });
    await store.setJSON('diag.json', { ok: true, t: Date.now() });
    const read = await store.getJSON('diag.json');
    return { statusCode: 200, body: JSON.stringify({ wrote: !!read?.ok, read }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
