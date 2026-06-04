import { useState } from 'react';
import { registerCustomer } from '../data/db';
import { formatCPF } from '../utils/speechParser';

export default function ClientRegister({ onRegistered, onGoToLogin }) {
  const [name, setName] = useState('');
  const [cpf, setCPF] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerCustomer(name, cpf, password);
      if (result.error) {
        setError(result.error);
      } else {
        onRegistered(result.customer);
      }
    } catch {
      setError('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">📋</span>
          <h2>Criar Conta</h2>
          <p>Cadastre-se para consultar seus débitos</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reg-name">Nome completo</label>
            <input
              id="reg-name"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-cpf">CPF</label>
            <input
              id="reg-cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCPF(formatCPF(e.target.value))}
              maxLength={14}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-pwd">Senha</label>
            <input
              id="reg-pwd"
              type="password"
              placeholder="Mínimo 4 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-confirm">Confirmar senha</label>
            <input
              id="reg-confirm"
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-switch">
          Já tem conta?{' '}
          <button type="button" className="link-btn" onClick={onGoToLogin}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
