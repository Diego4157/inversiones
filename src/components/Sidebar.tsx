import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Bike, 
  Settings,
  LogOut,
  Calendar,
  Map,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'ruta', label: 'Ruta Diaria', icon: Map },
    { id: 'almanaque', label: 'Almanaque', icon: Calendar },
    { id: 'modalidades', label: 'Modalidades', icon: ClipboardList },
    { id: 'inversionistas', label: 'Inversionistas', icon: TrendingUp },
    { id: 'activos', label: 'Mis Activos', icon: Bike },
  ];

  return (
    <div className="flex flex-col w-72 bg-slate-900 border-r border-slate-800 p-8 h-screen">
      <div className="flex items-center space-x-3 mb-12">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">JD Inversiones</span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-8 border-t border-slate-800">
        <button className="w-full flex items-center space-x-4 px-5 py-4 text-slate-400 hover:text-white">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Ajustes</span>
        </button>
        <button className="w-full flex items-center space-x-4 px-5 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
