import { formatCurrency } from '../utils/speechParser';

export default function ConfirmModal({ customer, pending, onConfirm, onCancel }) {
  const isCompra = pending.type === 'compra';
  const newBalance = parseFloat(
    (isCompra ? customer.balance + pending.value : customer.balance - pending.value).toFixed(2)
  );

  return (
    <div className="confirm-modal">
      <h3>Confirmar Transação</h3>

      <div className={`tx-summary ${isCompra ? 'compra' : 'pagamento'}`}>
        <span className="tx-icon">{isCompra ? '🛒' : '💰'}</span>
        <div className="tx-details">
          <span className="tx-label">{isCompra ? 'Compra' : 'Pagamento'}</span>
          {pending.item && (
            <span className="tx-item">📦 {pending.item}</span>
          )}
          <span className="tx-val">{formatCurrency(pending.value)}</span>
          <span className="tx-who">
            para <strong>{customer.name}</strong>
          </span>
        </div>
      </div>

      <div className="balance-diff">
        <div className="diff-row">
          <span>Saldo atual</span>
          <span>{formatCurrency(customer.balance)}</span>
        </div>
        <div className="diff-arrow">↓</div>
        <div className={`diff-row new ${newBalance > 0 ? 'red' : 'green'}`}>
          <span>Novo saldo</span>
          <span>{formatCurrency(newBalance)}</span>
        </div>
      </div>

      <div className="confirm-btns">
        <button className="btn-yes" onClick={onConfirm}>✅ Confirmar</button>
        <button className="btn-no" onClick={onCancel}>❌ Cancelar</button>
      </div>
    </div>
  );
}
