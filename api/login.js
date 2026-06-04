import { hashPassword } from './_lib/hash.js';
import { sql, ensureSchema } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await ensureSchema();

  const { cpf, password } = req.body ?? {};
  if (!cpf || !password) return res.status(400).json({ error: 'Dados incompletos.' });

  const clean = cpf.replace(/\D/g, '');
  const [customer] = await sql`
    SELECT id, name, cpf, balance::float, password_hash FROM customers WHERE cpf = ${clean}
  `;

  if (!customer || customer.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }

  const txs = await sql`
    SELECT id, date, type, value::float FROM transactions
    WHERE customer_id = ${customer.id} ORDER BY date DESC
  `;

  const { password_hash, ...safe } = customer;
  res.json({ ...safe, transactions: txs });
}
