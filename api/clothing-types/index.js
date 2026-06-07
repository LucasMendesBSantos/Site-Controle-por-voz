import { getSql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`SELECT name FROM clothing_types ORDER BY name`;
      return res.json(rows.map((r) => r.name));
    }

    if (req.method === 'POST') {
      const { name } = req.body ?? {};
      if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
      const clean = name.trim().toLowerCase();
      await sql`INSERT INTO clothing_types (name) VALUES (${clean}) ON CONFLICT DO NOTHING`;
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[/api/clothing-types]', e);
    res.status(500).json({ error: e.message });
  }
}
