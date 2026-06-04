import { useState, useEffect, useCallback } from 'react';
import { getCustomerFresh, onDBUpdate } from '../data/db';
import { formatCurrency, formatDate } from '../utils/speechParser';

function cpfMask(raw) {
  return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function ClientDashboard({ customerId, onLogout }) {
  const [customer, setCustomer] = useState(null);

  const load = useCallback(async () => {
    const data = await getCustomerFresh(customerId);
    setCustomer(data);
  }, [customerId]);

  useEffect(() => {
    load();
    return onDBUpdate(load);
  }, [load]);

  if (!customer) return <div className="loading">Carregando...</div>;

  const hasDebt = customer.balance > 0;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>Olá, {customer.name.split(' ')[0]}!</h2>
          <p className="dash-cpf">CPF: {cpfMask(customer.cpf)}</p>
        </div>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>

      {/* Balance card */}
      <div className={`balance-card ${hasDebt ? 'debit' : 'ok'}`}>
        <div className="bal-label">{hasDebt ? 'Débito Atual' : 'Situação'}</div>
        <div className="bal-value">
          {hasDebt ? formatCurrency(customer.balance) : 'Regularizado'}
        </div>
        <div className="bal-status">
          {hasDebt ? '⚠️ Pagamento pendente' : '✅ Sem débitos pendentes'}
        </div>
      </div>

      {/* Transaction history */}
      <div className="history-card">
        <h3>Histórico de Transações</h3>

        {customer.transactions.length === 0 ? (
          <p className="empty-msg">Nenhuma transação encontrada.</p>
        ) : (
          <div className="table-scroll">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {customer.transactions.map((tx) => (
                  <tr key={tx.id}>
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
    </div>
  );
}
