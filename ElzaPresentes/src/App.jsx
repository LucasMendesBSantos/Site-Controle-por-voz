import { useState } from 'react';
import AdminPanel from './pages/AdminPanel';
import ClientLogin from './pages/ClientLogin';
import ClientRegister from './pages/ClientRegister';
import ClientDashboard from './pages/ClientDashboard';
import DevPanel from './pages/DevPanel';
import './App.css';

const VIEW = { ADMIN: 'admin', CLIENT: 'client', DEV: 'dev' };
const CVIEW = { LOGIN: 'login', REGISTER: 'register' };

export default function App() {
  const [view, setView] = useState(VIEW.ADMIN);
  const [clientView, setClientView] = useState(CVIEW.LOGIN);
  const [customer, setCustomer] = useState(null);

  const switchToClient = () => {
    setView(VIEW.CLIENT);
    setClientView(CVIEW.LOGIN);
    setCustomer(null);
  };

  const handleLogout = () => {
    setCustomer(null);
    setClientView(CVIEW.LOGIN);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">💎</span>
          <span className="brand-name">Elza Presentes</span>
        </div>
        <nav className="tab-nav">
          <button
            className={`tab ${view === VIEW.ADMIN ? 'active' : ''}`}
            onClick={() => setView(VIEW.ADMIN)}
          >
            🎤 Painel Admin
          </button>
          <button
            className={`tab ${view === VIEW.CLIENT ? 'active' : ''}`}
            onClick={switchToClient}
          >
            👤 Área do Cliente
          </button>
          <button
            className={`tab tab-dev ${view === VIEW.DEV ? 'active-dev' : ''}`}
            onClick={() => setView(VIEW.DEV)}
          >
            🛠️ Dev
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === VIEW.ADMIN && <AdminPanel />}

        {view === VIEW.CLIENT && (
          customer ? (
            <ClientDashboard customerId={customer.id} onLogout={handleLogout} />
          ) : clientView === CVIEW.LOGIN ? (
            <ClientLogin
              onLogin={setCustomer}
              onGoToRegister={() => setClientView(CVIEW.REGISTER)}
            />
          ) : (
            <ClientRegister
              onRegistered={setCustomer}
              onGoToLogin={() => setClientView(CVIEW.LOGIN)}
            />
          )
        )}

        {view === VIEW.DEV && <DevPanel />}
      </main>

      <footer className="app-footer">
        © 2025 Elza Presentes · Sistema de Gestão de Débitos
      </footer>
    </div>
  );
}
