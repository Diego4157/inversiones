import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  Plus, 
  Minus,
  FileText
} from 'lucide-react';
import { generateSingleDualReceiptPDF } from '../lib/pdf';

interface RecordPaymentModalProps {
  receipt: any;
  initialStatus?: string;
  onClose: () => void;
  onConfirm: (data: {
    status: string;
    amountPaid: number;
    paymentMethod: string;
    cashAmount?: number;
    digitalAmount?: number;
    nextPaymentDate: string;
  }) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ 
  receipt, 
  initialStatus = 'PAID', 
  onClose, 
  onConfirm 
}) => {
  const clientName = receipt.loan?.client?.fullName || receipt.loan?.name || 'Cliente';
  const balance = Number(receipt.loan?.balance || 0);
  const totalInstallments = receipt.loan?.installmentsTotal || 20;
  const paidInstallments = receipt.loan?.installmentsPaid || 0;
  const arrears = receipt.loan?.atrasosAcumulados || 0;

  // Cuota acordada (por cuota individual)
  const cuota = Number(receipt.expectedAmount) > 0 
    ? Number(receipt.expectedAmount) 
    : (receipt.loan?.totalAmount ? Math.round(Number(receipt.loan.totalAmount) / totalInstallments) : (balance > 0 ? balance : 0));

  const [status, setStatus] = useState<string>(initialStatus);
  const [numInstallments, setNumInstallments] = useState<number>(1);
  const [amountPaid, setAmountPaid] = useState<number>(() => {
    return initialStatus === 'PAID' ? Math.min(balance || cuota, cuota) : 0;
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [digitalAmount, setDigitalAmount] = useState<string>('');
  const [generatePdf, setGeneratePdf] = useState<boolean>(true);

  // Calcular fecha de próximo cobro por defecto según frecuencia
  const getDefaultNextDate = () => {
    const baseDate = receipt.date ? new Date(receipt.date) : new Date();
    const frequency = receipt.loan?.frequency || 'DAILY';
    let daysToAdd = 1;

    if (frequency === 'WEEKLY') {
      daysToAdd = 7;
    } else if (frequency === 'BIWEEKLY') {
      daysToAdd = 15;
    }

    baseDate.setDate(baseDate.getDate() + daysToAdd);
    return baseDate.toISOString().split('T')[0];
  };

  const [nextPaymentDate, setNextPaymentDate] = useState<string>(getDefaultNextDate());

  // Cambiar de estado
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'PAID') {
      const calc = Math.min(balance || (numInstallments * cuota), numInstallments * cuota);
      setAmountPaid(calc);
    } else {
      setAmountPaid(0);
    }
  };

  // Seleccionar número de cuotas con 1 clic (ej: 1, 2, 3 cuotas)
  const handleSelectInstallments = (count: number) => {
    const safeCount = Math.max(1, count);
    setNumInstallments(safeCount);
    if (status === 'PAID') {
      const calculated = Math.min(balance || (safeCount * cuota), safeCount * cuota);
      setAmountPaid(calculated);
    }
  };

  // Incrementar / decrementar cuotas
  const handleStepInstallments = (delta: number) => {
    const newCount = Math.max(1, numInstallments + delta);
    handleSelectInstallments(newCount);
  };

  // Manejador cuando el usuario escribe manualmente en el monto en pesos ($)
  const handleAmountChange = (val: number) => {
    setAmountPaid(val);
    if (cuota > 0) {
      const approx = Math.max(1, Math.round(val / cuota));
      setNumInstallments(approx);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCash = cashAmount ? Number(cashAmount) : undefined;
    let finalDigital = digitalAmount ? Number(digitalAmount) : undefined;

    if (status === 'PAID') {
      if (amountPaid <= 0) {
        alert('Por favor ingresa un monto válido a cobrar mayor a $0.');
        return;
      }

      if (paymentMethod === 'MIXTO') {
        const totalMix = (finalCash || 0) + (finalDigital || 0);
        if (totalMix !== amountPaid) {
          alert(`La suma de Efectivo ($${(finalCash || 0).toLocaleString()}) y Digital ($${(finalDigital || 0).toLocaleString()}) debe ser igual al Total Pagado ($${amountPaid.toLocaleString()})`);
          return;
        }
      }
    }

    // Generar PDF si está marcado y pagó
    if (status === 'PAID' && generatePdf) {
      try {
        const remaining = Math.max(0, totalInstallments - paidInstallments - numInstallments);
        generateSingleDualReceiptPDF({
          clientName: clientName,
          documentId: receipt.loan?.client?.documentId || receipt.loan?.documentId,
          previousBalance: balance,
          paymentAmount: amountPaid,
          newBalance: Math.max(0, balance - amountPaid),
          remainingInstallments: remaining,
          arrears: arrears,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod,
          receiptNumber: receipt.id || Date.now()
        });
      } catch (pdfErr) {
        console.error('Error generando PDF:', pdfErr);
      }
    }

    onConfirm({
      status,
      amountPaid: status === 'PAID' ? amountPaid : 0,
      paymentMethod: status === 'PAID' ? paymentMethod : 'EFECTIVO',
      cashAmount: status === 'PAID' && paymentMethod === 'MIXTO' ? finalCash : (status === 'PAID' && paymentMethod === 'EFECTIVO' ? amountPaid : undefined),
      digitalAmount: status === 'PAID' && paymentMethod === 'MIXTO' ? finalDigital : (status === 'PAID' && (paymentMethod === 'NEQUI' || paymentMethod === 'DAVIPLATA') ? amountPaid : undefined),
      nextPaymentDate
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[110] p-3 md:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 md:p-7 shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Glow effect dinámico según estado */}
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl transition-colors duration-500 pointer-events-none ${
          status === 'PAID' ? 'bg-emerald-500/15' : status === 'ATRASADO' ? 'bg-red-500/15' : 'bg-blue-500/15'
        }`} />

        {/* Modal Header */}
        <div className="flex justify-between items-start mb-5 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg ${
                status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                status === 'ATRASADO' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {status === 'PAID' ? <DollarSign className="w-5 h-5" /> : status === 'ATRASADO' ? <XCircle className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                {status === 'PAID' ? 'Registrar Cobro / Abono' : status === 'ATRASADO' ? 'Registrar No Pago / Atraso' : 'Registrar Dominical'}
              </h3>
            </div>
            <p className="text-sm font-semibold text-slate-300 mt-1 pl-0.5">{clientName}</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loan Stats Info Box */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 mb-5 grid grid-cols-3 gap-2 text-center text-xs relative z-10">
          <div>
            <span className="text-slate-500 block mb-0.5 font-medium">Saldo Pendiente</span>
            <span className="text-white font-bold text-sm md:text-base">${balance.toLocaleString()}</span>
          </div>
          <div className="border-x border-slate-800 px-1">
            <span className="text-slate-500 block mb-0.5 font-medium">Cuota Pactada</span>
            <span className="text-emerald-400 font-bold text-sm md:text-base">${cuota.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5 font-medium">Progreso Cuotas</span>
            <span className="text-slate-300 font-bold text-sm md:text-base">{paidInstallments}/{totalInstallments}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          
          {/* Selector de Estado del Cobro */}
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
              ¿Qué ocurrió hoy con este cliente?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('PAID')}
                className={`py-3 px-2 rounded-2xl border text-xs md:text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  status === 'PAID' 
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                    : 'border-slate-800 text-slate-400 bg-slate-950/60 hover:bg-slate-800/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Pagó Cuota(s)</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('ATRASADO')}
                className={`py-3 px-2 rounded-2xl border text-xs md:text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  status === 'ATRASADO' 
                    ? 'border-red-500 text-red-400 bg-red-500/10 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10' 
                    : 'border-slate-800 text-slate-400 bg-slate-950/60 hover:bg-slate-800/40'
                }`}
              >
                <XCircle className="w-4 h-4 text-red-400" />
                <span>No Pagó / Atraso</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('DOMINICAL')}
                className={`py-3 px-2 rounded-2xl border text-xs md:text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  status === 'DOMINICAL' 
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10' 
                    : 'border-slate-800 text-slate-400 bg-slate-950/60 hover:bg-slate-800/40'
                }`}
              >
                <Coffee className="w-4 h-4 text-blue-400" />
                <span>Dominical</span>
              </button>
            </div>
          </div>

          {/* OPCIÓN 1: PAGÓ */}
          {status === 'PAID' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Selector Rápido de Cuotas: 1, 2, 3... */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ¿Cuántas cuotas pagó?
                  </label>
                  <span className="text-xs text-emerald-400 font-bold">
                    ${cuota.toLocaleString()} c/u
                  </span>
                </div>

                {/* Botones rápidos de cuotas */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleSelectInstallments(qty)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        numInstallments === qty
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {qty} {qty === 1 ? 'Cuota' : 'Cuotas'}
                    </button>
                  ))}
                </div>

                {/* Stepper + Input de Cuotas personalizadas */}
                <div className="flex items-center space-x-3 pt-1">
                  <span className="text-xs text-slate-400">O ajusta las cuotas:</span>
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleStepInstallments(-1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={numInstallments}
                      onChange={(e) => handleSelectInstallments(parseInt(e.target.value) || 1)}
                      className="w-12 text-center bg-transparent text-white font-black text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepInstallments(1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">cuota(s)</span>
                </div>

                {/* Resumen del cálculo automático */}
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex justify-between items-center">
                  <span>Cálculo automático:</span>
                  <strong className="text-emerald-400 font-bold text-sm">
                    {numInstallments} × ${cuota.toLocaleString()} = ${(numInstallments * cuota).toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Monto en Dinero ($) y Método de Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                    Total a Cobrar ($ COP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold text-lg">$</span>
                    <input
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-8 text-white focus:border-emerald-500 outline-none text-xl font-black"
                      required
                      min="1"
                    />
                  </div>
                  {amountPaid !== numInstallments * cuota && amountPaid > 0 && (
                    <span className="text-[11px] text-amber-400 font-medium block mt-1">
                      * Abono libre personalizado (${amountPaid.toLocaleString()})
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-sm h-[52px] font-bold cursor-pointer"
                  >
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="NEQUI">📱 Nequi</option>
                    <option value="DAVIPLATA">📱 Daviplata</option>
                    <option value="MIXTO">⚖️ Mixto (Efectivo + Digital)</option>
                  </select>
                </div>
              </div>

              {/* Campos si es método Mixto */}
              {paymentMethod === 'MIXTO' && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Monto en Efectivo</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Ej. 10000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Monto Digital (Transferencia)</label>
                    <input
                      type="number"
                      value={digitalAmount}
                      onChange={(e) => setDigitalAmount(e.target.value)}
                      placeholder="Ej. 20000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 outline-none text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Checkbox para Comprobante PDF */}
              <div className="flex items-center space-x-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="printDualPdf"
                  checked={generatePdf}
                  onChange={(e) => setGeneratePdf(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-700 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="printDualPdf" className="text-xs text-slate-300 cursor-pointer select-none flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Descargar Comprobante PDF (Original y Copia)
                </label>
              </div>
            </div>
          )}

          {/* OPCIÓN 2: NO PAGÓ / ATRASO */}
          {status === 'ATRASADO' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3 text-red-400">
                <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Cliente No Pagó Hoy (Atraso)</h4>
                  <p className="text-xs text-red-300 mt-0.5">
                    Se sumará 1 atraso al historial del crédito en la ruta del día.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span>Atrasos acumulados actuales:</span>
                  <span className="font-bold text-red-400">{arrears} {arrears === 1 ? 'atraso' : 'atrasos'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conteo tras registrar este atraso:</span>
                  <span className="font-bold text-red-400">{arrears + 1} de 3</span>
                </div>
                {arrears + 1 >= 3 && (
                  <div className="p-2 bg-red-950/70 border border-red-800/80 rounded-lg text-red-200 text-[11px] font-semibold mt-2">
                    ⚠️ Al acumular 3 atrasos, el sistema sumará automáticamente 1 cuota de mora al saldo del cliente (${Math.round(cuota / 3).toLocaleString()}).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPCIÓN 3: DOMINICAL */}
          {status === 'DOMINICAL' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3 text-blue-400">
                <Coffee className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Cobro Dominical / Festivo</h4>
                  <p className="text-xs text-blue-300 mt-0.5">
                    Día dominical o descanso acordado con el cliente.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                <p>
                  ✅ <strong>Sin penalidad:</strong> Este cobro queda asentado en el cuadre de hoy sin sumar atrasos ni generar mora para el cliente.
                </p>
              </div>
            </div>
          )}

          {/* Próxima Fecha de Cobro (Siempre visible y editable) */}
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-slate-500" /> Próxima Fecha de Cobro / Visita
            </label>
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-sm cursor-pointer"
              required
            />
          </div>

          {/* Botón de Envío / Confirmación */}
          <button
            type="submit"
            className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98] mt-3 flex items-center justify-center gap-2 cursor-pointer ${
              status === 'PAID' 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20' 
                : status === 'ATRASADO'
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            {status === 'PAID' ? (
              <>
                <CreditCard className="w-5 h-5" /> Registrar Pago de ${amountPaid.toLocaleString()} en el Cuadre
              </>
            ) : status === 'ATRASADO' ? (
              <>
                <XCircle className="w-5 h-5" /> Registrar No Pago / Atraso en el Cuadre
              </>
            ) : (
              <>
                <Coffee className="w-5 h-5" /> Registrar Cobro Dominical en el Cuadre
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
