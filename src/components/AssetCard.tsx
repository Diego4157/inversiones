import React from 'react';
import { distributeAssetRevenue } from '../lib/logic';
import { AlertCircle } from 'lucide-react';

interface AssetCardProps {
  assetName: string;
  dailyRevenue: number;
  onClick: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ assetName, dailyRevenue, onClick }) => {
  const dist = distributeAssetRevenue(dailyRevenue);

  const drawers = [
    { label: 'Deuda (Nequi)', value: dist.debt, color: 'bg-emerald-500' },
    { label: 'SOAT / Tecno', value: dist.soatTecno, color: 'bg-blue-500' },
    { label: 'Mantenimiento', value: dist.maintenance, color: 'bg-amber-500' },
    { label: 'Utilidad Neta', value: dist.profit, color: 'bg-indigo-500' },
  ];

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white">{assetName}</h3>
          <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mt-1">Ingreso Diario</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-emerald-400">${dailyRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-4">
        {drawers.map((drawer) => (
          <div key={drawer.label} className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
              <span>{drawer.label}</span>
              <span className="text-white">${drawer.value.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full ${drawer.color} shadow-lg`} 
                style={{ width: `${(drawer.value / dailyRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onClick}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer"
      >
        Registrar Renta Hoy
      </button>

      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-200">
          <strong>Proyección:</strong> Meta de SOAT en 12 días aprox.
        </p>
      </div>
    </div>
  );
};

export default AssetCard;
