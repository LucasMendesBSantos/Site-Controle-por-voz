import { useState, useCallback, useEffect } from 'react';
import { getAllCustomers, onDBUpdate } from '../data/db';
import { formatCurrency, formatDate, formatCPF } from '../utils/speechParser';

export default function DevPanel({ onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

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

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  const totalDebt = customers.reduce((sum, c) => sum + Math.max(c.balance, 0), 0);
  const totalTx = customers.reduce((sum, c) => sum + c.transactions.length, 0);

  return (
    <div className="dev-panel">
      <div className="dev-hero">
        <span className="dev-hero-icon">🛠️</span>
        <h2>Painel do Desenvolvedor</h2>
        <p>Visualização do banco de dados (server/db.json)</p>
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
            return (
              <div key={c.id} className={`dev-row ${isOpen ? 'open' : ''}`}>
                <button className="dev-row-head" onClick={() => toggle(c.id)}>
                  <div className="dev-row-left">
                    <span className="dev-customer-name">{c.name}</span>
                    <span className="dev-customer-cpf">CPF: {formatCPF(c.cpf)}</span>
                    <span className="dev-customer-id">ID: {c.id}</span>
                  </div>
                  <div className="dev-row-right">
                    <span className={`dev-bal ${c.balance > 0 ? 'red' : 'green'}`}>
                      {formatCurrency(c.balance)}
                    </span>
                    <span className="dev-tx-count">{c.transactions.length} tx</span>
                    <span className="dev-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

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
