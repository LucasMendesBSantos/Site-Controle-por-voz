import { pool, ensureSchema } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await ensureSchema();

  const { customerId, type, value } = req.body ?? {};
  if (!customerId || !type || value == null) return res.status(400).json({ error: 'Dados incompletos.' });

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, balance::float FROM customers WHERE id = $1', [customerId]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const txValue = parseFloat(parseFloat(value).toFixed(2));
    const newBalance = parseFloat(
      (type === 'compra'
        ? rows[0].balance + txValue
        : rows[0].balance - txValue
      ).toFixed(2)
    );
    const txId = `t${Date.now()}`;
    const date = new Date().toISOString();

    await client.query('BEGIN');
    await client.query(
      'INSERT INTO transactions (id, customer_id, date, type, value) VALUES ($1, $2, $3, $4, $5)',
      [txId, customerId, date, type, txValue]
    );
    await client.query('UPDATE customers SET balance = $1 WHERE id = $2', [newBalance, customerId]);
    await client.query('COMMIT');

    res.status(201).json({ id: txId, date, type, value: txValue });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
