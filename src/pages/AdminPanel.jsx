import { useState, useCallback } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { findCustomerByName, addTransaction } from '../data/db';
import { parseVoiceCommand, formatCurrency } from '../utils/speechParser';
import ConfirmModal from '../components/ConfirmModal';

const S = {
  IDLE: 'idle',
  LISTEN_NAME: 'listen_name',
  FOUND: 'found',
  LISTEN_ACTION: 'listen_action',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function AdminPanel() {
  const [step, setStep] = useState(S.IDLE);
  const [customer, setCustomer] = useState(null);
  const [pending, setPending] = useState(null);
  const [heard, setHeard] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { isListening, startListening } = useSpeech();

  const onError = useCallback((msg) => {
    setErrorMsg(msg);
    setStep(S.ERROR);
  }, []);

  const onNameResult = useCallback(async (text) => {
    setHeard(`"${text}"`);
    try {
      const found = await findCustomerByName(text);
      if (found) {
        setCustomer(found);
        setStep(S.FOUND);
      } else {
        setErrorMsg(`Cliente "${text}" não encontrado. Tente novamente.`);
        setStep(S.ERROR);
      }
    } catch {
      setErrorMsg('Erro de conexão com o servidor. Verifique se ele está rodando.');
      setStep(S.ERROR);
    }
  }, []);

  const onActionResult = useCallback((text) => {
    setHeard(`"${text}"`);
    const parsed = parseVoiceCommand(text);
    if (parsed) {
      setPending(parsed);
      setStep(S.CONFIRMING);
    } else {
      setErrorMsg('Não entendi o comando. Diga "Comprou X reais" ou "Pagou X reais".');
      setStep(S.ERROR);
    }
  }, []);

  const startNameStep = () => {
    setStep(S.LISTEN_NAME);
    setHeard('');
    setErrorMsg('');
    setCustomer(null);
    setPending(null);
    startListening(onNameResult, onError);
  };

  const startActionStep = () => {
    setStep(S.LISTEN_ACTION);
    setHeard('');
    startListening(onActionResult, onError);
  };

  const handleConfirm = async () => {
    try {
      const ok = await addTransaction(customer.id, pending.type, pending.value);
      if (ok) {
        setStep(S.SUCCESS);
      } else {
        setErrorMsg('Erro ao salvar transação. Tente novamente.');
        setStep(S.ERROR);
      }
    } catch {
      setErrorMsg('Erro de conexão ao salvar. Verifique o servidor.');
      setStep(S.ERROR);
    }
  };

  const handleCancel = () => {
    setStep(S.FOUND);
    setPending(null);
    setHeard('');
  };

  const reset = () => {
    setStep(S.IDLE);
    setHeard('');
    setErrorMsg('');
    setCustomer(null);
    setPending(null);
  };

  return (
    <div className="admin-panel">
      <div className="admin-hero">
        <div className="admin-hero-icon">🎤</div>
        <h2>Painel do Administrador</h2>
        <p>Registre transações por comando de voz</p>
      </div>

      {/* Mic visual */}
      <div className="mic-area">
        <button
          className={`mic-ring ${isListening ? 'active' : ''} ${step === S.IDLE || step === S.FOUND ? 'clickable' : ''}`}
          onClick={step === S.IDLE ? startNameStep : step === S.FOUND ? startActionStep : undefined}
          disabled={step !== S.IDLE && step !== S.FOUND}
          aria-label="Ativar microfone"
        >
          <span className="mic-emoji">{isListening ? '🔴' : '🎙️'}</span>
        </button>
        {isListening && (
          <div className="wave-bars">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
        {heard && !isListening && (
          <div className="heard-bubble">💬 {heard}</div>
        )}
      </div>

      {/* Step content */}
      <div className="step-card">
        {step === S.IDLE && (
          <div className="step-body center">
            <p className="step-desc">
              Clique no botão abaixo, diga o nome do cliente e depois informe a transação.
            </p>
            <button className="btn-mic" onClick={startNameStep}>
              🎤 Ativar Microfone
            </button>
          </div>
        )}

        {step === S.LISTEN_NAME && (
          <div className="step-body center">
            <span className="step-badge">Passo 1 / 2</span>
            <p className="step-desc">Diga o <strong>nome do cliente</strong></p>
            <p className="step-hint">Ex: "Maria" ou "João Santos"</p>
          </div>
        )}

        {step === S.FOUND && customer && (
          <div className="step-body center">
            <div className="found-chip">
              ✅ <strong>{customer.name}</strong>
            </div>
            <div className="balance-chip">
              Saldo atual: <strong>{formatCurrency(customer.balance)}</strong>
            </div>
            <span className="step-badge">Passo 2 / 2</span>
            <p className="step-desc">O que ele fez?</p>
            <button className="btn-mic" onClick={startActionStep}>
              🎤 Dizer ação
            </button>
          </div>
        )}

        {step === S.LISTEN_ACTION && (
          <div className="step-body center">
            <div className="found-chip">✅ <strong>{customer?.name}</strong></div>
            <span className="step-badge">Passo 2 / 2</span>
            <p className="step-desc">Diga a <strong>ação e o valor</strong></p>
            <p className="step-hint">"Comprou 50 reais" · "Pagou cinquenta reais"</p>
          </div>
        )}

        {step === S.CONFIRMING && pending && customer && (
          <ConfirmModal
            customer={customer}
            pending={pending}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {step === S.SUCCESS && (
          <div className="step-body center">
            <span className="big-icon">🎉</span>
            <h3 className="success-title">Transação Registrada!</h3>
            <p className="step-desc">
              {pending?.type === 'compra' ? 'Compra' : 'Pagamento'} de{' '}
              <strong>{formatCurrency(pending?.value)}</strong> para{' '}
              <strong>{customer?.name}</strong> salvo com sucesso.
            </p>
            <button className="btn-secondary" onClick={reset}>
              + Nova Transação
            </button>
          </div>
        )}

        {step === S.ERROR && (
          <div className="step-body center">
            <span className="big-icon">⚠️</span>
            <p className="error-msg">{errorMsg}</p>
            <button className="btn-danger" onClick={reset}>
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
