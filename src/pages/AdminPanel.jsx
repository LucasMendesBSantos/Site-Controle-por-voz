import { useState, useCallback, useEffect } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { findCustomerByName, addTransaction, getClothingTypes } from '../data/db';
import { parseFullCommand, formatCurrency } from '../utils/speechParser';
import ConfirmModal from '../components/ConfirmModal';

const S = {
  IDLE: 'idle',
  LISTENING: 'listening',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function AdminPanel({ onLogout }) {
  const [step, setStep] = useState(S.IDLE);
  const [pending, setPending] = useState(null); // { customer, type, value, item }
  const [heard, setHeard] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [clothingTypes, setClothingTypes] = useState([]);

  const { isListening, startListening } = useSpeech();

  useEffect(() => {
    getClothingTypes().then(setClothingTypes);
  }, []);

  useEffect(() => {
    if (step !== S.SUCCESS) return;
    const t = setTimeout(reset, 2000);
    return () => clearTimeout(t);
  }, [step]);

  const onError = useCallback((msg) => {
    setErrorMsg(msg);
    setStep(S.ERROR);
  }, []);

  const onResult = useCallback(async (text) => {
    setHeard(`"${text}"`);
    const parsed = parseFullCommand(text, clothingTypes);

    if (!parsed) {
      setErrorMsg(
        `Não entendi: "${text}". Tente: "Maria comprou uma blusa de 25 reais" ou "Maria pagou 50 reais".`
      );
      setStep(S.ERROR);
      return;
    }

    try {
      const customer = await findCustomerByName(parsed.name);
      if (!customer) {
        setErrorMsg(`Cliente "${parsed.name}" não encontrado. Verifique o nome e tente novamente.`);
        setStep(S.ERROR);
        return;
      }
      setPending({ customer, type: parsed.type, value: parsed.value, item: parsed.item });
      setStep(S.CONFIRMING);
    } catch {
      setErrorMsg('Erro de conexão com o servidor.');
      setStep(S.ERROR);
    }
  }, [clothingTypes]);

  const activate = () => {
    setStep(S.LISTENING);
    setHeard('');
    setErrorMsg('');
    setPending(null);
    startListening(onResult, onError);
  };

  const handleConfirm = async () => {
    try {
      const ok = await addTransaction(
        pending.customer.id,
        pending.type,
        pending.value,
        pending.item
      );
      if (ok) {
        setStep(S.SUCCESS);
      } else {
        setErrorMsg('Erro ao salvar transação. Tente novamente.');
        setStep(S.ERROR);
      }
    } catch {
      setErrorMsg('Erro de conexão ao salvar.');
      setStep(S.ERROR);
    }
  };

  const handleCancel = () => {
    setStep(S.IDLE);
    setPending(null);
    setHeard('');
  };

  const reset = () => {
    setStep(S.IDLE);
    setHeard('');
    setErrorMsg('');
    setPending(null);
  };

  return (
    <div className="admin-panel">
      <div className="admin-hero">
        <div className="admin-hero-icon">🎤</div>
        <h2>Painel do Administrador</h2>
        <p>Registre transações com uma única fala</p>
        {onLogout && (
          <button className="admin-logout-btn" onClick={onLogout}>🚪 Sair</button>
        )}
      </div>

      {/* Mic visual */}
      <div className="mic-area">
        <button
          className={`mic-ring ${isListening ? 'active' : ''} ${step === S.IDLE ? 'clickable' : ''}`}
          onClick={step === S.IDLE ? activate : undefined}
          disabled={step !== S.IDLE}
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
              Clique no microfone e diga o nome do cliente, o que comprou e o valor — tudo de uma vez.
            </p>
            <p className="step-hint">
              Ex: <em>"Maria comprou uma blusa de 25 reais"</em><br />
              Ex: <em>"João pagou 50 reais"</em>
            </p>
            <button className="btn-mic" onClick={activate}>
              🎤 Ativar Microfone
            </button>
          </div>
        )}

        {step === S.LISTENING && (
          <div className="step-body center">
            <p className="step-desc">Ouvindo… diga o nome, o item e o valor</p>
            <p className="step-hint">
              <em>"[nome] comprou um[a] [peça] de [valor] reais"</em><br />
              <em>"[nome] pagou [valor] reais"</em>
            </p>
          </div>
        )}

        {step === S.CONFIRMING && pending && (
          <ConfirmModal
            customer={pending.customer}
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
              <strong>{formatCurrency(pending?.value)}</strong>
              {pending?.item ? <> — <strong>{pending.item}</strong></> : null}
              {' '}para <strong>{pending?.customer?.name}</strong> salvo com sucesso.
            </p>
            <p className="step-hint">Voltando em instantes…</p>
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
