import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2 } from 'lucide-react';
import { modalityService } from '../services/api';

const ModalitiesView: React.FC = () => {
  const [modalities, setModalities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'WEEKLY',
    interestRate: '20',
    installments: '4'
  });

  const loadModalities = async () => {
    try {
      const data = await modalityService.getAll();
      setModalities(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadModalities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await modalityService.create({
        name: formData.name,
        frequency: formData.frequency,
        interestRate: Number(formData.interestRate),
        installments: Number(formData.installments)
      });
      setShowModal(false);
      setFormData({ name: '', frequency: 'WEEKLY', interestRate: '20', installments: '4' });
      loadModalities();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta modalidad?')) return;
    try {
      await modalityService.delete(id);
      loadModalities();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Settings className="mr-3 text-slate-400" /> Modalidades de Cobro
          </h1>
          <p className="text-slate-400 mt-1">Gestiona las plantillas de crédito para agilizar la creación</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg flex items-center transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Nueva Modalidad
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modalities.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl">
            Aún no has creado modalidades.
          </div>
        ) : (
          modalities.map((m) => (
            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative group">
              <button 
                onClick={() => handleDelete(m.id)}
                className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <h3 className="text-xl font-bold text-white mb-2">{m.name}</h3>
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Frecuencia:</span>
                  <span className="text-white font-medium">
                    {m.frequency === 'DAILY' ? 'Diario' : m.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Interés:</span>
                  <span className="text-emerald-400 font-bold">{m.interestRate}%</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-400">Plazo:</span>
                  <span className="text-white font-medium">{m.installments} cuotas</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Crear Modalidad</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre descriptivo (Ej: Semanal 4 Cuotas al 15%)</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
                  <select value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white">
                    <option value="DAILY">Diario</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quincenal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">% Interés</label>
                  <input type="number" value={formData.interestRate} onChange={(e) => setFormData({...formData, interestRate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Plazo (Cantidad de cuotas)</label>
                  <input type="number" value={formData.installments} onChange={(e) => setFormData({...formData, installments: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex justify-center">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalitiesView;
