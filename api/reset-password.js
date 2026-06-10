import { getSql, ensureSchema } from './_lib/db.js';
import { hashPassword } from './_lib/hash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await ensureSchema();
    const sql = getSql();

    const { name, cpf, newPassword } = req.body ?? {};
    const clean = (cpf || '').replace(/\D/g, '');

    if (!name?.trim() || clean.length !== 11)
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
    if (!newPassword || newPassword.length < 4)
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });

    const [customer] = await sql`SELECT id, name FROM customers WHERE cpf = ${clean}`;

    if (!customer || customer.name.toLowerCase().trim() !== name.toLowerCase().trim())
      return res.status(401).json({ error: 'Nome ou CPF incorretos. Verifique os dados e tente novamente.' });

    await sql`UPDATE customers SET password_hash = ${hashPassword(newPassword)} WHERE id = ${customer.id}`;

    res.json({ ok: true });
  } catch (e) {
    console.error('[/api/reset-password]', e);
    res.status(500).json({ error: e.message });
  }
}
