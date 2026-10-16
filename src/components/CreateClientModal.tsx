import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { clientService, loanService, modalityService } from '../services/api';

interface CreateClientModalProps {
  existingClients?: any[];
  onClose: () => void;
  onSuccess: (client: any, loan?: any) => void;
  onSelectExistingClientForCredit?: (client: any) => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ 
  existingClients = [], 
  onClose, 
  onSuccess,
  onSelectExistingClientForCredit
}) => {
  // Datos del Cliente
  const [formData, setFormData] = useState({
    fullName: '',
    documentId: '',
    phone: '',
    address: ''
  });

  // Opción de Crédito Inmediato
  const [activateCredit, setActivateCredit] = useState(true);
  const [modalities, setModalities] = useState<any[]>([]);
  const [selectedModalityId, setSelectedModalityId] = useState<string>('custom');
  
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [interestRate, setInterestRate] = useState('20');
  const [installments, setInstallments] = useState('20');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar plantillas de crédito
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

  // Filtrado de clientes existentes para evitar duplicados
  const matchingExistingClients = React.useMemo(() => {
    const query = formData.fullName.trim().toLowerCase();
    if (query.length < 1) return [];
    return existingClients.filter(c => 
      c.fullName.toLowerCase().includes(query) ||
      (c.documentId && c.documentId.toLowerCase().includes(query))
    );
  }, [formData.fullName, existingClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    if (activateCredit && simAmount <= 0) {
      setError('Por favor ingresa el monto del crédito o desmarca la opción de crédito inmediato');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Crear el cliente
      const newClient = await clientService.create({
        fullName: formData.fullName.trim(),
        documentId: formData.documentId.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim()
      });

      let newLoan = null;

      // 2. Si se activó crédito, crearlo inmediatamente enlazado al nuevo cliente
      if (activateCredit && simAmount > 0) {
        newLoan = await loanService.create({
          clientId: newClient.id,
          name: newClient.fullName,
          amount: simAmount,
          installments: simInstallments,
          interestRate: simRate,
          frequency
        });
      }

      onSuccess(newClient, newLoan);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el registro');
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Nuevo Cliente</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registra el cliente y opcionalmente activa su primer crédito en un solo paso
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

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* SECCIÓN 1: DATOS DEL CLIENTE */}
          <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
              <User className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              1. Información Personal
            </span>

            {/* Nombre Completo con detección de coincidencias */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre Completo *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ej: Daniel Gómez Pérez"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all text-sm font-medium"
                required
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Alerta de duplicados en vivo */}
            {matchingExistingClients.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span>Ya existe(n) {matchingExistingClients.length} cliente(s) con nombre o documento similar:</span>
                </div>
                <div className="max-h-32 overflow-y-auto divide-y divide-amber-500/20 pr-1">
                  {matchingExistingClients.map(c => (
                    <div key={c.id} className="py-1.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">{c.fullName}</span>
                        <span className="text-slate-400 text-[10px]">
                          {c.documentId ? `Doc: ${c.documentId}` : 'Sin doc'} {c.phone ? `• Tel: ${c.phone}` : ''}
                        </span>
                      </div>
                      {onSelectExistingClientForCredit && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectExistingClientForCredit(c);
                          }}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer"
                          title="Asignar crédito directamente sin duplicar el cliente"
                        >
                          + Asignar Crédito
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center">
                  <CreditCard className="w-3 h-3 mr-1 text-slate-500" />
                  Cédula / Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.documentId}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  placeholder="Ej: 1020304050"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-slate-500" />
                  Teléfono / Celular *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 300 123 4567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-slate-500" />
                Dirección de Cobro *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej: Carrera 15 # 45-20, Barrio Central"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all text-xs"
                required
              />
            </div>
          </div>

          {/* SECCIÓN 2: ACTIVACIÓN DE CRÉDITO INMEDIATO */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
            
            {/* Toggle Switch */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl transition-colors ${activateCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block flex items-center">
                    ¿Asignar un Crédito de Inmediato?
                    {activateCredit && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Activado
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    Desembolsa y activa el primer crédito en el mismo momento de crearlo
                  </span>
                </div>
              </div>

              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={activateCredit}
                  onChange={(e) => setActivateCredit(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
            </label>

            {/* Campos del Crédito si está activado */}
            {activateCredit && (
              <div className="space-y-4 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                
                {/* Modalidad / Plantilla */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Modalidad / Plantilla de Cobro
                    </span>
                    {selectedModalityId !== 'custom' && (
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Auto-aplicada</span>
                    )}
                  </label>
                  <select
                    value={selectedModalityId}
                    onChange={handleModalityChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none transition-all text-xs cursor-pointer"
                  >
                    <option value="custom" className="bg-slate-900 text-white">Personalizado / Manual</option>
                    {modalities.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-emerald-400">
                        {m.name} ({m.frequency === 'DAILY' ? 'Diario' : m.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'} • {m.interestRate}% • {m.installments} cuotas)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto a prestar */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    Monto a Desembolsar ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ej: 300000"
                      min="1"
                      step="any"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                      required={activateCredit}
                    />
                  </div>

                  {/* Botones rápidos */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[100000, 200000, 300000, 500000, 1000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setQuickAmount(val)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-semibold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                      required={activateCredit}
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                      required={activateCredit}
                    />
                  </div>
                </div>

                {/* Simulador */}
                {simAmount > 0 && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 mt-2 animate-in fade-in">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Simulador del Préstamo
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between border-b border-emerald-900/40 pb-1">
                        <span className="text-slate-400">Desembolso:</span>
                        <span className="text-white font-bold">${simAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-900/40 pb-1">
                        <span className="text-slate-400">Total a cobrar (+{simRate}%):</span>
                        <span className="text-amber-400 font-bold">${simTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-0.5 items-center">
                        <span className="text-slate-300 font-medium">
                          Valor por cuota ({simInstallments}):
                        </span>
                        <span className="text-emerald-400 font-bold text-sm">
                          ${Math.round(simCuota).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || (activateCredit && simAmount <= 0)}
              className="flex-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Procesando Registro...
                </>
              ) : activateCredit ? (
                'Registrar Cliente y Activar Crédito'
              ) : (
                'Registrar Solo Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientModal;
