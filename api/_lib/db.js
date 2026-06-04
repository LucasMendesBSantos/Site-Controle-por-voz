import { neon } from '@neondatabase/serverless';
import { hashPassword } from './hash.js';

export function getSql() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL não configurado nas variáveis de ambiente.');
  return globalThis.__neonSql ?? (globalThis.__neonSql = neon(url));
}

let ready = globalThis.__pgReady ?? false;

export async function ensureSchema() {
  if (ready) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      cpf           TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance       NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL,
      value       NUMERIC(10,2) NOT NULL
    )
  `;

  const [row] = await sql`SELECT 1 FROM customers LIMIT 1`;
  if (!row) await seed(sql);

  globalThis.__pgReady = ready = true;
}

async function seed(sql) {
  const data = [
    {
      id: '1', name: 'Maria Silva', cpf: '12345678900', pwd: '123456', bal: 150.00,
      txs: [
        { id: 't1', date: '2025-12-10T10:30:00', type: 'compra',    val: 200.00 },
        { id: 't2', date: '2025-12-15T14:00:00', type: 'pagamento', val: 50.00  },
      ],
    },
    {
      id: '2', name: 'João Santos', cpf: '98765432100', pwd: '654321', bal: 0,
      txs: [
        { id: 't3', date: '2025-12-08T09:00:00', type: 'compra',    val: 100.00 },
        { id: 't4', date: '2025-12-09T11:00:00', type: 'pagamento', val: 100.00 },
      ],
    },
    {
      id: '3', name: 'Ana Oliveira', cpf: '45678912300', pwd: '112233', bal: 280.50,
      txs: [
        { id: 't5', date: '2025-12-01T08:00:00', type: 'compra',    val: 500.00 },
        { id: 't6', date: '2025-12-05T16:00:00', type: 'pagamento', val: 219.50 },
      ],
    },
  ];

  for (const c of data) {
    await sql`
      INSERT INTO customers (id, name, cpf, password_hash, balance)
      VALUES (${c.id}, ${c.name}, ${c.cpf}, ${hashPassword(c.pwd)}, ${c.bal})
    `;
    for (const tx of c.txs) {
      await sql`
        INSERT INTO transactions (id, customer_id, date, type, value)
        VALUES (${tx.id}, ${c.id}, ${tx.date}, ${tx.type}, ${tx.val})
      `;
    }
  }
}
