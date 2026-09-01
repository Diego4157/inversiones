import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, XCircle, Coffee, Printer, AlertCircle, FileText, Share2 } from 'lucide-react';
import { receiptService } from '../services/api';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { printHtml } from '../utils/print';

const CalendarView: React.FC<{ loans: any[] }> = ({ loans }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
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

  const loadRoute = async (date: string) => {
    setSelectedDate(date);
    try {
      const data = await receiptService.getRouteByDate(date);
      setReceipts(Array.isArray(data) ? data : []);
      
      const check = await receiptService.checkRouteStatus(date);
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
    loadRoute(selectedDate);
  }, []);

  const handleGenerate = async () => {
    try {
      await receiptService.generateRoute(selectedDate);
      alert('Ruta generada exitosamente.');
      loadRoute(selectedDate);
    } catch (error: any) {
      alert(error.message || 'Error al generar la ruta');
    }
  };

  const handleCreateManual = async () => {
    if (!selectedLoanId) return;
    try {
      await receiptService.createManual(parseInt(selectedLoanId), selectedDate);
      setShowManualModal(false);
      loadRoute(selectedDate);
    } catch (error) {
      console.error(error);
    }
  };

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
      loadRoute(selectedDate);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrintReceipt = (receipt: any) => {
    const totalAmount = Number(receipt.loan?.totalAmount || 0);
    const balance = Number(receipt.loan?.balance || 0);
    const expectedAmount = Number(receipt.expectedAmount || 0);
    const clientName = receipt.loan?.client?.fullName || 'Cliente';
    const documentId = receipt.loan?.client?.documentId || '';
    
    // Calcular saldo anterior y valores del último pago
    const latestPayment = receipt.loan?.payments?.[0];
    const ultimoValorPagado = latestPayment ? Number(latestPayment.amount) : expectedAmount;
    const saldoAnterior = latestPayment ? Number(latestPayment.previousBalance) : (balance + expectedAmount);
    const saldoActual = latestPayment ? Number(latestPayment.newBalance) : balance;
    const fechaUltimoPago = latestPayment ? new Date(latestPayment.createdAt).toLocaleDateString() : 'N/A';
    const dominicales = receipt.loan?.scheduledReceipts?.length || 0;

    const html = `
      <h3 class="text-center font-bold" style="font-size: 16px; margin: 0;">INVERSIONES JD</h3>
      <p class="text-center" style="font-size: 12px; margin: 2px 0 10px 0;">322 508 67 31</p>

      <div class="flex-between">
        <span>Recibo N°: <strong>${receipt.id}</strong></span>
        <span>Cuota N°: <strong>${receipt.loan?.installmentsPaid || 0}</strong></span>
      </div>
      <div class="flex-between">
        <span>Fecha: <strong>${new Date(receipt.date).toLocaleDateString()}</strong></span>
        <span>Atrasos: <strong style="color: red;">${receipt.loan?.atrasosAcumulados || 0}</strong></span>
      </div>
      <div class="flex-between">
        <span>Dominicales: <strong>${dominicales}</strong></span>
      </div>
      <div class="divider"></div>

      <div class="flex-between">
        <span>Credito en dias a:</span>
        <span><strong>${receipt.loan?.installmentsTotal || 0}</strong></span>
      </div>
      <div class="flex-between">
        <span>Cuotas Pagadas:</span>
        <span><strong>${receipt.loan?.installmentsPaid || 0}</strong></span>
      </div>
      <div class="flex-between">
        <span>Saldo en Cuotas:</span>
        <span><strong>${(receipt.loan?.installmentsTotal || 0) - (receipt.loan?.installmentsPaid || 0)}</strong></span>
      </div>
      <div class="flex-between font-bold" style="margin-top: 4px;">
        <span>Vlr. Cuota a pagar:</span>
        <span>$${expectedAmount.toLocaleString()}</span>
      </div>
      <div class="divider"></div>

      <div class="flex-between">
        <span>Saldo Anterior:</span>
        <span>$${saldoAnterior.toLocaleString()}</span>
      </div>
      <div class="flex-between font-bold">
        <span>Saldo Actual:</span>
        <span>$${saldoActual.toLocaleString()}</span>
      </div>

      <p style="font-size: 10px; text-align: center; margin: 8px 0; font-style: italic;">
        Cada 3 atrazos se cobra 1 cuota de mora.
      </p>
      <div class="divider"></div>

      <div class="flex-between">
        <span>Valor Credito:</span>
        <span>$${totalAmount.toLocaleString()}</span>
      </div>
      <div>Nombre: <strong>${clientName}</strong></div>
      <div>Código: <strong>${documentId}</strong></div>

      <div class="divider"></div>
      <div class="flex-between">
        <span>Fecha ultimo pago:</span>
        <span>${fechaUltimoPago}</span>
      </div>
      <div class="flex-between">
        <span>Valor cuota:</span>
        <span>$${expectedAmount.toLocaleString()}</span>
      </div>
      <div class="flex-between">
        <span>Ultimo valor Pagado:</span>
        <span>$${ultimoValorPagado.toLocaleString()}</span>
      </div>
    `;
    printHtml(html);
  };

  const handlePrintBulkReceipts = () => {
    if (receipts.length === 0) return;

    let ticketsHtml = '';
    receipts.forEach((r) => {
      const balance = Number(r.loan?.balance || 0);
      const expectedAmount = Number(r.expectedAmount || 0);
      const clientName = r.loan?.client?.fullName || 'Cliente';
      const documentId = r.loan?.client?.documentId || '';
      const cuotasLabel = `${r.loan?.installmentsPaid || 0}/${r.loan?.installmentsTotal || 0}`;

      ticketsHtml += `
        <div class="bulk-ticket-item">
          <!-- Colilla Cobrador -->
          <div class="colilla-left">
            <div class="ticket-header">JD INVERSIONES (Cobrador)</div>
            <div class="ticket-body">
              <div><strong>ID Recibo:</strong> #${r.id}</div>
              <div><strong>Fecha:</strong> ${selectedDate}</div>
              <div><strong>Cliente:</strong> ${clientName} (${documentId})</div>
              <div><strong>Crédito:</strong> #${r.loanId}</div>
              <div><strong>Monto Cuota:</strong> $${expectedAmount.toLocaleString()}</div>
              <div><strong>Saldo:</strong> $${balance.toLocaleString()}</div>
              <div><strong>Cuota Nro:</strong> ${cuotasLabel}</div>
              <div class="sig-line">Firma Cliente</div>
            </div>
          </div>
          
          <!-- Línea divisoria de corte -->
          <div class="cut-divider"></div>
          
          <!-- Recibo Cliente -->
          <div class="colilla-right">
            <div class="ticket-header">JD INVERSIONES (Cliente)</div>
            <div class="ticket-body">
              <div><strong>ID Recibo:</strong> #${r.id}</div>
              <div><strong>Fecha:</strong> ${selectedDate}</div>
              <div><strong>Cliente:</strong> ${clientName} (${documentId})</div>
              <div><strong>Crédito:</strong> #${r.loanId}</div>
              <div><strong>Monto Cuota:</strong> $${expectedAmount.toLocaleString()}</div>
              <div><strong>Saldo:</strong> $${balance.toLocaleString()}</div>
              <div><strong>Cuota Nro:</strong> ${cuotasLabel}</div>
              <div class="sig-line">Firma Cobrador</div>
            </div>
          </div>
        </div>
      `;
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impresión de Recibos en Lote - JD Inversiones</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 10px;
                background: #fff;
                color: #000;
              }
              .bulk-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
              }
              .bulk-ticket-item {
                display: flex;
                border: 1px solid #000;
                height: 180px;
                page-break-inside: avoid;
                margin-bottom: 10px;
              }
              .colilla-left, .colilla-right {
                flex: 1;
                padding: 10px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                font-size: 11px;
                line-height: 1.3;
              }
              .ticket-header {
                font-weight: bold;
                text-align: center;
                border-bottom: 1px solid #000;
                padding-bottom: 3px;
                margin-bottom: 5px;
                font-size: 12px;
              }
              .ticket-body {
                flex: 1;
              }
              .cut-divider {
                border-left: 1px dashed #000;
                height: 100%;
              }
              .sig-line {
                border-top: 1px solid #ccc;
                margin-top: 15px;
                text-align: center;
                font-size: 9px;
                padding-top: 2px;
              }
              @media print {
                body { padding: 0; }
                .bulk-ticket-item {
                  margin-bottom: 5px;
                }
              }
            </style>
          </head>
          <body>
            <div class="bulk-grid">
              ${ticketsHtml}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleShareWhatsApp = (receipt: any) => {
    const balance = Number(receipt.loan?.balance || 0);
    const expectedAmount = Number(receipt.expectedAmount || 0);
    const clientName = receipt.loan?.client?.fullName || 'Cliente';
    const cuotasLabel = `${receipt.loan?.installmentsPaid || 0}/${receipt.loan?.installmentsTotal || 0}`;

    const text = `*JD INVERSIONES*%0A----------------------------------%0A*RECIBO DE COBRO %23${receipt.id}*%0AFecha: ${selectedDate}%0ACrédito: %23${receipt.loanId}%0A----------------------------------%0A*Cliente:* ${clientName}%0A*Monto Recibido:* $${expectedAmount.toLocaleString()}%0A*Cuota:* ${cuotasLabel}%0A*Saldo Pendiente:* $${balance.toLocaleString()}%0A----------------------------------%0A¡Gracias por su pago!`;
    
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Almanaque / Calendario</h1>
          <p className="text-slate-400 mt-1">Programa y visualiza los recibos por día</p>
        </div>
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
                Debes seleccionar esa fecha arriba, cuadrar todos sus cobros y cerrar la ruta antes de poder generar nuevos recibos o continuar el flujo.
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
                Aún no has generado la lista de cobros para el día seleccionado. 
                Presiona el botón <strong className="text-blue-300">Generar Ruta Automática</strong> abajo para generarla.
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de Fecha */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <CalendarIcon className="mr-2 text-emerald-400" /> Seleccionar Día
          </h2>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => loadRoute(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
          />
          
          <div className="mt-6 space-y-3">
            <button 
              onClick={handleGenerate}
              disabled={isClosed}
              className={`w-full py-3 font-bold rounded-xl transition-all border ${
                isClosed 
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              {isClosed ? 'Día Cerrado y Cuadrado' : 'Generar Ruta Automática'}
            </button>
            <button 
              onClick={() => {
                if (isClosed) {
                  alert('No puedes agregar recibos a un día que ya está cerrado y cuadrado.');
                  return;
                }
                setShowManualModal(true);
              }}
              disabled={isClosed}
              className={`w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center ${
                isClosed 
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <Plus className="w-5 h-5 mr-2" /> Agregar Recibo Manual
            </button>

            <button 
              onClick={handlePrintBulkReceipts}
              disabled={receipts.length === 0}
              className={`w-full py-3 font-bold rounded-xl transition-all border flex items-center justify-center ${
                receipts.length === 0
                  ? 'bg-slate-800/40 text-slate-505 border-slate-800 cursor-not-allowed'
                  : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 mr-2" /> Imprimir Planilla en Lote
            </button>
          </div>
        </div>

        {/* Lista de Recibos */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
            <span>Recibos Programados ({receipts.length})</span>
            {isClosed && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Cerrada
              </span>
            )}
          </h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {receipts.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                No hay recibos programados para este día.
              </div>
            ) : (
              receipts.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-2xl gap-4">
                  <div>
                    <h3 className="font-bold text-white">{r.loan?.client?.fullName || 'Cliente'}</h3>
                    <p className="text-sm text-slate-400">Préstamo #{r.loanId} {r.isManual ? '(Manual)' : ''}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {r.loan?.frequency === 'DAILY' ? 'Diario' : r.loan?.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'} • {r.loan?.installmentsPaid}/{r.loan?.installmentsTotal} Cuotas
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">${Number(r.expectedAmount).toLocaleString()}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                        r.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.status === 'ATRASADO' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
                      <button 
                        onClick={() => handlePrintReceipt(r)}
                        className="p-1.5 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all"
                        title="Imprimir Recibo"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => handleShareWhatsApp(r)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                        title="Compartir por WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {r.status === 'PENDING' && !isClosed && (
                        <>
                          <button 
                            onClick={() => openPaymentModal(r, 'PAID')}
                            className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                            title="Pagó"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openPaymentModal(r, 'ATRASADO')}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                            title="Atraso"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openPaymentModal(r, 'DOMINICAL')}
                            className="p-1.5 bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white rounded-lg transition-all"
                            title="Dominical"
                          >
                            <Coffee className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Agregar Recibo Manual</h3>
            <p className="text-slate-400 mb-4">Selecciona el crédito al cual asignarle un recibo para el día {selectedDate}.</p>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white mb-4"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
            >
              <option value="">Seleccione un crédito...</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button onClick={() => setShowManualModal(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancelar</button>
              <button onClick={handleCreateManual} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl">Agregar</button>
            </div>
          </div>
        </div>
      )}

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

export default CalendarView;
