import React, { useState, useEffect } from 'react';
import { Bike, Plus, Loader2, DollarSign, Shield, Wrench, AlertTriangle, TrendingUp } from 'lucide-react';
import { assetService } from '../services/api';

const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    plate: '',
    purchasePrice: '',
    dailyRentTarget: '35000'
  });

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await assetService.getAll();
      setAssets(data);
      if (data.length > 0 && !selectedAsset) {
        setSelectedAsset(data[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssetStatus = async (assetId: number) => {
    try {
      const statusData = await assetService.getStatus(assetId);
      setDrawers(statusData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadAssetStatus(selectedAsset.id);
    }
  }, [selectedAsset]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newAsset = await assetService.create({
        name: formData.name,
        plate: formData.plate,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        dailyRentTarget: Number(formData.dailyRentTarget)
      });
      setShowAddModal(false);
      setFormData({ name: '', plate: '', purchasePrice: '', dailyRentTarget: '35000' });
      loadAssets();
      setSelectedAsset(newAsset);
    } catch (error) {
      alert('Error al registrar activo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsLoading(true);
    try {
      await assetService.registerRevenue(selectedAsset.id, Number(revenueAmount));
      setShowRevenueModal(false);
      setRevenueAmount('');
      loadAssetStatus(selectedAsset.id);
      alert('Ingreso registrado y distribuido correctamente en los cajones de ahorro.');
    } catch (error) {
      alert('Error al registrar ingreso');
    } finally {
      setIsLoading(false);
    }
  };

  const getDrawerIcon = (type: string) => {
    switch (type) {
      case 'DEBT': return <DollarSign className="text-red-400 w-5 h-5" />;
      case 'SOAT_TECNO': return <Shield className="text-blue-400 w-5 h-5" />;
      case 'MAINTENANCE': return <Wrench className="text-amber-400 w-5 h-5" />;
      case 'CONTINGENCY': return <AlertTriangle className="text-orange-400 w-5 h-5" />;
      case 'PROFIT': return <TrendingUp className="text-emerald-400 w-5 h-5" />;
      default: return <DollarSign className="text-white w-5 h-5" />;
    }
  };

  const getDrawerName = (type: string) => {
    switch (type) {
      case 'DEBT': return 'Deuda / Financiación (51%)';
      case 'SOAT_TECNO': return 'SOAT y Tecno (Ahorro Fijo)';
      case 'MAINTENANCE': return 'Mantenimiento Boxer';
      case 'CONTINGENCY': return 'Contingencias / Multas';
      case 'PROFIT': return 'Ganancia Neta Socios';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Bike className="mr-3 text-blue-400" /> Control de Activos (Motos)
          </h1>
          <p className="text-slate-400 mt-1">Supervisa los ingresos diarios del Boxer y la distribución de cajones de ahorro</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg flex items-center transition-all"
        >
          <Plus className="w-5 h-5 mr-1" /> Registrar Moto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Motos List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-white">Listado de Motos</h3>
          {assets.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-500">
              No hay motos registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedAsset?.id === asset.id
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="block font-bold text-white">{asset.name}</span>
                    <span className="text-xs text-slate-500">Placa: {asset.plate || 'N/A'}</span>
                  </div>
                  <Bike className="w-5 h-5 text-slate-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drawers status */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAsset ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedAsset.name}</h2>
                  <p className="text-sm text-slate-400">Meta Renta Diaria: ${Number(selectedAsset.dailyRentTarget).toLocaleString()} COP</p>
                </div>
                <button
                  onClick={() => setShowRevenueModal(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Registrar Ingreso de Renta
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-300 mb-4">Cajones de Ahorro y Distribución</h3>
                {drawers.length === 0 ? (
                  <div className="text-slate-500 text-center py-6">
                    No se han registrado ingresos de renta para esta moto. Registra el primero arriba.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drawers.map(drawer => (
                      <div key={drawer.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center space-x-4">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          {getDrawerIcon(drawer.type)}
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{getDrawerName(drawer.type)}</span>
                          <span className="text-xl font-bold text-white">${Number(drawer.balance).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
              Selecciona una moto para ver su estado.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear Moto */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Registrar Activo</h3>
            <form className="space-y-4" onSubmit={handleCreateAsset}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre Activo / Vehículo</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Boxer CT 100 2024" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Placa del vehículo</label>
                <input type="text" value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value})} placeholder="Ej: XYZ-123" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Precio Compra</label>
                  <input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} placeholder="Opcional" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Meta Renta Diaria</label>
                  <input type="number" value={formData.dailyRentTarget} onChange={(e) => setFormData({...formData, dailyRentTarget: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex justify-center">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Ingreso */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Registrar Renta</h3>
            <form className="space-y-4" onSubmit={handleRecordRevenue}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto de Renta Recibido ($)</label>
                <input type="number" value={revenueAmount} onChange={(e) => setRevenueAmount(e.target.value)} placeholder="Ej: 35000" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-xl font-bold" required />
              </div>
              <p className="text-xs text-slate-400">Este valor se distribuirá automáticamente: 51% a la Deuda de financiación, $2,000 a SOAT, $3,000 a mantenimiento, $5,000 a contingencia y el restante a ganancias.</p>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowRevenueModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex justify-center">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsView;
