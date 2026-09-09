import React, { useState } from 'react';
import { X, PlusCircle, Loader2, DollarSign, Calculator, CheckCircle2 } from 'lucide-react';
import { loanService } from '../services/api';

interface AddCapitalModalProps {
  client: any;
  loan: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCapitalModal: React.FC<AddCapitalModalProps> = ({ client, loan, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState(loan ? String(Number(loan.interestRate || 20)) : '20');
  const [installments, setInstallments] = useState(loan ? String(loan.installmentsTotal || 20) : '20');
  const [frequency, setFrequency] = useState(loan ? loan.frequency || 'DAILY' : 'DAILY');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loan) return null;

  const currentBalance = Number(loan.balance || 0);
  const addedAmount = parseFloat(amount) || 0;
  const rate = parseFloat(interestRate) || 0;
  const addedWithInterest = addedAmount * (1 + rate / 100);
  const projectedBalance = currentBalance + addedWithInterest;
  const numInstallments = parseInt(installments) || 1;
  const projectedCuota = numInstallments > 0 ? projectedBalance / numInstallments : projectedBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addedAmount <= 0) {
      setError('Por favor ingresa un monto válido superior a 0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loanService.addCapital(loan.id, {
        amount: addedAmount,
        interestRate: rate,
        installments: numInstallments,
        frequency,
        notes: notes.trim() || 'Adición de capital sobre saldo vigente'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al adicionar capital al crédito');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <PlusCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Adicionar Capital / Refinanciar</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cliente: <strong className="text-slate-200">{client?.fullName}</strong> (Crédito #{loan.id})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto a adicionar */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Monto de Capital a Adicionar ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 200000"
                min="1"
                step="any"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-blue-500 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Frecuencia, Tasa y Cuotas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tasa Interés (%)</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nuevas Cuotas</label>
              <input
                type="number"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                min="1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notas / Motivo (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Inyección de capital para mercancía"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tarjeta de Resumen Proyectado */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-400 font-bold mb-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>Proyección del Nuevo Saldo y Cuota</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Saldo Actual Vigente:</span>
              <span className="text-slate-200 font-bold">${currentBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Capital Adicional + Interés ({rate}%):</span>
              <span className="text-blue-400 font-bold">+${Math.round(addedWithInterest).toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-800 my-1 pt-1 flex justify-between text-sm">
              <span className="text-white font-bold">Nuevo Saldo Total:</span>
              <span className="text-emerald-400 font-extrabold">${Math.round(projectedBalance).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-400">Nuevo Valor de Cuota ({numInstallments} cuotas):</span>
              <span className="text-emerald-300 font-bold">${Math.round(projectedCuota).toLocaleString()}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Nota: Los abonos anteriores y el historial de pagos registrados se conservan intactos en el sistema.
          </p>

          {/* Botones */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || addedAmount <= 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Adición</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCapitalModal;
