import { useState } from 'react';
import { formatCPF } from '../utils/speechParser';

const STEP = { IDENTIFY: 'identify', NEW_PASSWORD: 'new_password', SUCCESS: 'success' };

export default function ClientResetPassword({ onGoToLogin }) {
  const [step, setStep] = useState(STEP.IDENTIFY);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIdentify = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Digite o nome completo.'); return; }
    if (cpf.replace(/\D/g, '').length !== 11) { setError('CPF inválido.'); return; }
    setStep(STEP.NEW_PASSWORD);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 4) { setError('A senha deve ter pelo menos 4 caracteres.'); return; }

    setLoading(true);
    try {
      const r = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), cpf, newPassword: password }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setStep(STEP.SUCCESS);
      } else {
        setError(data.error || 'Erro ao redefinir senha.');
        setStep(STEP.IDENTIFY);
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">

        {/* ── Passo 1: identificação ── */}
        {step === STEP.IDENTIFY && (
          <>
            <div className="login-header">
              <span className="login-icon">🔑</span>
              <h2>Recuperar Senha</h2>
              <p>Informe seu nome completo e CPF para continuar</p>
            </div>
            <form className="login-form" onSubmit={handleIdentify}>
              <div className="field">
                <label htmlFor="reset-name">Nome completo</label>
                <input
                  id="reset-name"
                  type="text"
                  placeholder="Exatamente como foi cadastrado"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="reset-cpf">CPF</label>
                <input
                  id="reset-cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  required
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="btn-login">Verificar identidade</button>
            </form>
          </>
        )}

        {/* ── Passo 2: nova senha ── */}
        {step === STEP.NEW_PASSWORD && (
          <>
            <div className="login-header">
              <span className="login-icon">🔒</span>
              <h2>Nova Senha</h2>
              <p>Identidade verificada. Escolha uma nova senha.</p>
            </div>
            <form className="login-form" onSubmit={handleReset}>
              <div className="field">
                <label htmlFor="new-pwd">Nova senha</label>
                <input
                  id="new-pwd"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="new-pwd-confirm">Confirmar senha</label>
                <input
                  id="new-pwd-confirm"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
              <button
                type="button"
                className="btn-login"
                style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1.5px solid var(--border)', marginTop: '-.25rem' }}
                onClick={() => { setStep(STEP.IDENTIFY); setError(''); }}
              >
                ← Voltar
              </button>
            </form>
          </>
        )}

        {/* ── Sucesso ── */}
        {step === STEP.SUCCESS && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>✅</div>
            <h2 style={{ margin: '0 0 .5rem' }}>Senha atualizada!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Sua senha foi redefinida com sucesso.
            </p>
            <button className="btn-login" onClick={onGoToLogin}>Ir para o login</button>
          </div>
        )}

        {step !== STEP.SUCCESS && (
          <div className="auth-switch">
            Lembrou a senha?{' '}
            <button type="button" className="link-btn" onClick={onGoToLogin}>
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
