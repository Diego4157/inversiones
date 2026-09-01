import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  FileText,
  Plus,
  ArrowUpRight,
  Clock,
  Edit2
} from 'lucide-react';
import AssetCard from '../components/AssetCard';

interface DashboardViewProps {
  onNewClick: () => void;
  onPaymentClick: (client: any) => void;
  onAssetClick: () => void;
  onEditClient: (client: any) => void;
  customLoans?: any[]; // Lista de préstamos reales
  assets?: any[];      // Lista de activos reales
  stats?: {
    carteraTotal: number;
    recaudoHoy: number;
    enMora: number;
    sociosCount: number;
  };
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNewClick, 
  onPaymentClick, 
  onAssetClick, 
  onEditClient, 
  customLoans = [], 
  assets = [],
  stats = { carteraTotal: 0, recaudoHoy: 0, enMora: 0, sociosCount: 0 }
}) => {
  const rutaHoy = customLoans;

  const statItems = [
    { title: 'Cartera Total', value: `$${stats.carteraTotal.toLocaleString()}`, icon: Wallet, color: 'text-emerald-400' },
    { title: 'Recaudo Hoy', value: `$${stats.recaudoHoy.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-400' },
    { title: 'En Mora', value: `$${stats.enMora.toLocaleString()}`, icon: AlertCircle, color: 'text-red-400' },
    { title: 'Socios', value: `${stats.sociosCount} Activos`, icon: ArrowUpRight, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-300 text-sm italic">JD Inversiones</p>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 bg-slate-700 text-white rounded-lg cursor-pointer"><FileText className="w-5 h-5" /></button>
          <button 
            onClick={onNewClick}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold flex items-center cursor-pointer"
          >
            <Plus className="w-5 h-5 mr-1" /> Nuevo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <div key={stat.title} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg">
            <div className={`mb-1 ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">{stat.title}</p>
            <h3 className="text-lg font-bold text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center"><Clock className="mr-2 w-5 h-5 text-emerald-400" /> Ruta Hoy</h3>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-700 text-slate-300 font-bold uppercase text-[10px]">
                <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {rutaHoy.length > 0 ? (
                  rutaHoy.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-700/30 transition-all">
                      <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                        {row.name}
                        {row.client && (
                          <button 
                            onClick={() => onEditClient(row.client)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Editar Cliente"
                          >
                            <Edit2 className="w-4 h-4" /> 
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-200">{row.balance}</td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => onPaymentClick(row)}
                          className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-500 italic">No hay créditos activos hoy. Registra uno nuevo para empezar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center"><ArrowUpRight className="mr-2 w-5 h-5 text-blue-400" /> Activos</h3>
          {assets.length > 0 ? (
            assets.map((asset) => (
              <AssetCard 
                key={asset.id}
                assetName={`${asset.name} (${asset.plate})`} 
                dailyRevenue={Number(asset.dailyRentTarget || 35000)} 
                onClick={onAssetClick} 
              />
            ))
          ) : (
            <AssetCard 
              assetName="Boxer CT 100" 
              dailyRevenue={35000} 
              onClick={onAssetClick} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
