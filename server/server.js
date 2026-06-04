import express from 'express';
import { sql, pool, ensureSchema } from '../api/_lib/db.js';
import { hashPassword } from '../api/_lib/hash.js';

const PORT = 3001;
const app = express();
app.use(express.json());

// ── Dev login ────────────────────────────────────────────────
app.post('/api/dev-login', (req, res) => {
  const { username, password } = req.body ?? {};
  const validUser = process.env.DEV_USERNAME || 'Lucas';
  const validPass = process.env.DEV_PASSWORD || 'Hellen';
  if (username === validUser && password === validPass) return res.json({ ok: true });
  res.status(401).json({ error: 'Usuário ou senha incorretos.' });
});

// ── Busca por nome ───────────────────────────────────────────
app.get('/api/customers/search', async (req, res) => {
  const q = (req.query.name || '').toLowerCase().trim();
  if (!q) return res.json(null);

  const customers = await sql`SELECT id, name, cpf, balance::float FROM customers`;
  const found = customers.find((c) => {
    const full = c.name.toLowerCase();
    const first = full.split(' ')[0];
    return full.includes(q) || q.includes(first) || first.startsWith(q);
  });
  if (!found) return res.json(null);

  const txs = await sql`
    SELECT id, date, type, value::float FROM transactions
    WHERE customer_id = ${found.id} ORDER BY date DESC
  `;
  res.json({ ...found, transactions: txs });
});

// ── Listar todos os clientes ─────────────────────────────────
app.get('/api/customers', async (_req, res) => {
  const customers = await sql`SELECT id, name, cpf, balance::float FROM customers ORDER BY name`;
  const allTxs = await sql`SELECT id, customer_id, date, type, value::float FROM transactions ORDER BY date DESC`;

  const txMap = {};
  for (const tx of allTxs) {
    if (!txMap[tx.customer_id]) txMap[tx.customer_id] = [];
    txMap[tx.customer_id].push({ id: tx.id, date: tx.date, type: tx.type, value: tx.value });
  }
  res.json(customers.map((c) => ({ ...c, transactions: txMap[c.id] ?? [] })));
});

// ── Buscar cliente por ID ────────────────────────────────────
app.get('/api/customers/:id', async (req, res) => {
  const rows = await sql`
    SELECT c.id, c.name, c.cpf, c.balance::float,
      COALESCE(
        json_agg(
          json_build_object('id', t.id, 'date', t.date, 'type', t.type, 'value', t.value::float)
          ORDER BY t.date DESC
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS transactions
    FROM customers c
    LEFT JOIN transactions t ON t.customer_id = c.id
    WHERE c.id = ${req.params.id}
    GROUP BY c.id, c.name, c.cpf, c.balance
  `;
  if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json(rows[0]);
});

// ── Login do cliente ─────────────────────────────────────────
app.post('/api/login', async (req, res) => {
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
});

// ── Cadastrar cliente ────────────────────────────────────────
app.post('/api/customers', async (req, res) => {
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
  res.status(201).json({ id, name: name.trim(), cpf: clean, balance: 0, transactions: [] });
});

// ── Adicionar transação ──────────────────────────────────────
app.post('/api/transactions', async (req, res) => {
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
});

// ── Inicialização ────────────────────────────────────────────
async function main() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`\n[Elza API] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[Elza API] Banco de dados: Neon Postgres\n`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
