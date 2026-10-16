import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Layers
} from 'lucide-react';
import { loanService, modalityService } from '../services/api';

interface AssignCreditModalProps {
  client: any;
  onClose: () => void;
  onSuccess: (newLoan?: any) => void;
}

const AssignCreditModal: React.FC<AssignCreditModalProps> = ({ client, onClose, onSuccess }) => {
  const [modalities, setModalities] = useState<any[]>([]);
  const [selectedModalityId, setSelectedModalityId] = useState<string>('custom');
  
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [interestRate, setInterestRate] = useState('20');
  const [installments, setInstallments] = useState('20');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModalities = async () => {
      try {
        const data = await modalityService.getAll();
        if (Array.isArray(data)) {
          setModalities(data);
        }
      } catch (err) {
        console.error('Error al cargar modalidades:', err);
      }
    };
    fetchModalities();
  }, []);

  if (!client) return null;

  const handleModalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modId = e.target.value;
    setSelectedModalityId(modId);
    if (modId !== 'custom') {
      const mod = modalities.find(m => m.id === parseInt(modId));
      if (mod) {
        setFrequency(mod.frequency);
        setInterestRate(mod.interestRate.toString());
        setInstallments(mod.installments.toString());
      }
    }
  };

  // Cálculos del simulador
  const simAmount = parseFloat(amount) || 0;
  const simRate = parseFloat(interestRate) || 0;
  const simInstallments = parseInt(installments) || 1;
  const simTotal = simAmount * (1 + (simRate / 100));
  const simCuota = simInstallments > 0 ? (simTotal / simInstallments) : simTotal;

  // Préstamo activo previo si existe
  const activeLoan = client.loans?.find((l: any) => l.status === 'ACTIVE' || l.status === 'MORA' || l.status === 'CONGELADO');
  const activeBalance = activeLoan ? Number(activeLoan.balance || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (simAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await loanService.create({
        clientId: client.id,
        name: client.fullName,
        amount: simAmount,
        installments: simInstallments,
        interestRate: simRate,
        frequency
      });

      onSuccess(created);
    } catch (err: any) {
      setError(err.message || 'Error al asignar el crédito');
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Asignar Crédito</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cliente: <strong className="text-emerald-400">{client.fullName}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha rápida del cliente */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Doc: <strong className="text-white">{client.documentId || 'Sin documento'}</strong></span>
            </div>
            <span>Tel: <strong className="text-white">{client.phone || 'Sin teléfono'}</strong></span>
          </div>
          {client.address && (
            <p className="text-[11px] text-slate-500 truncate">
              Dirección: <span className="text-slate-300">{client.address}</span>
            </p>
          )}

          {/* Advertencia si ya tiene crédito vigente */}
          {activeLoan && (
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-amber-400 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Tiene crédito activo (#{activeLoan.id})
              </span>
              <span className="text-amber-300 font-bold">
                Saldo: ${activeBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Plantilla / Modalidad */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Plantilla / Modalidad de Préstamo
              </span>
              {selectedModalityId !== 'custom' && (
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Auto-aplicada</span>
              )}
            </label>
            <select
              value={selectedModalityId}
              onChange={handleModalityChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none transition-all text-sm cursor-pointer"
            >
              <option value="custom" className="bg-slate-900 text-white">Manual / Personalizado</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-emerald-400">
                  {m.name} ({m.frequency === 'DAILY' ? 'Diario' : m.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'} • {m.interestRate}% • {m.installments} cuotas)
                </option>
              ))}
            </select>
          </div>

          {/* Monto a Prestar */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Monto del Préstamo a Desembolsar ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 500000"
                min="1"
                step="any"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                required
                autoFocus
              />
            </div>

            {/* Botones rápidos de monto */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[100000, 200000, 300000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuickAmount(val)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  ${(val / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Frecuencia, Interés y Cuotas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
              <select
                disabled={selectedModalityId !== 'custom'}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-semibold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
              >
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">% Interés</label>
              <input
                type="number"
                disabled={selectedModalityId !== 'custom'}
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="20"
                min="0"
                step="any"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Cuotas ({frequency === 'DAILY' ? 'días' : frequency === 'WEEKLY' ? 'sem' : 'quinc'})
              </label>
              <input
                type="number"
                disabled={selectedModalityId !== 'custom'}
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="20"
                min="1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Simulador de Crédito en Vivo */}
          {simAmount > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 mt-2 animate-in fade-in">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Simulador del Crédito
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-emerald-900/40 pb-1.5">
                  <span className="text-slate-400">Capital entregado al cliente:</span>
                  <span className="text-white font-bold">${simAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-900/40 pb-1.5">
                  <span className="text-slate-400">Total a cobrar (con {simRate}%):</span>
                  <span className="text-amber-400 font-bold">${simTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-0.5 items-center">
                  <span className="text-slate-300 font-medium">
                    Valor por cuota ({simInstallments} cuotas {frequency === 'DAILY' ? 'diarias' : frequency === 'WEEKLY' ? 'semanales' : 'quincenales'}):
                  </span>
                  <span className="text-emerald-400 font-bold text-base">
                    ${Math.round(simCuota).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || simAmount <= 0}
              className="flex-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Activando Crédito...
                </>
              ) : (
                'Aprobar y Activar Crédito'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignCreditModal;
