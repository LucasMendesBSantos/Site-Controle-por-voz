import { getCollection, safe } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const col = await getCollection();
  const c = await col.findOne({ id: req.query.id });

  if (!c) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json(safe(c));
}
