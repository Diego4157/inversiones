import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, XCircle, Coffee, DollarSign, AlertCircle, Printer } from 'lucide-react';
import { receiptService, reportService } from '../services/api';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { printHtml } from '../utils/print';

const DailyRouteView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>('PAID');
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [statusInfo, setStatusInfo] = useState<any>({
    isClosed: false,
    isGenerated: false,
    pendingToday: 0,
    hasPendingBefore: false,
    pendingBeforeDate: null
  });

  const loadData = async () => {
    try {
      const rData = await receiptService.getRouteByDate(selectedDate);
      setReceipts(Array.isArray(rData) ? rData : []);
      
      const sData = await reportService.getDailySummary(selectedDate);
      setSummary(sData && !sData.error ? sData : null);

      const check = await receiptService.checkRouteStatus(selectedDate);
      if (check && !check.error) {
        setStatusInfo(check);
        setIsClosed(!!check.isClosed);
      } else {
        setIsClosed(false);
      }
    } catch (error) {
      console.error(error);
      setReceipts([]);
      setIsClosed(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const openPaymentModal = (receipt: any, initialStatus: string) => {
    setActiveReceipt(receipt);
    setDefaultStatus(initialStatus);
  };

  const handlePaymentConfirm = async (paymentData: {
    status: string;
    amountPaid: number;
    paymentMethod: string;
    cashAmount?: number;
    digitalAmount?: number;
    nextPaymentDate: string;
  }) => {
    if (!activeReceipt) return;
    try {
      await receiptService.updateStatus(
        activeReceipt.id,
        paymentData.status,
        paymentData.amountPaid,
        paymentData.paymentMethod,
        paymentData.cashAmount,
        paymentData.digitalAmount,
        paymentData.nextPaymentDate
      );
      setActiveReceipt(null);
      loadData(); // Reload table and reconciliation summary
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseRoute = async () => {
    if (isClosed) return;
    const hasPending = receipts.some(r => r.status === 'PENDING');
    if (hasPending) {
      alert('No puedes cerrar la ruta porque aún tienes cobros PENDIENTES por registrar.');
      return;
    }
    if (!confirm(`¿Seguro que deseas cerrar oficialmente la ruta del día ${selectedDate}?`)) return;
    try {
      await receiptService.closeRoute(selectedDate);
      alert('Ruta cerrada y cuadrada exitosamente.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cerrar la ruta');
    }
  };

  const handlePrintDailySummary = () => {
    if (!summary) return;
    const dateStr = selectedDate;
    
    // Generar tabla de cobros para el ticket
    let receiptsRows = '';
    receipts.forEach(r => {
      const clientName = r.loan?.client?.fullName || 'Cliente';
      const statusLabel = r.status === 'PAID' ? 'PAGO' : r.status === 'ATRASADO' ? 'ATRA' : r.status === 'DOMINICAL' ? 'DOMI' : 'PEND';
      receiptsRows += `
        <div class="flex-between" style="font-size: 11px;">
          <span>${clientName.substring(0, 15)}</span>
          <span>$${Number(r.expectedAmount).toLocaleString()} [${statusLabel}]</span>
        </div>
      `;
    });

    const html = `
      <h3 class="text-center font-bold">JD INVERSIONES</h3>
      <p class="text-center font-bold">CUADRE DIARIO DE CAJA</p>
      <div class="divider"></div>
      <div class="flex-between"><span>Fecha de Ruta:</span> <span>${dateStr}</span></div>
      <div class="flex-between"><span>Total Recibos:</span> <span>${receipts.length}</span></div>
      <div class="divider"></div>
      <h4 class="font-bold">RESUMEN DE CAJA:</h4>
      <div class="flex-between font-bold" style="font-size: 15px; margin: 5px 0;">
        <span>TOTAL RECAUDADO:</span>
        <span>$${Number(summary.totalCollected || 0).toLocaleString()}</span>
      </div>
      <div class="flex-between font-bold"><span>Total Efectivo:</span> <span>$${Number(summary.totalCash || 0).toLocaleString()}</span></div>
      <div class="flex-between font-bold"><span>Total Digital:</span> <span>$${Number(summary.totalDigital || 0).toLocaleString()}</span></div>
      <div class="flex-between" style="font-size: 12px; padding-left: 10px;"><span>- Nequi:</span> <span>$${Number(summary.totalNequi || 0).toLocaleString()}</span></div>
      <div class="flex-between" style="font-size: 12px; padding-left: 10px;"><span>- Daviplata:</span> <span>$${Number(summary.totalDaviplata || 0).toLocaleString()}</span></div>
      
      <div class="my-2"></div>
      <div class="flex-between"><span>Total Pendiente:</span> <span>$${Number(summary.totalPending || 0).toLocaleString()}</span></div>
      <div class="flex-between"><span>Total Atrasos:</span> <span>${summary.totalAtrasosCount || 0}</span></div>
      <div class="flex-between"><span>Total Dominicales:</span> <span>${summary.totalDominicalesCount || 0}</span></div>
      
      <div class="divider"></div>
      <h4 class="font-bold">DETALLE DE LA RUTA:</h4>
      ${receiptsRows}
      
      <div class="divider"></div>
      <div class="my-4"></div>
      <div class="signature">Firma del Supervisor</div>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Map className="mr-3 text-blue-400" /> Ruta Diaria y Cuadre
            {isClosed && (
              <span className="ml-3 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Cerrada y Cuadrada
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Gestiona los cobros del día y verifica el resumen</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
        />
      </div>

      {/* Guía / Advertencias Contextuales */}
      <div className="space-y-4">
        {statusInfo.hasPendingBefore && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start space-x-3 text-amber-200 text-sm animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">⚠️ Atención: Ruta pendiente en el pasado</p>
              <p className="mt-1 text-slate-300">
                Tienes cobros pendientes sin registrar del día <strong className="text-amber-300">{statusInfo.pendingBeforeDate}</strong>. 
                Debes seleccionar esa fecha arriba, cuadrar todos sus cobros y cerrar la ruta antes de poder continuar con el día de hoy.
              </p>
            </div>
          </div>
        )}

        {statusInfo.isClosed && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start space-x-3 text-emerald-200 text-sm animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-bold">✅ Ruta Cerrada y Cuadrada</p>
              <p className="mt-1 text-slate-300">
                La ruta del día <strong className="text-emerald-300">{selectedDate}</strong> ha sido cerrada oficialmente. 
                Los reportes financieros han sido generados y no se permiten más modificaciones en los cobros.
              </p>
            </div>
          </div>
        )}

        {!statusInfo.isClosed && !statusInfo.isGenerated && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-start space-x-3 text-blue-200 text-sm animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
            <div>
              <p className="font-bold">ℹ️ Ruta No Generada</p>
              <p className="mt-1 text-slate-300">
                Aún no has generado la lista de cobros para el día de hoy. Ve al <strong className="text-blue-300">Almanaque / Calendario</strong> para generarla automáticamente o agregar cobros manuales.
              </p>
            </div>
          </div>
        )}

        {!statusInfo.isClosed && statusInfo.isGenerated && statusInfo.pendingToday > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-start space-x-3 text-blue-200 text-sm animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
            <div>
              <p className="font-bold">ℹ️ Ruta en Progreso</p>
              <p className="mt-1 text-slate-300">
                Tienes <strong className="text-blue-300">{statusInfo.pendingToday} cobros pendientes</strong> hoy. 
                Utiliza los botones de acción para marcarlos como Pagado, Atrasado o Dominical. Debes completar todos para cerrar el día.
              </p>
            </div>
          </div>
        )}

        {!statusInfo.isClosed && statusInfo.isGenerated && statusInfo.pendingToday === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start space-x-3 text-emerald-200 text-sm animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-bold">🎉 ¡Listo para Cerrar la Ruta!</p>
              <p className="mt-1 text-slate-300">
                Todos los cobros de hoy han sido registrados. Por favor presiona el botón <strong className="text-emerald-300">Cerrar Ruta y Generar PDF</strong> a la derecha para cerrar el día y habilitar el siguiente.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de la Ruta */}
        <div className="lg:col-span-2 space-y-4">
          {receipts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
              No hay ruta generada para hoy. Ve al Almanaque para generarla.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente / Crédito</th>
                      <th className="px-4 py-3 font-medium text-right">Saldo Actual</th>
                      <th className="px-4 py-3 font-medium text-right">A Pagar</th>
                      <th className="px-4 py-3 font-medium text-center">Estado</th>
                      <th className="px-4 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {receipts.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-white">{r.loan?.client?.fullName}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {r.loan?.frequency === 'DAILY' ? 'Diario' : r.loan?.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'} • {r.loan?.installmentsPaid}/{r.loan?.installmentsTotal} Cuotas
                          </div>
                          <div className="text-xs text-red-400 mt-0.5">
                            {r.loan?.atrasosAcumulados > 0 ? `Atrasos: ${r.loan?.atrasosAcumulados}/3` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-medium text-slate-300">${Number(r.loan?.balance || 0).toLocaleString()}</div>
                          <div className="text-xs text-slate-500 mt-1">de ${Number(r.loan?.totalAmount || 0).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-400">
                          ${Number(r.expectedAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block text-xs px-2 py-1 rounded-full font-bold ${
                            r.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                            r.status === 'ATRASADO' ? 'bg-red-500/20 text-red-400' :
                            r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {!isClosed ? (
                            r.status === 'PENDING' ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button 
                                  onClick={() => openPaymentModal(r, 'PAID')}
                                  className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                                  title="Pagó"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => openPaymentModal(r, 'ATRASADO')}
                                  className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                  title="Atraso"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => openPaymentModal(r, 'DOMINICAL')}
                                  className="p-2 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white rounded-lg transition-all"
                                  title="Dominical"
                                >
                                  <Coffee className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openPaymentModal(r, r.status)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all"
                              >
                                Editar
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-slate-500 text-center block">
                              Registrado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Panel de Cuadre */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <DollarSign className="text-emerald-400 mr-2" /> Cuadre Final
            </h2>
            
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-slate-400">Recaudado</span>
                <span className="text-2xl font-black text-emerald-400">${(summary?.totalCollected || 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-slate-400">Pendiente</span>
                <span className="text-xl font-bold text-amber-400">${(summary?.totalPending || 0).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="block text-slate-500 text-sm mb-1">Atrasos</span>
                  <span className="text-2xl font-bold text-red-400">{summary?.totalAtrasosCount || 0}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="block text-slate-500 text-sm mb-1">Dominicales</span>
                  <span className="text-2xl font-bold text-slate-300">{summary?.totalDominicalesCount || 0}</span>
                </div>
              </div>

              {/* Desglose de Caja */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Desglose de Recaudo</span>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Efectivo:</span>
                  <span className="font-bold text-white">${(summary?.totalCash || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Digital:</span>
                  <span className="font-bold text-sky-400">${(summary?.totalDigital || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-800/60 my-2 pt-2 space-y-1 text-xs pl-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nequi:</span>
                    <span className="text-slate-300 font-bold">${(summary?.totalNequi || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daviplata:</span>
                    <span className="text-slate-300 font-bold">${(summary?.totalDaviplata || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleCloseRoute}
              disabled={isClosed}
              className={`w-full mt-6 py-4 font-bold rounded-2xl shadow-lg transition-all ${
                isClosed 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isClosed ? 'Ruta Cerrada y Cuadrada' : 'Cerrar Ruta y Generar PDF'}
            </button>

            {isClosed && (
              <button 
                onClick={handlePrintDailySummary}
                className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 animate-in fade-in"
              >
                <Printer className="w-5 h-5" /> Imprimir Cuadre Diario (Ticket)
              </button>
            )}
          </div>
        </div>
      </div>

      {activeReceipt && (
        <RecordPaymentModal
          receipt={activeReceipt}
          initialStatus={defaultStatus}
          onClose={() => setActiveReceipt(null)}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </div>
  );
};

export default DailyRouteView;
