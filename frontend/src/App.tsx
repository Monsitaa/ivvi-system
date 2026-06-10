import { useState, useEffect } from 'react';
import type { Usuario } from './types';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Inventory from './pages/Inventory';
import Config from './pages/Config';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Envasado from './pages/Envasado';
import Ajustes from './pages/Ajustes';
import Kardex from './pages/Kardex';

export default function App() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true); // Default to gorgeous premium dark mode

  useEffect(() => {
    // Check initial auth status
    checkAuthStatus();
    
    // Set initial dark mode theme class
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/auth/status');
      const data = await res.json();
      if (res.ok && data.isAuthenticated) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error fetching auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: Usuario) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-ivvi-teal/30 border-t-ivvi-teal rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs tracking-wider uppercase animate-pulse">Sincronizando Sistema IVVI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-ivvi-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />

      {/* Main Page Area Wrapper */}
      <main className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-ivvi-dark relative">
        {/* Glow dots under pages (decorative) */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ivvi-teal/5 dark:bg-ivvi-teal/[0.03] rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-ivvi-amber/5 dark:bg-ivvi-amber/[0.02] rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* View Router */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'productos' && <Productos currentUser={user} />}
          {currentView === 'maestros' && <Catalog currentUser={user} initialTab="maestros" />}
          {currentView === 'proveedores' && <Proveedores currentUser={user} />}
          {currentView === 'clientes' && <Clientes currentUser={user} />}
          {currentView === 'compras' && <Compras currentUser={user} />}
          {currentView === 'ventas' && <Ventas currentUser={user} />}
          {currentView === 'envasado' && <Envasado currentUser={user} />}
          {currentView === 'inventario' && <Inventory currentUser={user} />}
          {currentView === 'ajustes' && <Ajustes currentUser={user} />}
          {currentView === 'kardex' && <Kardex />}
          {currentView === 'colaboradores' && <Catalog currentUser={user} initialTab="colaboradores" />}
          {currentView === 'config' && <Config />}
        </div>
      </main>
    </div>
  );
}
