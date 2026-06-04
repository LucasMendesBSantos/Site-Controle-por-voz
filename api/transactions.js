import { getSql, ensureSchema } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await ensureSchema();

    const { customerId, type, value } = req.body ?? {};
    if (!customerId || !type || value == null) return res.status(400).json({ error: 'Dados incompletos.' });

    const sql = getSql();
    const [customer] = await sql`SELECT id, balance::float FROM customers WHERE id = ${customerId}`;
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const txValue = parseFloat(parseFloat(value).toFixed(2));
    const newBalance = parseFloat(
      (type === 'compra'
        ? customer.balance + txValue
        : customer.balance - txValue
      ).toFixed(2)
    );
    const txId = `t${Date.now()}`;
    const date = new Date().toISOString();

    await sql`
      INSERT INTO transactions (id, customer_id, date, type, value)
      VALUES (${txId}, ${customerId}, ${date}, ${type}, ${txValue})
    `;
    await sql`UPDATE customers SET balance = ${newBalance} WHERE id = ${customerId}`;

    res.status(201).json({ id: txId, date, type, value: txValue });
  } catch (e) {
    console.error('[/api/transactions]', e);
    res.status(500).json({ error: e.message });
  }
}
