import { getCollection, safe } from '../_lib/db.js';
import { hashPassword } from '../_lib/hash.js';

export default async function handler(req, res) {
  const col = await getCollection();

  if (req.method === 'GET') {
    const docs = await col.find({}).toArray();
    return res.json(docs.map(safe));
  }

  if (req.method === 'POST') {
    const { name, cpf, password } = req.body ?? {};
    const clean = (cpf || '').replace(/\D/g, '');

    if (clean.length !== 11) return res.status(400).json({ error: 'CPF inválido. Digite os 11 dígitos.' });
    if (!name?.trim()) return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
    if (await col.findOne({ cpf: clean })) return res.status(409).json({ error: 'Este CPF já está cadastrado. Faça login.' });

    const newCustomer = {
      id: `c${Date.now()}`,
      name: name.trim(),
      cpf: clean,
      passwordHash: hashPassword(password),
      balance: 0,
      transactions: [],
    };

    await col.insertOne(newCustomer);
    return res.status(201).json(safe(newCustomer));
  }

  res.status(405).end();
}
