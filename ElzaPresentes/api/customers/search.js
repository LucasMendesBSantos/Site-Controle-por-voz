import { getCollection, safe } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const q = (req.query.name || '').toLowerCase().trim();
  if (!q) return res.json(null);

  const col = await getCollection();
  const docs = await col.find({}).toArray();

  const found = docs.find((c) => {
    const full = c.name.toLowerCase();
    const first = full.split(' ')[0];
    return full.includes(q) || q.includes(first) || first.startsWith(q);
  });

  res.json(found ? safe(found) : null);
}
