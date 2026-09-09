import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Bike, 
  LogOut, 
  Calendar, 
  Map, 
  ClipboardList,
  ShieldCheck,
  User
} from 'lucide-react';
import { authService } from '../services/api';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: any;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'ruta', label: 'Ruta Diaria', icon: Map },
    { id: 'almanaque', label: 'Almanaque', icon: Calendar },
    { id: 'modalidades', label: 'Modalidades', icon: ClipboardList },
    { id: 'inversionistas', label: 'Inversionistas', icon: TrendingUp },
    { id: 'activos', label: 'Mis Activos', icon: Bike },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
  ];

  const handleLogout = () => {
    if (confirm('¿Deseas cerrar tu sesión actual?')) {
      if (onLogout) {
        onLogout();
      } else {
        authService.logout();
      }
    }
  };

  return (
    <div className="flex flex-col w-72 bg-slate-900 border-r border-slate-800 p-6 h-screen">
      {/* Brand */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <div>
          <span className="text-xl font-black text-white tracking-tight block">JD Inversiones</span>
          <span className="text-[11px] text-slate-400">Sistema de Control</span>
        </div>
      </div>

      {/* User Info Badge */}
      {user && (
        <div className="mb-6 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
            {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden flex-1">
            <span className="block text-xs font-bold text-white truncate">{user.name || 'Usuario'}</span>
            <span className="inline-flex items-center text-[10px] text-emerald-400 font-semibold">
              <ShieldCheck className="w-3 h-3 mr-0.5" />
              {user.role === 'ADMIN' ? 'Administrador' : 'Cobrador'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-slate-800 space-y-1">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3.5 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all cursor-pointer text-sm font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
