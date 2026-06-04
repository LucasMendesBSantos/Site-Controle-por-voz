import { getSql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await ensureSchema();
    const sql = getSql();

    const q = (req.query.name || '').toLowerCase().trim();
    if (!q) return res.json(null);

    const customers = await sql`SELECT id, name, cpf, balance::float FROM customers`;
    const found = customers.find((c) => {
      const full = c.name.toLowerCase();
      const first = full.split(' ')[0];
      return full.includes(q) || q.includes(first) || first.startsWith(q);
    });

    if (!found) return res.json(null);

    const txs = await sql`
      SELECT id, date, type, value::float FROM transactions
      WHERE customer_id = ${found.id} ORDER BY date DESC
    `;
    res.json({ ...found, transactions: txs });
  } catch (e) {
    console.error('[/api/customers/search]', e);
    res.status(500).json({ error: e.message });
  }
}
