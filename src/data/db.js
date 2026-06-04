const API = '/api';
const DB_EVENT = 'elza-db-updated';

// Notifica componentes que escutam atualizações (mesmo navegador)
function dispatch() {
  window.dispatchEvent(new CustomEvent(DB_EVENT));
}

export function onDBUpdate(fn) {
  window.addEventListener(DB_EVENT, fn);
  return () => window.removeEventListener(DB_EVENT, fn);
}

// ── Leituras ─────────────────────────────────────────────────

export async function findCustomerByName(name) {
  const r = await fetch(`${API}/customers/search?name=${encodeURIComponent(name)}`);
  return r.ok ? r.json() : null;
}

export async function loginCustomer(cpf, password) {
  const r = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, password }),
  });
  if (r.ok) return r.json();
  const data = await r.json().catch(() => ({}));
  return { error: data.error || 'Erro desconhecido.' };
}

export async function getCustomerFresh(customerId) {
  const r = await fetch(`${API}/customers/${customerId}`);
  return r.ok ? r.json() : null;
}

export async function getAllCustomers() {
  const r = await fetch(`${API}/customers`);
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${r.status}`);
  }
  return r.json();
}

// ── Escritas ─────────────────────────────────────────────────

export async function addTransaction(customerId, type, value) {
  const r = await fetch(`${API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, type, value }),
  });
  if (r.ok) dispatch();
  return r.ok;
}

export async function updateCustomerName(id, name) {
  const r = await fetch(`${API}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { error: data.error || 'Erro ao atualizar.' };
  dispatch();
  return { ok: true };
}

export async function deleteCustomer(id) {
  const r = await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { error: data.error || 'Erro ao excluir.' };
  dispatch();
  return { ok: true };
}

export async function registerCustomer(name, cpf, password) {
  const r = await fetch(`${API}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, cpf, password }),
  });
  const data = await r.json();
  if (!r.ok) return { error: data.error || 'Erro ao cadastrar.' };
  dispatch();
  return { customer: data };
}
