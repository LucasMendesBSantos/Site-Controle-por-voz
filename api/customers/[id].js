import { getSql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = req.query;

    if (req.method === 'GET') {
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
        WHERE c.id = ${id}
        GROUP BY c.id, c.name, c.cpf, c.balance
      `;
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
      return res.json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const { name } = req.body ?? {};
      if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
      const rows = await sql`
        UPDATE customers SET name = ${name.trim()} WHERE id = ${id} RETURNING id
      `;
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const rows = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[/api/customers/:id]', e);
    res.status(500).json({ error: e.message });
  }
}
