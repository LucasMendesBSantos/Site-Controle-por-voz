import { MongoClient } from 'mongodb';
import { hashPassword } from './hash.js';

const uri = process.env.MONGODB_URI;

// Reutiliza conexão entre invocações warm no mesmo processo
let cached = globalThis.__mongo ?? (globalThis.__mongo = { conn: null, promise: null });

export async function getCollection() {
  if (!uri) throw new Error('MONGODB_URI não configurado nas variáveis de ambiente.');

  if (!cached.conn) {
    if (!cached.promise) {
      cached.promise = new MongoClient(uri, { maxPoolSize: 1 }).connect();
    }
    cached.conn = await cached.promise;
  }

  const col = cached.conn.db('elzapresentes').collection('customers');

  if ((await col.countDocuments()) === 0) {
    await col.insertMany([
      {
        id: '1',
        name: 'Maria Silva',
        cpf: '12345678900',
        passwordHash: hashPassword('123456'),
        balance: 150.0,
        transactions: [
          { id: 't1', date: '2025-12-10T10:30:00', type: 'compra', value: 200.0 },
          { id: 't2', date: '2025-12-15T14:00:00', type: 'pagamento', value: 50.0 },
        ],
      },
      {
        id: '2',
        name: 'João Santos',
        cpf: '98765432100',
        passwordHash: hashPassword('654321'),
        balance: 0,
        transactions: [
          { id: 't3', date: '2025-12-08T09:00:00', type: 'compra', value: 100.0 },
          { id: 't4', date: '2025-12-09T11:00:00', type: 'pagamento', value: 100.0 },
        ],
      },
      {
        id: '3',
        name: 'Ana Oliveira',
        cpf: '45678912300',
        passwordHash: hashPassword('112233'),
        balance: 280.5,
        transactions: [
          { id: 't5', date: '2025-12-01T08:00:00', type: 'compra', value: 500.0 },
          { id: 't6', date: '2025-12-05T16:00:00', type: 'pagamento', value: 219.5 },
        ],
      },
    ]);
  }

  return col;
}

export function safe(customer) {
  const { _id, passwordHash, ...rest } = customer;
  return rest;
}
