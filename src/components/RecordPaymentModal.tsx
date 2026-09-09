import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, CreditCard, Printer } from 'lucide-react';
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

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ receipt, initialStatus = 'PAID', onClose, onConfirm }) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [amountPaid, setAmountPaid] = useState<number>(Number(receipt.expectedAmount));
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [digitalAmount, setDigitalAmount] = useState<string>('');
  const [generatePdf, setGeneratePdf] = useState<boolean>(true);
  
  // Calculate next default date
  const getDefaultNextDate = () => {
    const receiptDate = new Date(receipt.date);
    const frequency = receipt.loan?.frequency || 'DAILY';
    let daysToAdd = 1;
    
    if (frequency === 'WEEKLY') {
      daysToAdd = 7;
    } else if (frequency === 'BIWEEKLY') {
      daysToAdd = 15;
    }
    
    receiptDate.setDate(receiptDate.getDate() + daysToAdd);
    return receiptDate.toISOString().split('T')[0];
  };

  const [nextPaymentDate, setNextPaymentDate] = useState<string>(getDefaultNextDate());
  const [numInstallments, setNumInstallments] = useState<number>(1);

  // Automatically update amountPaid if expectedAmount or numInstallments changes
  useEffect(() => {
    if (status === 'PAID') {
      setAmountPaid(numInstallments * Number(receipt.expectedAmount));
    } else {
      setAmountPaid(0);
    }
  }, [status, numInstallments, receipt.expectedAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCash = cashAmount ? Number(cashAmount) : undefined;
    let finalDigital = digitalAmount ? Number(digitalAmount) : undefined;

    if (status === 'PAID' && paymentMethod === 'MIXTO') {
      const totalMix = (finalCash || 0) + (finalDigital || 0);
      if (totalMix !== amountPaid) {
        alert(`La suma de Efectivo ($${finalCash || 0}) y Digital ($${finalDigital || 0}) debe ser igual al Total Pagado ($${amountPaid})`);
        return;
      }
    }

    if (status === 'PAID' && generatePdf) {
      try {
        const totalInstallments = receipt.loan?.installmentsTotal || 20;
        const paidInstallments = receipt.loan?.installmentsPaid || 0;
        const remaining = Math.max(0, totalInstallments - paidInstallments - numInstallments);

        generateSingleDualReceiptPDF({
          clientName: receipt.loan?.client?.fullName || 'Cliente',
          documentId: receipt.loan?.client?.documentId,
          previousBalance: Number(receipt.loan?.balance || 0),
          paymentAmount: amountPaid,
          newBalance: Math.max(0, Number(receipt.loan?.balance || 0) - amountPaid),
          remainingInstallments: remaining,
          arrears: receipt.loan?.atrasosAcumulados || 0,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod,
          receiptNumber: receipt.id
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

  const clientName = receipt.loan?.client?.fullName || 'Cliente';
  const balance = Number(receipt.loan?.balance || 0);
  const cuota = Number(receipt.expectedAmount || 0);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center">
              <DollarSign className="text-emerald-400 mr-2" /> Cuadrar Pago / Estado
            </h3>
            <p className="text-xs text-slate-400 mt-1">{clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loan Stats Info Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Saldo Pendiente</span>
            <span className="text-white font-bold text-sm">${balance.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Cuota Pactada</span>
            <span className="text-emerald-400 font-bold text-sm">${cuota.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Cuotas Cobradas</span>
            <span className="text-white font-bold text-sm">{receipt.loan?.installmentsPaid}/{receipt.loan?.installmentsTotal}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Estado del Cobro</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'PAID', label: 'Pagó', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' },
                { id: 'ATRASADO', label: 'Atraso', color: 'border-red-500 text-red-400 bg-red-500/5 hover:bg-red-500/10' },
                { id: 'DOMINICAL', label: 'Dominical', color: 'border-blue-500 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                    status === opt.id ? `${opt.color} ring-2 ring-emerald-500/20` : 'border-slate-800 text-slate-400 bg-transparent hover:bg-slate-800/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {status === 'PAID' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Nro Cuotas</label>
                  <input
                    type="number"
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-lg font-bold"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Monto ($)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-lg font-bold"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-xs h-[52px]"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="NEQUI">Nequi</option>
                    <option value="DAVIPLATA">Daviplata</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'MIXTO' && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Monto en Efectivo</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Ej. 5000"
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
                      placeholder="Ej. 5000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500 outline-none text-sm"
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-slate-500" /> Próxima Fecha de Cobro
            </label>
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none text-sm"
              required
            />
          </div>

          {status === 'PAID' && (
            <div className="flex items-center space-x-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="printDualPdf"
                checked={generatePdf}
                onChange={(e) => setGeneratePdf(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-700 bg-slate-950 cursor-pointer"
              />
              <label htmlFor="printDualPdf" className="text-xs text-slate-300 cursor-pointer select-none">
                Descargar Comprobante PDF en 2 Columnas (Original y Copia)
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-5 h-5" /> Registrar en el Cuadre
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
