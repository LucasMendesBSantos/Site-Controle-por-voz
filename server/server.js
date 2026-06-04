import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');
const PORT = 3001;

// ── Password hash (same algorithm as old frontend) ──────────
function hashPassword(password) {
  let hash = 0;
  const str = password + '_elza_salt_2024';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Buffer.from(String(hash)).toString('base64');
}

// ── Persistence ─────────────────────────────────────────────
function seedDB() {
  return {
    customers: [
      {
        id: '1',
        name: 'Maria Silva',
        cpf: '12345678900',
        passwordHash: hashPassword('123456'),
        balance: 150.00,
        transactions: [
          { id: 't1', date: '2025-12-10T10:30:00', type: 'compra',    value: 200.00 },
          { id: 't2', date: '2025-12-15T14:00:00', type: 'pagamento', value: 50.00  },
        ],
      },
      {
        id: '2',
        name: 'João Santos',
        cpf: '98765432100',
        passwordHash: hashPassword('654321'),
        balance: 0,
        transactions: [
          { id: 't3', date: '2025-12-08T09:00:00', type: 'compra',    value: 100.00 },
          { id: 't4', date: '2025-12-09T11:00:00', type: 'pagamento', value: 100.00 },
        ],
      },
      {
        id: '3',
        name: 'Ana Oliveira',
        cpf: '45678912300',
        passwordHash: hashPassword('112233'),
        balance: 280.50,
        transactions: [
          { id: 't5', date: '2025-12-01T08:00:00', type: 'compra',    value: 500.00  },
          { id: 't6', date: '2025-12-05T16:00:00', type: 'pagamento', value: 219.50  },
        ],
      },
    ],
  };
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const db = seedDB();
    writeDB(db);
    return db;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    console.error('[DB] Arquivo corrompido — reiniciando com dados padrão.');
    const db = seedDB();
    writeDB(db);
    return db;
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function safe(customer) {
  const { passwordHash, ...rest } = customer;
  return rest;
}

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(express.json());

// Login do desenvolvedor (credenciais fixas — apenas no servidor)
app.post('/api/dev-login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === 'Lucas' && password === 'Hellen') {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Usuário ou senha incorretos.' });
});

// Buscar cliente por nome (painel de voz)
app.get('/api/customers/search', (req, res) => {
  const q = (req.query.name || '').toLowerCase().trim();
  if (!q) return res.json(null);

  const db = readDB();
  const found = db.customers.find((c) => {
    const full = c.name.toLowerCase();
    const first = full.split(' ')[0];
    return full.includes(q) || q.includes(first) || first.startsWith(q);
  });

  res.json(found ? safe(found) : null);
});

// Listar todos os clientes (painel dev)
app.get('/api/customers', (_req, res) => {
  const db = readDB();
  res.json(db.customers.map(safe));
});

// Buscar cliente por ID (dashboard)
app.get('/api/customers/:id', (req, res) => {
  const db = readDB();
  const c = db.customers.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json(safe(c));
});

// Login
app.post('/api/login', (req, res) => {
  const { cpf, password } = req.body ?? {};
  if (!cpf || !password) return res.status(400).json({ error: 'Dados incompletos.' });

  const db = readDB();
  const clean = cpf.replace(/\D/g, '');
  const customer = db.customers.find((c) => c.cpf === clean);

  if (!customer || customer.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }
  res.json(safe(customer));
});

// Cadastrar cliente
app.post('/api/customers', (req, res) => {
  const { name, cpf, password } = req.body ?? {};
  const db = readDB();
  const clean = (cpf || '').replace(/\D/g, '');

  if (clean.length !== 11) return res.status(400).json({ error: 'CPF inválido. Digite os 11 dígitos.' });
  if (!name?.trim())        return res.status(400).json({ error: 'Nome completo é obrigatório.' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
  if (db.customers.find((c) => c.cpf === clean)) return res.status(409).json({ error: 'Este CPF já está cadastrado. Faça login.' });

  const newCustomer = {
    id: `c${Date.now()}`,
    name: name.trim(),
    cpf: clean,
    passwordHash: hashPassword(password),
    balance: 0,
    transactions: [],
  };

  db.customers.push(newCustomer);
  writeDB(db);
  res.status(201).json(safe(newCustomer));
});

// Adicionar transação
app.post('/api/transactions', (req, res) => {
  const { customerId, type, value } = req.body ?? {};
  if (!customerId || !type || value == null) return res.status(400).json({ error: 'Dados incompletos.' });

  const db = readDB();
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

  const tx = {
    id: `t${Date.now()}`,
    date: new Date().toISOString(),
    type,
    value: parseFloat(parseFloat(value).toFixed(2)),
  };

  customer.transactions.unshift(tx);
  customer.balance = parseFloat(
    (type === 'compra' ? customer.balance + tx.value : customer.balance - tx.value).toFixed(2)
  );

  writeDB(db);
  res.status(201).json(tx);
});

app.listen(PORT, () => {
  console.log(`\n[Elza API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[Elza API] Banco de dados: ${DB_FILE}\n`);
});
