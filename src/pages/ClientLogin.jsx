import { useState } from 'react';
import { loginCustomer } from '../data/db';
import { formatCPF } from '../utils/speechParser';

export default function ClientLogin({ onLogin, onGoToRegister }) {
  const [cpf, setCPF] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginCustomer(cpf, password);
      if (result?.error) {
        setError(result.error);
      } else if (result) {
        onLogin(result);
      } else {
        setError('CPF ou senha incorretos. Verifique e tente novamente.');
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
          <span className="login-icon">🔐</span>
          <h2>Área do Cliente</h2>
          <p>Consulte seu histórico e situação de débito</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
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
            <label htmlFor="pwd">Senha</label>
            <input
              id="pwd"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-switch">
          Não tem conta?{' '}
          <button type="button" className="link-btn" onClick={onGoToRegister}>
            Cadastrar-se
          </button>
        </div>

        <details className="test-hint">
          <summary>Dados de teste (demonstração)</summary>
          <table>
            <thead>
              <tr><th>Nome</th><th>CPF</th><th>Senha</th></tr>
            </thead>
            <tbody>
              <tr><td>Maria Silva</td><td>123.456.789-00</td><td>123456</td></tr>
              <tr><td>João Santos</td><td>987.654.321-00</td><td>654321</td></tr>
              <tr><td>Ana Oliveira</td><td>456.789.123-00</td><td>112233</td></tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}
