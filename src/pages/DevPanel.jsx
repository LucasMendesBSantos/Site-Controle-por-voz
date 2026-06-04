import { useState, useCallback, useEffect } from 'react';
import { getAllCustomers, updateCustomerName, deleteCustomer, onDBUpdate } from '../data/db';
import { formatCurrency, formatDate, formatCPF } from '../utils/speechParser';

export default function DevPanel({ onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

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

  useEffect(() => {
    refresh();
    return onDBUpdate(refresh);
  }, [refresh]);

  const toggle = (id) => {
    if (editingId || deletingId) return;
    setExpanded((prev) => (prev === id ? null : id));
  };

  const startEdit = (e, c) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditName(c.name);
    setDeletingId(null);
    setActionError('');
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingId(null);
    setActionError('');
  };

  const saveEdit = async (e, id) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    setActionLoading(true);
    setActionError('');
    const result = await updateCustomerName(id, editName.trim());
    setActionLoading(false);
    if (result.error) { setActionError(result.error); return; }
    setEditingId(null);
    refresh();
  };

  const startDelete = (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    setEditingId(null);
    setActionError('');
  };

  const cancelDelete = (e) => {
    e?.stopPropagation();
    setDeletingId(null);
    setActionError('');
  };

  const confirmDelete = async (e, id) => {
    e.stopPropagation();
    setActionLoading(true);
    setActionError('');
    const result = await deleteCustomer(id);
    setActionLoading(false);
    if (result.error) { setActionError(result.error); return; }
    setDeletingId(null);
    if (expanded === id) setExpanded(null);
    refresh();
  };

  const totalDebt = customers.reduce((sum, c) => sum + Math.max(c.balance, 0), 0);
  const totalTx = customers.reduce((sum, c) => sum + c.transactions.length, 0);

  return (
    <div className="dev-panel">
      <div className="dev-hero">
        <span className="dev-hero-icon">🛠️</span>
        <h2>Painel do Desenvolvedor</h2>
        <p>Gerenciamento do banco de dados (Neon Postgres)</p>
      </div>

      {/* Stats row */}
      <div className="dev-stats">
        <div className="dev-stat">
          <span className="dev-stat-value">{customers.length}</span>
          <span className="dev-stat-label">Clientes</span>
        </div>
        <div className="dev-stat">
          <span className="dev-stat-value">{totalTx}</span>
          <span className="dev-stat-label">Transações</span>
        </div>
        <div className="dev-stat">
          <span className="dev-stat-value">{formatCurrency(totalDebt)}</span>
          <span className="dev-stat-label">Total em débito</span>
        </div>
      </div>

      {/* Customer list */}
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
          {loading && (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              Carregando...
            </p>
          )}
          {!loading && error && (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
              ⚠️ {error}
            </p>
          )}
          {!loading && !error && customers.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              Nenhum cliente cadastrado.
            </p>
          )}
          {customers.map((c) => {
            const isOpen = expanded === c.id;
            const isEditing = editingId === c.id;
            const isDeleting = deletingId === c.id;

            return (
              <div key={c.id} className={`dev-row ${isOpen ? 'open' : ''}`}>
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
                        <span className={`dev-bal ${c.balance > 0 ? 'red' : 'green'}`}>
                          {formatCurrency(c.balance)}
                        </span>
                        <span className="dev-tx-count">{c.transactions.length} tx</span>
                        <button
                          className="btn-action btn-action-edit"
                          title="Editar nome"
                          onClick={(e) => startEdit(e, c)}
                        >✏️</button>
                        <button
                          className="btn-action btn-action-delete"
                          title="Excluir cliente"
                          onClick={(e) => startDelete(e, c.id)}
                        >🗑️</button>
                      </>
                    )}
                    <span className="dev-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="dev-history">
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
    </div>
  );
}
