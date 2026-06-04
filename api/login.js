import { getCollection, safe } from './_lib/db.js';
import { hashPassword } from './_lib/hash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { cpf, password } = req.body ?? {};
  if (!cpf || !password) return res.status(400).json({ error: 'Dados incompletos.' });

  const col = await getCollection();
  const clean = cpf.replace(/\D/g, '');
  const customer = await col.findOne({ cpf: clean });

  if (!customer || customer.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }

  res.json(safe(customer));
}
