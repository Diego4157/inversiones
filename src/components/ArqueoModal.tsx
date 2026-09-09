import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle2, DollarSign, Wallet, Smartphone, Receipt, Printer, AlertTriangle, FileText } from 'lucide-react';
import { receiptService } from '../services/api';
import { generateArqueoPDF, type ArqueoReportData } from '../lib/pdf';

interface ArqueoModalProps {
  date: string;
  isClosed: boolean;
  onClose: () => void;
  onClosedSuccess: () => void;
}

export const ArqueoModal: React.FC<ArqueoModalProps> = ({ date, isClosed: initialIsClosed, onClose, onClosedSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [arqueo, setArqueo] = useState<any>(null);
  const [operationalExpenses, setOperationalExpenses] = useState<string>('0');
  const [expensesDescription, setExpensesDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchArqueo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await receiptService.getArqueo(date);
      setArqueo(data);
      if (data.operationalExpenses) {
        setOperationalExpenses(data.operationalExpenses.toString());
      }
      if (data.expensesDescription) {
        setExpensesDescription(data.expensesDescription);
      }
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos del arqueo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArqueo();
  }, [date]);

  const totalCash = Number(arqueo?.totalCash || 0);
  const totalDigital = Number(arqueo?.totalDigital || 0);
  const totalCollected = Number(arqueo?.totalCollected || 0);
  const currentExpenses = parseFloat(operationalExpenses) || 0;
  const netToDeliver = Math.max(0, totalCash - currentExpenses);
  const isAlreadyClosed = arqueo?.isClosed || initialIsClosed;

  const handleConfirmClose = async () => {
    if (!confirm(`¿Estás completamente seguro de cerrar y cuadrar la caja del día ${date}? Esta acción BLOQUEARÁ permanentemente el registro o edición de pagos para esta fecha.`)) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await receiptService.closeRoute({
        date,
        operationalExpenses: currentExpenses,
        expensesDescription,
        notes
      });
      alert(result.message || 'Caja cerrada y arqueada exitosamente.');
      if (result.arqueo) {
        setArqueo(result.arqueo);
      }
      onClosedSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al cerrar la caja');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintPDF = () => {
    if (!arqueo) return;
    const reportData: ArqueoReportData = {
      date: arqueo.date || date,
      closedAt: arqueo.closedAt,
      closedBy: arqueo.closedBy,
      totalCollected: Number(arqueo.totalCollected || totalCollected),
      totalCash: Number(arqueo.totalCash || totalCash),
      totalDigital: Number(arqueo.totalDigital || totalDigital),
      operationalExpenses: currentExpenses,
      expensesDescription: expensesDescription || arqueo.expensesDescription,
      netToDeliver: isAlreadyClosed ? Number(arqueo.netToDeliver || netToDeliver) : netToDeliver,
      paymentsCount: arqueo.paymentsCount || 0,
      notes: notes || arqueo.notes
    };
    generateArqueoPDF(reportData);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${isAlreadyClosed ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {isAlreadyClosed ? <Lock className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {isAlreadyClosed ? 'Cierre de Caja & Arqueo Oficial' : 'Arqueo y Cierre Diario de Caja'}
              </h3>
              <p className="text-xs text-slate-400">Ruta del día: <span className="text-white font-semibold">{date}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center space-x-3 text-red-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
              Calculando desglose de caja...
            </div>
          ) : (
            <>
              {isAlreadyClosed && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-emerald-300 font-bold block text-sm">Caja Cerrada y Bloqueada</span>
                    <span className="text-slate-400 text-xs">
                      Esta fecha está arqueada y no permite registros ni modificaciones de pagos retroactivos.
                    </span>
                    {arqueo?.closedAt && (
                      <span className="text-slate-400 text-[11px] block mt-1">
                        Cerrado el {new Date(arqueo.closedAt).toLocaleString()} por {arqueo.closedBy?.name || 'Administrador'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Grid Desglose */}
              <div className="grid grid-cols-2 gap-3">
                {/* Efectivo */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center space-x-2 text-slate-400 mb-1">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold">Total Efectivo</span>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    ${Math.round(totalCash).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">En mano del cobrador</span>
                </div>

                {/* Digital */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center space-x-2 text-slate-400 mb-1">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold">Nequi / Daviplata</span>
                  </div>
                  <div className="text-xl font-black text-purple-400">
                    ${Math.round(totalDigital).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Transferencias digitales</span>
                </div>

                {/* Total Recaudado */}
                <div className="col-span-2 bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-bold">Total Recaudado en el Día:</span>
                  <span className="text-base font-extrabold text-white">${Math.round(totalCollected).toLocaleString()}</span>
                </div>
              </div>

              {/* Gastos Operativos */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-amber-300 flex items-center">
                    <DollarSign className="w-3.5 h-3.5 mr-1" /> Gastos Operativos / Egresos Menores
                  </label>
                  <span className="text-[10px] text-slate-400">Gasolina, viáticos, etc.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Monto Gastado ($):</span>
                    <input
                      type="number"
                      disabled={isAlreadyClosed}
                      value={operationalExpenses}
                      onChange={(e) => setOperationalExpenses(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-white font-bold disabled:opacity-60 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Concepto del Gasto:</span>
                    <input
                      type="text"
                      disabled={isAlreadyClosed}
                      value={expensesDescription}
                      onChange={(e) => setExpensesDescription(e.target.value)}
                      placeholder="Ej: Combustible moto"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Saldo Neto a Entregar */}
              <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-5 rounded-3xl text-center shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-1">
                  Saldo Neto a Entregar (Efectivo - Gastos)
                </span>
                <div className="text-3xl font-black text-white">
                  ${Math.round(isAlreadyClosed && arqueo?.netToDeliver !== undefined ? Number(arqueo.netToDeliver) : netToDeliver).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Monto físico que el cobrador entrega al supervisor o socio
                </span>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> Observaciones o Novedades
                </label>
                <textarea
                  rows={2}
                  disabled={isAlreadyClosed}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre entregas, billetes o novedades de la ruta..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white disabled:opacity-60 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex flex-wrap gap-3 justify-end items-center">
          <button
            type="button"
            onClick={handlePrintPDF}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition font-bold text-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir / Descargar Voucher PDF</span>
          </button>

          {!isAlreadyClosed ? (
            <button
              type="button"
              disabled={loading || submitting}
              onClick={handleConfirmClose}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Cerrando y Arqueando...' : 'Confirmar y Cerrar Caja Definitivamente'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Cerrar Vista
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
