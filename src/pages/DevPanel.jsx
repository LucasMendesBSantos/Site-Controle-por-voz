import { useState, useCallback, useEffect } from 'react';
import {
  getAllCustomers, onDBUpdate,
  updateCustomerName, updateNicknames, deleteCustomer,
  getClothingTypes, addClothingType, removeClothingType,
} from '../data/db';
import { formatCurrency, formatDate, formatCPF } from '../utils/speechParser';
import DevDashboard from './DevDashboard';

export default function DevPanel({ onLogout }) {
  // ── Clientes ─────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Apelidos
  const [nickInputs, setNickInputs] = useState({});

  const [activeTab, setActiveTab] = useState('dados');

  // ── Peças de roupa ───────────────────────────────────────────
  const [clothingTypes, setClothingTypes] = useState([]);
  const [newClothingInput, setNewClothingInput] = useState('');
  const [clothingError, setClothingError] = useState('');

  // ── Fetch ────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshClothing = useCallback(async () => {
    const data = await getClothingTypes();
    setClothingTypes(data);
  }, []);

  useEffect(() => {
    refresh();
    refreshClothing();
    return onDBUpdate(refresh);
  }, [refresh, refreshClothing]);

  // ── Clientes: toggle / editar / excluir ──────────────────────
  const toggle = (id) => {
    if (editingId || deletingId) return;
    setExpanded((prev) => (prev === id ? null : id));
  };

  const startEdit = (e, c) => {
    e.stopPropagation();
    setEditingId(c.id); setEditName(c.name); setDeletingId(null); setActionError('');
  };
  const cancelEdit = (e) => { e?.stopPropagation(); setEditingId(null); setActionError(''); };

  const saveEdit = async (e, id) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    setActionLoading(true); setActionError('');
    const r = await updateCustomerName(id, editName.trim());
    setActionLoading(false);
    if (r.error) { setActionError(r.error); return; }
    setEditingId(null); refresh();
  };

  const startDelete = (e, id) => {
    e.stopPropagation(); setDeletingId(id); setEditingId(null); setActionError('');
  };
  const cancelDelete = (e) => { e?.stopPropagation(); setDeletingId(null); setActionError(''); };

  const confirmDelete = async (e, id) => {
    e.stopPropagation(); setActionLoading(true); setActionError('');
    const r = await deleteCustomer(id);
    setActionLoading(false);
    if (r.error) { setActionError(r.error); return; }
    setDeletingId(null);
    if (expanded === id) setExpanded(null);
    refresh();
  };

  // ── Apelidos ─────────────────────────────────────────────────
  const addNickname = async (c) => {
    const nick = (nickInputs[c.id] || '').trim().toLowerCase();
    if (!nick || (c.nicknames || []).includes(nick)) return;
    const newNicks = [...(c.nicknames || []), nick];
    const r = await updateNicknames(c.id, newNicks);
    if (!r.error) {
      setNickInputs((prev) => ({ ...prev, [c.id]: '' }));
      refresh();
    }
  };

  const removeNickname = async (c, nick) => {
    const newNicks = (c.nicknames || []).filter((n) => n !== nick);
    const r = await updateNicknames(c.id, newNicks);
    if (!r.error) refresh();
  };

  // ── Peças de roupa ───────────────────────────────────────────
  const addClothing = async () => {
    const name = newClothingInput.trim().toLowerCase();
    if (!name) return;
    setClothingError('');
    const r = await addClothingType(name);
    if (r.error) { setClothingError(r.error); return; }
    setNewClothingInput('');
    refreshClothing();
  };

  const removeClothing = async (name) => {
    setClothingError('');
    const r = await removeClothingType(name);
    if (r.error) { setClothingError(r.error); return; }
    refreshClothing();
  };

  // ── Stats ────────────────────────────────────────────────────
  const totalDebt = customers.reduce((sum, c) => sum + Math.max(c.balance, 0), 0);

  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // volta para segunda-feira
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const weeklyTx = customers.reduce(
    (sum, c) => sum + c.transactions.filter((tx) => new Date(tx.date) >= startOfWeek).length,
    0
  );

  return (
    <div className="dev-panel">
      <div className="dev-hero">
        <span className="dev-hero-icon">🛠️</span>
        <h2>Painel do Desenvolvedor</h2>
        <p>Gerenciamento do banco de dados (Neon Postgres)</p>
      </div>

      {/* Tabs */}
      <div className="dev-tab-bar">
        <button className={`dev-tab-btn ${activeTab === 'dados' ? 'active' : ''}`} onClick={() => setActiveTab('dados')}>
          📋 Dados
        </button>
        <button className={`dev-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          📊 Dashboard
        </button>
      </div>

      {activeTab === 'dashboard' && <DevDashboard customers={customers} />}

      {activeTab === 'dados' && <>

      {/* Stats */}
      <div className="dev-stats">
        <div className="dev-stat">
          <span className="dev-stat-value">{customers.length}</span>
          <span className="dev-stat-label">Clientes</span>
        </div>
        <div className="dev-stat">
          <span className="dev-stat-value">{weeklyTx}</span>
          <span className="dev-stat-label">Transações</span>
          <span className="dev-stat-sublabel">esta semana</span>
        </div>
        <div className="dev-stat">
          <span className="dev-stat-value">{formatCurrency(totalDebt)}</span>
          <span className="dev-stat-label">Total em débito</span>
        </div>
      </div>

      {/* ── Peças de Roupa ─────────────────────────────────────── */}
      <div className="dev-section">
        <div className="dev-section-head">
          <h3>👗 Peças de Roupa Reconhecidas</h3>
        </div>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: 0 }}>
            Essas peças são reconhecidas automaticamente pelo microfone nas compras.
          </p>
          <div className="nick-chips-row">
            {clothingTypes.map((type) => (
              <span key={type} className="nick-chip clothing-chip">
                {type}
                <button className="nick-chip-remove" onClick={() => removeClothing(type)}>✕</button>
              </span>
            ))}
            {clothingTypes.length === 0 && (
              <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Nenhuma peça cadastrada.</span>
            )}
          </div>
          <div className="dev-nick-add">
            <input
              className="dev-nick-input"
              placeholder="Nova peça (ex: camiseta)..."
              value={newClothingInput}
              onChange={(e) => setNewClothingInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addClothing(); }}
            />
            <button className="btn-nick-add" onClick={addClothing}>+ Adicionar</button>
          </div>
          {clothingError && (
            <p style={{ color: 'var(--red)', fontSize: '.8rem', margin: 0 }}>⚠️ {clothingError}</p>
          )}
        </div>
      </div>

      {/* ── Clientes ───────────────────────────────────────────── */}
      <div className="dev-section">
        <div className="dev-section-head">
          <h3>Clientes cadastrados</h3>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn-refresh" onClick={refresh}>🔄 Atualizar</button>
            <button className="btn-refresh dev-logout-btn" onClick={onLogout}>🚪 Sair</button>
          </div>
        </div>

        {actionError && (
          <div style={{ padding: '.75rem 1.5rem', color: 'var(--red)', fontSize: '.875rem', borderBottom: '1px solid var(--border)' }}>
            ⚠️ {actionError}
          </div>
        )}

        <div className="dev-list">
          {loading && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Carregando...</p>}
          {!loading && error && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>⚠️ {error}</p>}
          {!loading && !error && customers.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Nenhum cliente cadastrado.</p>
          )}

          {customers.map((c) => {
            const isOpen = expanded === c.id;
            const isEditing = editingId === c.id;
            const isDeleting = deletingId === c.id;

            return (
              <div key={c.id} className={`dev-row ${isOpen ? 'open' : ''}`}>
                {/* Row header */}
                <div className="dev-row-head" onClick={() => toggle(c.id)}>
                  <div className="dev-row-left">
                    {isEditing ? (
                      <div className="dev-edit-form" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="dev-edit-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(e, c.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button className="btn-action btn-action-save" onClick={(e) => saveEdit(e, c.id)} disabled={actionLoading}>✓</button>
                        <button className="btn-action btn-action-cancel" onClick={cancelEdit} disabled={actionLoading}>✕</button>
                      </div>
                    ) : (
                      <span className="dev-customer-name">{c.name}</span>
                    )}
                    <span className="dev-customer-cpf">CPF: {formatCPF(c.cpf)}</span>
                    <span className="dev-customer-id">ID: {c.id}</span>
                  </div>

                  <div className="dev-row-right">
                    {isDeleting ? (
                      <div className="dev-confirm-delete" onClick={(e) => e.stopPropagation()}>
                        <span className="dev-confirm-text">Excluir cliente?</span>
                        <button className="btn-action btn-action-save" onClick={(e) => confirmDelete(e, c.id)} disabled={actionLoading}>Sim</button>
                        <button className="btn-action btn-action-cancel" onClick={cancelDelete} disabled={actionLoading}>Não</button>
                      </div>
                    ) : (
                      <>
                        <span className={`dev-bal ${c.balance > 0 ? 'red' : 'green'}`}>{formatCurrency(c.balance)}</span>
                        <span className="dev-tx-count">{c.transactions.length} tx</span>
                        <button className="btn-action btn-action-edit" title="Editar nome" onClick={(e) => startEdit(e, c)}>✏️</button>
                        <button className="btn-action btn-action-delete" title="Excluir cliente" onClick={(e) => startDelete(e, c.id)}>🗑️</button>
                      </>
                    )}
                    <span className="dev-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="dev-history">
                    {/* Apelidos */}
                    <div className="dev-nick-section">
                      <h4 className="dev-nick-title">🎙️ Apelidos para busca por voz</h4>
                      <div className="nick-chips-row">
                        {(c.nicknames || []).map((nick) => (
                          <span key={nick} className="nick-chip">
                            {nick}
                            <button className="nick-chip-remove" onClick={() => removeNickname(c, nick)}>✕</button>
                          </span>
                        ))}
                        {(c.nicknames || []).length === 0 && (
                          <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Nenhum apelido</span>
                        )}
                      </div>
                      <div className="dev-nick-add">
                        <input
                          className="dev-nick-input"
                          placeholder="Adicionar apelido..."
                          value={nickInputs[c.id] || ''}
                          onChange={(e) => setNickInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addNickname(c); }}
                        />
                        <button className="btn-nick-add" onClick={() => addNickname(c)}>+</button>
                      </div>
                    </div>

                    {/* Histórico de transações */}
                    {c.transactions.length === 0 ? (
                      <p className="dev-empty">Nenhuma transação registrada.</p>
                    ) : (
                      <div className="table-scroll">
                        <table className="dev-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Data / Hora</th>
                              <th>Tipo</th>
                              <th>Item</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.transactions.map((tx) => (
                              <tr key={tx.id}>
                                <td className="dev-tx-id">{tx.id}</td>
                                <td className="td-date">{formatDate(tx.date)}</td>
                                <td>
                                  <span className={`tx-pill ${tx.type}`}>
                                    {tx.type === 'compra' ? '🛒 Compra' : '💰 Pagamento'}
                                  </span>
                                </td>
                                <td className="td-item">{tx.item || '—'}</td>
                                <td className={`td-val ${tx.type}`}>
                                  {tx.type === 'compra' ? '+' : '−'}{formatCurrency(tx.value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      </> /* fim activeTab === 'dados' */}
    </div>
  );
}
