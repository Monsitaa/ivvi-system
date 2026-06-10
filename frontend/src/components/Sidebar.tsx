import { 
  LayoutDashboard, 
  Boxes,
  Tag,
  Truck,
  Users,
  ShoppingBag,
  Receipt, 
  Factory,
  Layers, 
  Users2,
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  UserCircle,
  Settings2,
  History
} from 'lucide-react';
import type { Usuario } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: Usuario | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  user,
  darkMode,
  onToggleDarkMode,
  onLogout,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard Maestro', icon: LayoutDashboard, roles: ['Administrador', 'Vendedor', 'Operador de Almacén', 'Gerencia'] },
    
    // Gestión de Maestros
    { id: 'productos', name: 'Catálogo General', icon: Boxes, roles: ['Administrador', 'Operador de Almacén', 'Vendedor', 'Gerencia'], section: 'Gestión de Maestros' },
    { id: 'maestros', name: 'Categorías y Unidades', icon: Tag, roles: ['Administrador'] },
    { id: 'proveedores', name: 'Proveedores', icon: Truck, roles: ['Administrador', 'Operador de Almacén'] },
    { id: 'clientes', name: 'Cartera Clientes', icon: Users, roles: ['Administrador', 'Vendedor'] },
    
    // Logística / Ventas
    { id: 'compras', name: 'Entradas (Compras)', icon: ShoppingBag, roles: ['Administrador', 'Operador de Almacén'], section: 'Logística / Ventas' },
    { id: 'ventas', name: 'Salidas (Ventas)', icon: Receipt, roles: ['Administrador', 'Vendedor'] },
    
    // Planta y Producción
    { id: 'envasado', name: 'Orden de Envasado', icon: Factory, roles: ['Administrador', 'Operador de Almacén', 'Gerencia'], section: 'Planta y Producción' },
    { id: 'inventario', name: 'Inventario Real', icon: Layers, roles: ['Administrador', 'Operador de Almacén', 'Gerencia'] },
    { id: 'ajustes', name: 'Ajustes / Envases', icon: Settings2, roles: ['Administrador', 'Operador de Almacén'] },
    { id: 'kardex', name: 'Kardex Auditor', icon: History, roles: ['Administrador', 'Operador de Almacén', 'Gerencia'] },
    
    // Auditoría & Soporte
    { id: 'colaboradores', name: 'Personal y Accesos', icon: Users2, roles: ['Administrador'], section: 'Auditoría & Soporte' },
    { id: 'config', name: 'Config de Planta', icon: Settings, roles: ['Administrador'] }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.rol);
  });

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-gradient-to-b from-ivvi-teal-dark to-slate-900 border-r border-white/5 text-white">
      {/* Header Brand */}
      <div className="p-4 border-b border-white/10 flex justify-center bg-slate-900/50">
        <img src="/logo_transparent.png" alt="Inversiones IVVI S.A." className="h-20 w-auto object-contain" />
      </div>
      {/* Menu Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <div key={item.id}>
              {item.section && (
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400/80 px-4 mt-4 mb-2">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group cursor-pointer ${
                  isActive 
                    ? 'bg-ivvi-teal text-white shadow-lg shadow-ivvi-teal/20 border border-white/10' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon 
                  size={18} 
                  className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-ivvi-amber' : 'text-slate-400 group-hover:text-ivvi-teal-light'}`} 
                />
                <span>{item.name}</span>
              </button>
            </div>
          );
        })}
      </nav>


      {/* User Session Info & Controls */}
      <div className="p-4 border-t border-white/10 space-y-4 bg-black/20">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <UserCircle size={36} className="text-ivvi-teal-light shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user.nombre}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user.rol}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-300 hover:text-white"
            title="Cambiar Tema"
          >
            {darkMode ? <Sun size={14} className="text-ivvi-amber" /> : <Moon size={14} />}
            <span>{darkMode ? 'Claro' : 'Oscuro'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer text-red-400 hover:text-red-300"
            title="Cerrar Sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
