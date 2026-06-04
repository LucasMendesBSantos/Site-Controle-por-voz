import { getSql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT c.id, c.name, c.cpf, c.balance::float,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'date', t.date, 'type', t.type, 'value', t.value::float)
            ORDER BY t.date DESC
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS transactions
      FROM customers c
      LEFT JOIN transactions t ON t.customer_id = c.id
      WHERE c.id = ${req.query.id}
      GROUP BY c.id, c.name, c.cpf, c.balance
    `;

    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    console.error('[/api/customers/:id]', e);
    res.status(500).json({ error: e.message });
  }
}
