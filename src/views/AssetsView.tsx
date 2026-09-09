import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Home, 
  Package, 
  Plus, 
  Loader2, 
  DollarSign, 
  Shield, 
  Wrench, 
  AlertTriangle, 
  TrendingUp
} from 'lucide-react';
import { assetService } from '../services/api';

const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [drawers, setDrawers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'VEHICULO',
    identifier: '',
    purchasePrice: '',
    dailyTargetIncome: '35000',
    status: 'ACTIVO',
    debtPercent: '51.1',
    soatAmount: '2000',
    maintenanceAmount: '3000',
    contingencyAmount: '5000'
  });

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await assetService.getAll();
      setAssets(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedAsset) {
        setSelectedAsset(data[0]);
      } else if (selectedAsset) {
        const found = data.find((a: any) => a.id === selectedAsset.id);
        setSelectedAsset(found || data[0] || null);
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
      setDrawers(Array.isArray(statusData) ? statusData : []);
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
        category: formData.category,
        identifier: formData.identifier,
        plate: formData.identifier,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        dailyTargetIncome: Number(formData.dailyTargetIncome),
        status: formData.status,
        debtPercent: Number(formData.debtPercent),
        soatAmount: Number(formData.soatAmount),
        maintenanceAmount: Number(formData.maintenanceAmount),
        contingencyAmount: Number(formData.contingencyAmount)
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        category: 'VEHICULO',
        identifier: '',
        purchasePrice: '',
        dailyTargetIncome: '35000',
        status: 'ACTIVO',
        debtPercent: '51.1',
        soatAmount: '2000',
        maintenanceAmount: '3000',
        contingencyAmount: '5000'
      });
      await loadAssets();
      setSelectedAsset(newAsset);
    } catch (error: any) {
      alert(error.message || 'Error al registrar activo');
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
      alert('Ingreso registrado y distribuido según las reglas del activo.');
    } catch (error: any) {
      alert(error.message || 'Error al registrar ingreso');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'INMUEBLE': return <Home className="w-5 h-5 text-purple-400" />;
      case 'OTRO': return <Package className="w-5 h-5 text-amber-400" />;
      case 'VEHICULO':
      default: return <Bike className="w-5 h-5 text-blue-400" />;
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

  const getDrawerName = (type: string, category: string = 'VEHICULO') => {
    if (category === 'INMUEBLE') {
      switch (type) {
        case 'DEBT': return 'Crédito Hipotecario / Deuda';
        case 'SOAT_TECNO': return 'Predial y Seguros Inmueble';
        case 'MAINTENANCE': return 'Mantenimiento y Reparaciones';
        case 'CONTINGENCY': return 'Imprevistos y Fondo Vacancia';
        case 'PROFIT': return 'Renta Neta Inmobiliaria';
        default: return type;
      }
    }

    switch (type) {
      case 'DEBT': return 'Deuda / Financiación (51%)';
      case 'SOAT_TECNO': return 'SOAT y Tecno (Seguros)';
      case 'MAINTENANCE': return 'Mantenimiento Activo';
      case 'CONTINGENCY': return 'Contingencias / Multas';
      case 'PROFIT': return 'Ganancia Neta Socios';
      default: return type;
    }
  };

  const filteredAssets = assets.filter(a => {
    if (categoryFilter === 'ALL') return true;
    return a.category === categoryFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Bike className="mr-3 text-blue-400" /> Control de Mis Activos
          </h1>
          <p className="text-slate-400 mt-1">Supervisa motos (Boxer CT 100), otros vehículos e inmuebles con sus cajones parametrizados</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg flex items-center transition-all cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Registrar Activo
        </button>
      </div>

      {/* Categorías Filter */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        {['ALL', 'VEHICULO', 'INMUEBLE', 'OTRO'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'Todos los Activos' : cat === 'VEHICULO' ? 'Motos y Vehículos' : cat === 'INMUEBLE' ? 'Inmuebles / Bienes Raíces' : 'Otros Activos'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listado de Activos */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-white">Inventario de Activos</h3>
          {filteredAssets.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-500">
              No hay activos registrados en esta categoría.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    selectedAsset?.id === asset.id
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="block font-bold text-white">{asset.name}</span>
                    <span className="text-xs text-slate-500">
                      ID/Placa: {asset.identifier || asset.plate || 'N/A'} • {asset.category}
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        asset.status === 'ACTIVO' ? 'bg-emerald-500/20 text-emerald-400' :
                        asset.status === 'MANTENIMIENTO' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {asset.status || 'ACTIVO'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl">
                    {getCategoryIcon(asset.category)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Estado y Cajones de Ahorro */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAsset ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-white">{selectedAsset.name}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {selectedAsset.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Meta Renta Diaria: <strong className="text-emerald-400">${Number(selectedAsset.dailyTargetIncome || selectedAsset.dailyRentTarget || 35000).toLocaleString()} COP</strong>
                    {selectedAsset.identifier && ` • Identificador / Placa: ${selectedAsset.identifier}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowRevenueModal(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer text-sm"
                >
                  Registrar Ingreso de Renta
                </button>
              </div>

              {/* Reglas de Distribución Parametrizadas */}
              <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Parámetros de Ahorro Configurables:</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Deuda / Cuota:</span>
                    <span className="text-white font-bold">{selectedAsset.debtPercent || 51.1}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Seguros/Impuestos:</span>
                    <span className="text-white font-bold">${Number(selectedAsset.soatAmount || 2000).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mantenimiento:</span>
                    <span className="text-white font-bold">${Number(selectedAsset.maintenanceAmount || 3000).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Imprevistos:</span>
                    <span className="text-white font-bold">${Number(selectedAsset.contingencyAmount || 5000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Cajones */}
              <div>
                <h3 className="text-lg font-bold text-slate-300 mb-4">Cajones de Ahorro y Distribución</h3>
                {drawers.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    No se han registrado ingresos para este activo todavía. Registra el primero arriba.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drawers.map(drawer => (
                      <div key={drawer.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center space-x-4">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          {getDrawerIcon(drawer.type)}
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {getDrawerName(drawer.type, selectedAsset.category)}
                          </span>
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
              Selecciona un activo para consultar sus cajones.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear Activo Generalizado */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-100">
            <h3 className="text-xl font-bold text-white mb-6">Registrar Nuevo Activo</h3>
            <form className="space-y-4" onSubmit={handleCreateAsset}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Categoría de Activo</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                  >
                    <option value="VEHICULO">Vehículo (Moto / Carro)</option>
                    <option value="INMUEBLE">Inmueble (Apartamento / Local)</option>
                    <option value="OTRO">Otro Activo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Estado Inicial</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                  >
                    <option value="ACTIVO">Activo y Operativo</option>
                    <option value="MANTENIMIENTO">En Mantenimiento</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre / Descripción del Activo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder={formData.category === 'VEHICULO' ? 'Ej: Boxer CT 100 2024' : 'Ej: Apto 302 Edificio Central'} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    {formData.category === 'VEHICULO' ? 'Placa del Vehículo' : 'Matrícula / Identificador'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.identifier} 
                    onChange={(e) => setFormData({...formData, identifier: e.target.value})} 
                    placeholder={formData.category === 'VEHICULO' ? 'Ej: ABC-12D' : 'Ej: MAT-500123'} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Meta Ingreso Diario ($)</label>
                  <input 
                    type="number" 
                    value={formData.dailyTargetIncome} 
                    onChange={(e) => setFormData({...formData, dailyTargetIncome: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm font-bold" 
                    required 
                  />
                </div>
              </div>

              {/* Cajones Parametrizables */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Distribución de Cajones de Ahorro:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block">% Deuda / Hipoteca</label>
                    <input 
                      type="number" 
                      value={formData.debtPercent} 
                      onChange={(e) => setFormData({...formData, debtPercent: e.target.value})}
                      step="0.1" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">$ Seguros / Impuestos</label>
                    <input 
                      type="number" 
                      value={formData.soatAmount} 
                      onChange={(e) => setFormData({...formData, soatAmount: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">$ Mantenimiento</label>
                    <input 
                      type="number" 
                      value={formData.maintenanceAmount} 
                      onChange={(e) => setFormData({...formData, maintenanceAmount: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">$ Contingencia / Vacancia</label>
                    <input 
                      type="number" 
                      value={formData.contingencyAmount} 
                      onChange={(e) => setFormData({...formData, contingencyAmount: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl flex justify-center text-sm cursor-pointer shadow-lg shadow-emerald-500/20">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Ingreso */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Registrar Ingreso de Renta</h3>
            <p className="text-xs text-slate-400 mb-6">Activo: <strong className="text-white">{selectedAsset?.name}</strong></p>

            <form className="space-y-4" onSubmit={handleRecordRevenue}>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Monto de Renta Recibido ($)</label>
                <input 
                  type="number" 
                  value={revenueAmount} 
                  onChange={(e) => setRevenueAmount(e.target.value)} 
                  placeholder="Ej: 35000" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white text-xl font-bold focus:outline-none focus:border-emerald-500" 
                  required 
                  autoFocus 
                />
              </div>

              <p className="text-xs text-slate-400">
                Este valor se distribuirá automáticamente en los 5 cajones según la configuración parametrizada de este activo.
              </p>

              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowRevenueModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex justify-center text-sm cursor-pointer shadow-lg shadow-emerald-500/20">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Registrar Distribución'}
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
