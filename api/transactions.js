import { getCollection } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { customerId, type, value } = req.body ?? {};
  if (!customerId || !type || value == null) return res.status(400).json({ error: 'Dados incompletos.' });

  const col = await getCollection();
  const customer = await col.findOne({ id: customerId });
  if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

  const tx = {
    id: `t${Date.now()}`,
    date: new Date().toISOString(),
    type,
    value: parseFloat(parseFloat(value).toFixed(2)),
  };

  const newBalance = parseFloat(
    (type === 'compra' ? customer.balance + tx.value : customer.balance - tx.value).toFixed(2)
  );

  await col.updateOne(
    { id: customerId },
    {
      $push: { transactions: { $each: [tx], $position: 0 } },
      $set: { balance: newBalance },
    }
  );

  res.status(201).json(tx);
}
