import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  Edit2,
  CheckCircle2,
  XCircle,
  Coffee,
  Map
} from 'lucide-react';
import AssetCard from '../components/AssetCard';

interface DashboardViewProps {
  onNewClick: () => void;
  onPaymentClick: (client: any, status?: string) => void;
  onNavigateToRoute?: () => void;
  onAssetClick: () => void;
  onEditClient: (client: any) => void;
  customLoans?: any[]; // Lista de préstamos reales
  assets?: any[];      // Lista de activos reales
  todayReceipts?: any[]; // Recibos del día para reflejar estado real
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
  onNavigateToRoute,
  onAssetClick, 
  onEditClient, 
  customLoans = [], 
  assets = [],
  todayReceipts = [],
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-400 text-xs italic mt-0.5">Inversiones DMR • Resumen Ejecutivo</p>
        </div>
        <div className="flex space-x-2">
          {onNavigateToRoute && (
            <button 
              onClick={onNavigateToRoute}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all"
              title="Abrir Ruta Diaria y Arqueo"
            >
              <Map className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Ruta Diaria</span>
            </button>
          )}
          <button 
            onClick={onNewClick}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs md:text-sm flex items-center cursor-pointer transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Crédito
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <div key={stat.title} className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl shadow-xl hover:border-slate-600 transition-all">
            <div className={`mb-2 ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{stat.title}</p>
            <h3 className="text-lg md:text-xl font-black text-white mt-0.5">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          
          {/* Header de Ruta Hoy con Botón directo a Arqueo / Ruta Diaria */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-lg">
            <div>
              <h3 className="text-base md:text-lg font-black text-white flex items-center">
                <Clock className="mr-2 w-5 h-5 text-emerald-400" /> Ruta del Día y Cuadre Centralizado
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cobra cuotas, envía recibos oficiales por WhatsApp, imprime tirillas y cuadra la caja en un solo lugar.
              </p>
            </div>
            {onNavigateToRoute && (
              <button 
                onClick={onNavigateToRoute}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 active:scale-95 whitespace-nowrap"
              >
                <Map className="w-4 h-4" />
                <span>Ir a Ruta Diaria & Cuadre</span>
              </button>
            )}
          </div>

          {/* Tabla de Clientes en Ruta */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-750 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5 text-right">Saldo</th>
                    <th className="px-4 py-3.5 text-right">Cuota</th>
                    <th className="px-4 py-3.5 text-center">Estado Hoy</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {rutaHoy.length > 0 ? (
                    rutaHoy.map((row) => {
                      // Buscar si este cliente ya tiene recibo registrado para hoy
                      const todayReceipt = todayReceipts.find((r: any) => r.loanId === row.id);
                      const todayStatus = todayReceipt ? todayReceipt.status : 'PENDING';

                      return (
                        <tr key={row.id} className="hover:bg-slate-700/40 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{row.name}</span>
                              {row.client && (
                                <button 
                                  onClick={() => onEditClient(row.client)}
                                  className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                  title="Editar Cliente"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> 
                                </button>
                              )}
                            </div>
                            {row.client?.phone && (
                              <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                Tel: {row.client.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-200 font-semibold">{row.balance}</td>
                          <td className="px-4 py-3.5 text-right text-emerald-400 font-bold">{row.cuota}</td>
                          <td className="px-4 py-3.5 text-center">
                            {todayStatus === 'PAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Pagó
                              </span>
                            )}
                            {todayStatus === 'ATRASADO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                <XCircle className="w-3 h-3" /> Atraso
                              </span>
                            )}
                            {todayStatus === 'DOMINICAL' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                <Coffee className="w-3 h-3" /> Dominical
                              </span>
                            )}
                            {todayStatus === 'PENDING' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {onNavigateToRoute ? (
                              <button 
                                onClick={onNavigateToRoute}
                                className="px-3 py-1.5 bg-slate-700/80 hover:bg-blue-600 text-slate-300 hover:text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1"
                                title="Gestionar y cuadrar este cobro en la Ruta Diaria"
                              >
                                <Map className="w-3.5 h-3.5" />
                                <span>Ver en Ruta</span>
                              </button>
                            ) : todayStatus === 'PENDING' ? (
                              <button 
                                onClick={() => onPaymentClick(row, 'PAID')}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Cobrar
                              </button>
                            ) : (
                              <button 
                                onClick={() => onPaymentClick(row, todayStatus)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold text-xs cursor-pointer transition-all"
                              >
                                Modificar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500 italic">
                        No hay créditos activos hoy. Registra uno nuevo para empezar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Activos */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <ArrowUpRight className="mr-2 w-5 h-5 text-blue-400" /> Activos
          </h3>
          {assets.length > 0 ? (
            assets.map((asset) => (
              <AssetCard 
                key={asset.id}
                assetName={`${asset.name} (${asset.plate})`} 
                dailyRevenue={Number(asset.dailyTargetIncome || asset.dailyRentTarget || 35000)} 
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
