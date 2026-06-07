const API = '/api';
const DB_EVENT = 'elza-db-updated';

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

export async function getClothingTypes() {
  const r = await fetch(`${API}/clothing-types`);
  return r.ok ? r.json() : [];
}

// ── Escritas ─────────────────────────────────────────────────

export async function addTransaction(customerId, type, value, item = null) {
  const r = await fetch(`${API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, type, value, item }),
  });
  if (r.ok) dispatch();
  return r.ok;
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

export async function updateNicknames(id, nicknames) {
  const r = await fetch(`${API}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nicknames }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { error: data.error || 'Erro ao atualizar apelidos.' };
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

export async function addClothingType(name) {
  const r = await fetch(`${API}/clothing-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { error: data.error || 'Erro ao adicionar.' };
  return { ok: true };
}

export async function removeClothingType(name) {
  const r = await fetch(`${API}/clothing-types/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { error: data.error || 'Erro ao remover.' };
  return { ok: true };
}
