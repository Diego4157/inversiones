import React, { useState, useEffect } from 'react';
import { TrendingUp, UserPlus, DollarSign, ArrowUpRight, ArrowDownRight, Award, Loader2, Calendar, Percent, Edit2 } from 'lucide-react';
import { investorService } from '../services/api';

const InversionistasView: React.FC = () => {
  const [investors, setInvestors] = useState<any[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  
  const [investorForm, setInvestorForm] = useState({
    fullName: '',
    initialCapital: '',
    profitRate: '10', // 10% por defecto
    paymentFrequency: 'MONTHLY',
    nextPayoutDate: ''
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    profitRate: '0',
    paymentFrequency: 'MONTHLY',
    nextPayoutDate: ''
  });

  const [txForm, setTxForm] = useState({
    amount: '',
    type: 'CONTRIBUTION' // CONTRIBUTION, WITHDRAWAL, PROFIT_SHARE
  });

  const loadInvestors = async () => {
    setIsLoading(true);
    try {
      const data = await investorService.getAll();
      setInvestors(data);
      if (data.length > 0) {
        if (selectedInvestor) {
          const updated = data.find((i: any) => i.id === selectedInvestor.id);
          setSelectedInvestor(updated || data[0]);
        } else {
          setSelectedInvestor(data[0]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvestors();
  }, []);

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newInvestor = await investorService.create({
        fullName: investorForm.fullName,
        initialCapital: investorForm.initialCapital ? Number(investorForm.initialCapital) : 0,
        profitRate: Number(investorForm.profitRate),
        paymentFrequency: investorForm.paymentFrequency,
        nextPayoutDate: investorForm.nextPayoutDate || null
      });
      setShowAddModal(false);
      setInvestorForm({ fullName: '', initialCapital: '', profitRate: '10', paymentFrequency: 'MONTHLY', nextPayoutDate: '' });
      await loadInvestors();
      setSelectedInvestor(newInvestor);
      alert('Inversionista registrado correctamente.');
    } catch (error: any) {
      alert(error.message || 'Error al registrar inversionista');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor) return;
    setIsLoading(true);
    try {
      await investorService.update(selectedInvestor.id, {
        fullName: editForm.fullName,
        profitRate: Number(editForm.profitRate),
        paymentFrequency: editForm.paymentFrequency,
        nextPayoutDate: editForm.nextPayoutDate || null
      });
      setShowEditModal(false);
      await loadInvestors();
      alert('Inversionista actualizado correctamente.');
    } catch (error: any) {
      alert(error.message || 'Error al actualizar inversionista');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor) return;
    setIsLoading(true);
    try {
      await investorService.addTransaction({
        investorId: selectedInvestor.id,
        amount: Number(txForm.amount),
        type: txForm.type
      });
      setShowTxModal(false);
      setTxForm({ amount: '', type: 'CONTRIBUTION' });
      await loadInvestors();
      alert('Transacción registrada con éxito.');
    } catch (error: any) {
      alert(error.message || 'Error al registrar transacción');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = () => {
    if (!selectedInvestor) return;
    setEditForm({
      fullName: selectedInvestor.fullName,
      profitRate: selectedInvestor.profitRate ? String(selectedInvestor.profitRate) : '0',
      paymentFrequency: selectedInvestor.paymentFrequency || 'MONTHLY',
      nextPayoutDate: selectedInvestor.nextPayoutDate ? selectedInvestor.nextPayoutDate.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const totalCapitalGlobal = investors.reduce((sum, inv) => sum + Number(inv.totalCapital), 0);

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION': return 'Aporte';
      case 'WITHDRAWAL': return 'Retiro';
      case 'PROFIT_SHARE': return 'Reparto de Utilidades';
      default: return type;
    }
  };

  const getTxTypeColor = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION': return 'text-emerald-400 bg-emerald-500/10';
      case 'WITHDRAWAL': return 'text-red-400 bg-red-500/10';
      case 'PROFIT_SHARE': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getTxTypeIcon = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION': return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
      case 'WITHDRAWAL': return <ArrowDownRight className="w-4 h-4 text-red-400" />;
      case 'PROFIT_SHARE': return <Award className="w-4 h-4 text-blue-400" />;
      default: return <DollarSign className="w-4 h-4 text-slate-400" />;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'WEEKLY': return 'Semanal';
      case 'BIWEEKLY': return 'Quincenal';
      case 'MONTHLY': return 'Mensual';
      default: return freq;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <TrendingUp className="mr-3 text-emerald-400" /> Control de Inversionistas
          </h1>
          <p className="text-slate-400 mt-1">Administra el capital de los socios, márgenes de ganancia asignados y fechas de pago</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg flex items-center transition-all shrink-0 self-start"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Agregar Socio
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center space-x-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <span className="block text-slate-500 text-sm">Capital Total en Caja</span>
            <span className="text-3xl font-black text-white">${totalCapitalGlobal.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center space-x-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <span className="block text-slate-500 text-sm">Socios Activos</span>
            <span className="text-3xl font-black text-white">{investors.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Socios List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-white">Socios Inversionistas</h3>
          {investors.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-500">
              No hay socios registrados.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {investors.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvestor(inv)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-2 ${
                    selectedInvestor?.id === inv.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="block font-bold text-white text-left">{inv.fullName}</span>
                      <span className="text-xs text-slate-500">Socio #{inv.id}</span>
                    </div>
                    <span className="font-bold text-sm text-white">${Number(inv.totalCapital).toLocaleString()}</span>
                  </div>
                  {inv.profitRate > 0 && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Percent className="w-3.5 h-3.5 text-blue-400" />
                      <span>{inv.profitRate}% {getFrequencyLabel(inv.paymentFrequency)}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Socio Details & Transactions */}
        <div className="lg:col-span-2 space-y-4">
          {selectedInvestor ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-white">{selectedInvestor.fullName}</h2>
                    <button 
                      onClick={openEditModal}
                      className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white rounded-lg transition-all"
                      title="Editar Configuración de Ganancias"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">Capital Aportado: <strong className="text-emerald-400">${Number(selectedInvestor.totalCapital).toLocaleString()} COP</strong></p>
                </div>
                <button
                  onClick={() => setShowTxModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Registrar Movimiento
                </button>
              </div>

              {/* Profit Settings Summary Widget */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-500 mb-1">Márgen de Ganancia Asignado</span>
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span>{selectedInvestor.profitRate || 0}% de interés {getFrequencyLabel(selectedInvestor.paymentFrequency || 'MONTHLY')}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 mb-1">Próxima Fecha de Liquidación</span>
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>
                      {selectedInvestor.nextPayoutDate 
                        ? new Date(selectedInvestor.nextPayoutDate).toLocaleDateString()
                        : 'No asignada'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-300 mb-4">Historial de Transacciones</h3>
                {(!selectedInvestor.transactions || selectedInvestor.transactions.length === 0) ? (
                  <div className="text-slate-500 text-center py-10 bg-slate-950/50 border border-slate-800 rounded-2xl">
                    No se han registrado movimientos de capital para este socio.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {selectedInvestor.transactions.map((tx: any) => (
                      <div key={tx.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl ${getTxTypeColor(tx.type)}`}>
                            {getTxTypeIcon(tx.type)}
                          </div>
                          <div>
                            <span className="block font-bold text-white text-sm">{getTxTypeLabel(tx.type)}</span>
                            <span className="text-xs text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()} {new Date(tx.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <span className="font-extrabold text-white">${Number(tx.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
              Selecciona un socio de la lista para ver su historial de movimientos.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Agregar Socio */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-850 border border-slate-750 rounded-3xl w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-6">Registrar Nuevo Socio</h3>
            <form className="space-y-4" onSubmit={handleCreateInvestor}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre Completo</label>
                <input
                  type="text"
                  value={investorForm.fullName}
                  onChange={(e) => setInvestorForm({...investorForm, fullName: e.target.value})}
                  placeholder="Ej: Daniela Mendoza"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Capital Inicial Aportado ($)</label>
                <input
                  type="number"
                  value={investorForm.initialCapital}
                  onChange={(e) => setInvestorForm({...investorForm, initialCapital: e.target.value})}
                  placeholder="Ej: 5000000 (Opcional)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Márgen Ganancia (%)</label>
                  <input
                    type="number"
                    value={investorForm.profitRate}
                    onChange={(e) => setInvestorForm({...investorForm, profitRate: e.target.value})}
                    placeholder="Ej: 10"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia de Pago</label>
                  <select
                    value={investorForm.paymentFrequency}
                    onChange={(e) => setInvestorForm({...investorForm, paymentFrequency: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quincenal</option>
                    <option value="MONTHLY">Mensual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha de Liquidación/Pago</label>
                <input
                  type="date"
                  value={investorForm.nextPayoutDate}
                  onChange={(e) => setInvestorForm({...investorForm, nextPayoutDate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
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

      {/* Modal: Editar Configuración de Socio */}
      {showEditModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-850 border border-slate-750 rounded-3xl w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-6">Configurar Márgenes y Fechas</h3>
            <form className="space-y-4" onSubmit={handleEditInvestor}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre Completo</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Márgen Ganancia (%)</label>
                  <input
                    type="number"
                    value={editForm.profitRate}
                    onChange={(e) => setEditForm({...editForm, profitRate: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia de Pago</label>
                  <select
                    value={editForm.paymentFrequency}
                    onChange={(e) => setEditForm({...editForm, paymentFrequency: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quincenal</option>
                    <option value="MONTHLY">Mensual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Próxima Fecha de Pago</label>
                <input
                  type="date"
                  value={editForm.nextPayoutDate}
                  onChange={(e) => setEditForm({...editForm, nextPayoutDate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Transacción */}
      {showTxModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-850 border border-slate-750 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Registrar Movimiento de Capital</h3>
            <form className="space-y-4" onSubmit={handleCreateTransaction}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tipo de Movimiento</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({...txForm, type: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                >
                  <option value="CONTRIBUTION">Aporte de Capital</option>
                  <option value="WITHDRAWAL">Retiro de Capital</option>
                  <option value="PROFIT_SHARE">Reparto de Utilidades (Gasto/Ganancia)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto del Movimiento ($)</label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({...txForm, amount: e.target.value})}
                  placeholder="Ej: 1000000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-lg font-bold focus:outline-none"
                  required
                  min="1"
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowTxModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center">
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

export default InversionistasView;
