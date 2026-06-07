import { getSql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM clothing_types WHERE name = ${req.query.name}`;
    return res.json({ ok: true });
  } catch (e) {
    console.error('[/api/clothing-types/:name]', e);
    res.status(500).json({ error: e.message });
  }
}
