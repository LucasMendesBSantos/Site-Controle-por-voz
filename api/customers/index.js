import { hashPassword } from '../_lib/hash.js';
import { sql, ensureSchema } from '../_lib/db.js';

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === 'GET') {
    const customers = await sql`SELECT id, name, cpf, balance::float FROM customers ORDER BY name`;
    const allTxs = await sql`SELECT id, customer_id, date, type, value::float FROM transactions ORDER BY date DESC`;

    const txMap = {};
    for (const tx of allTxs) {
      if (!txMap[tx.customer_id]) txMap[tx.customer_id] = [];
      txMap[tx.customer_id].push({ id: tx.id, date: tx.date, type: tx.type, value: tx.value });
    }

    return res.json(customers.map((c) => ({ ...c, transactions: txMap[c.id] ?? [] })));
  }

  if (req.method === 'POST') {
    const { name, cpf, password } = req.body ?? {};
    const clean = (cpf || '').replace(/\D/g, '');

    if (clean.length !== 11) return res.status(400).json({ error: 'CPF inválido. Digite os 11 dígitos.' });
    if (!name?.trim())        return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });

    const [existing] = await sql`SELECT 1 FROM customers WHERE cpf = ${clean} LIMIT 1`;
    if (existing) return res.status(409).json({ error: 'Este CPF já está cadastrado. Faça login.' });

    const id = `c${Date.now()}`;
    await sql`
      INSERT INTO customers (id, name, cpf, password_hash, balance)
      VALUES (${id}, ${name.trim()}, ${clean}, ${hashPassword(password)}, 0)
    `;
    return res.status(201).json({ id, name: name.trim(), cpf: clean, balance: 0, transactions: [] });
  }

  res.status(405).end();
}
