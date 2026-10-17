import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  Printer, 
  AlertCircle, 
  FileText, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { receiptService } from '../services/api';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { printThermalReceipt } from '../utils/print';
import { formatWhatsAppReceipt, openWhatsAppShare } from '../utils/whatsapp';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const CalendarView: React.FC<{ loans: any[] }> = ({ loans }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
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

  // Estado del Almanaque mensual
  const [viewYear, setViewYear] = useState<number>(() => {
    const [y] = getTodayDateString().split('-').map(Number);
    return y;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = getTodayDateString().split('-').map(Number);
    return m - 1;
  });
  const [monthReceiptsMap, setMonthReceiptsMap] = useState<Record<string, any>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const loadMonthData = async (year: number, month: number) => {
    setIsLoadingMonth(true);
    try {
      const data = await receiptService.getReceiptsByMonth(year, month + 1);
      if (data && typeof data === 'object') {
        setMonthReceiptsMap(data);
      }
    } catch (err) {
      console.error("Error cargando recibos del mes:", err);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  const loadRoute = async (date: string) => {
    setSelectedDate(date);
    const [y, m] = date.split('-').map(Number);
    if (y && m && (y !== viewYear || (m - 1) !== viewMonth)) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
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

  useEffect(() => {
    loadMonthData(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const handleGenerate = async () => {
    try {
      await receiptService.generateRoute(selectedDate);
      alert('Ruta generada exitosamente.');
      await loadRoute(selectedDate);
      await loadMonthData(viewYear, viewMonth);
    } catch (error: any) {
      alert(error.message || 'Error al generar la ruta');
    }
  };

  const handleCreateManual = async () => {
    if (!selectedLoanId) return;
    try {
      await receiptService.createManual(parseInt(selectedLoanId), selectedDate);
      setShowManualModal(false);
      await loadRoute(selectedDate);
      await loadMonthData(viewYear, viewMonth);
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
      await loadRoute(selectedDate);
      await loadMonthData(viewYear, viewMonth);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrintReceipt = (receipt: any) => {
    printThermalReceipt(receipt);
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
    const totalAmount = Number(receipt.loan?.totalAmount || 0);
    const balance = Number(receipt.loan?.balance || 0);
    const expectedAmount = Number(receipt.expectedAmount || 0);
    const clientName = receipt.loan?.client?.fullName || 'Cliente';
    const clientPhone = receipt.loan?.client?.phone || '';
    const documentId = receipt.loan?.client?.documentId || '';
    const latestPayment = receipt.loan?.payments?.[0];
    const amountPaid = latestPayment ? Number(latestPayment.amount) : expectedAmount;
    const prevBalance = latestPayment ? Number(latestPayment.previousBalance) : (balance + expectedAmount);
    const newBalance = latestPayment ? Number(latestPayment.newBalance) : balance;
    const dominicales = receipt.loan?.scheduledReceipts?.filter((r: any) => r.status === 'DOMINICAL')?.length || 0;
    const arrears = receipt.loan?.atrasosAcumulados || 0;
    const installmentsPaid = receipt.loan?.installmentsPaid || 0;
    const installmentsTotal = receipt.loan?.installmentsTotal || 20;

    const msg = formatWhatsAppReceipt({
      clientName,
      phone: clientPhone,
      documentId,
      totalCredit: totalAmount,
      cuotaAmount: expectedAmount,
      paidInstallments: installmentsPaid,
      totalInstallments: installmentsTotal,
      previousBalance: prevBalance,
      paymentAmount: amountPaid,
      newBalance: newBalance,
      remainingInstallments: Math.max(0, installmentsTotal - installmentsPaid),
      arrears,
      dominicales,
      paymentMethod: latestPayment?.paymentMethod || 'EFECTIVO',
      receiptNumber: receipt.id,
      date: selectedDate
    });

    openWhatsAppShare(clientPhone, msg);
  };

  // Helper para generar los días del almanaque visual
  const todayStr = getTodayDateString();
  const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getDate();
  
  // getUTCDay(): 0=Domingo, 1=Lunes, ..., 6=Sábado
  let startOffset = firstDayOfMonth.getUTCDay() - 1;
  if (startOffset === -1) startOffset = 6;

  // Días previos de relleno
  const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getDate();
  const prevMonthCells: number[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    prevMonthCells.push(daysInPrevMonth - i);
  }

  // Días del mes actual
  const currentMonthCells: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentMonthCells.push(d);
  }

  // Días posteriores de relleno
  const totalCellsSoFar = prevMonthCells.length + currentMonthCells.length;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  const nextMonthCells: number[] = [];
  for (let n = 1; n <= remainingCells; n++) {
    nextMonthCells.push(n);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleGoToToday = () => {
    const tStr = getTodayDateString();
    const [y, m] = tStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    loadRoute(tStr);
  };

  // Formato de fecha larga en español
  const formattedSelectedDate = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return selectedDate;
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  })();

  const paidCount = receipts.filter(r => r.status === 'PAID').length;
  const pendingCount = receipts.filter(r => r.status === 'PENDING').length;
  const atrasadosCount = receipts.filter(r => r.status === 'ATRASADO').length;
  const dominicalesCount = receipts.filter(r => r.status === 'DOMINICAL').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center">
            <CalendarIcon className="mr-3 text-emerald-400 w-8 h-8" /> Almanaque de Cobros
            {isClosed && (
              <span className="ml-3 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Cerrada y Cuadrada
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Toca cualquier día en el almanaque para ver o asignar cobros, asentar dominicales y generar rutas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGoToToday}
            className="px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Ir a la fecha de hoy"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ir a Hoy</span>
          </button>

          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => loadRoute(e.target.value)}
            className="bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-xl p-2.5 text-white focus:border-emerald-500 outline-none text-xs font-bold cursor-pointer transition-all"
            title="Elegir fecha directamente"
          />
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
                Debes seleccionar esa fecha, cuadrar todos sus cobros y cerrar la ruta antes de continuar el flujo.
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
      </div>

      {/* TARJETA DEL ALMANAQUE VISUAL INTERACTIVO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        
        {/* Cabecera del Almanaque (Mes, Año, Botones Anterior/Siguiente) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <p className="text-xs text-slate-400">
                {isLoadingMonth ? 'Cargando cobros del mes...' : 'Toca cualquier día en el almanaque para ver sus cobros'}
              </p>
            </div>
          </div>

          {/* Navegación y Leyenda */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button 
                onClick={handlePrevMonth}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleGoToToday}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Hoy
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Mini Leyenda de Estados */}
            <div className="hidden lg:flex items-center space-x-3 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/60">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pagado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Pendiente</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Atraso</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Dominical</span>
            </div>
          </div>
        </div>

        {/* Cabecera de Días de la Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4 mb-2 text-center">
          {DAY_NAMES.map((name, i) => (
            <div key={i} className={`text-xs font-bold py-1 uppercase tracking-wider ${i >= 5 ? 'text-blue-400' : 'text-slate-400'}`}>
              {name}
            </div>
          ))}
        </div>

        {/* Cuadrícula de Días del Mes */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {/* Celdas del mes previo (inactivas) */}
          {prevMonthCells.map((dayNum, i) => (
            <div 
              key={`prev-${i}`} 
              className="min-h-[64px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-600 select-none flex flex-col justify-between opacity-40 cursor-not-allowed"
            >
              <span className="text-xs font-semibold">{dayNum}</span>
            </div>
          ))}

          {/* Celdas del mes actual */}
          {currentMonthCells.map((dayNum) => {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const dayData = monthReceiptsMap[dateStr];
            const count = dayData?.total || 0;

            return (
              <button
                key={`current-${dayNum}`}
                type="button"
                onClick={() => loadRoute(dateStr)}
                className={`min-h-[64px] sm:min-h-[78px] p-1.5 sm:p-2.5 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-300 scale-[1.02] z-10 font-bold'
                    : isToday
                    ? 'bg-slate-900 border-2 border-emerald-500/80 text-white hover:bg-slate-850 hover:border-emerald-400'
                    : count > 0
                    ? 'bg-slate-950 border border-slate-700/80 text-white hover:bg-slate-800 hover:border-slate-600'
                    : 'bg-slate-950/60 border border-slate-800/60 text-slate-400 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-black ${
                    isSelected ? 'text-slate-950 font-black' : isToday ? 'text-emerald-400' : 'text-slate-200'
                  }`}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                      isSelected ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950'
                    }`}>
                      Hoy
                    </span>
                  )}
                </div>

                {/* Resumen de cobros del día */}
                <div className="mt-1 w-full space-y-1">
                  {count > 0 ? (
                    <>
                      <div className={`text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-lg flex items-center justify-between ${
                        isSelected 
                          ? 'bg-slate-950/25 text-slate-950' 
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        <span>{count} {count === 1 ? 'cobro' : 'cobros'}</span>
                      </div>
                      
                      {/* Puntos de Estado */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {dayData.paid > 0 && (
                          <span 
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`}
                            title={`${dayData.paid} pagado(s)`} 
                          />
                        )}
                        {dayData.pending > 0 && (
                          <span 
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-900' : 'bg-amber-400'}`}
                            title={`${dayData.pending} pendiente(s)`} 
                          />
                        )}
                        {dayData.dominical > 0 && (
                          <span 
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-900' : 'bg-blue-400'}`}
                            title={`${dayData.dominical} dominical(es)`} 
                          />
                        )}
                        {dayData.atrasado > 0 && (
                          <span 
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-900' : 'bg-red-400'}`}
                            title={`${dayData.atrasado} atraso(s)`} 
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <span className={`text-[9px] block ${isSelected ? 'text-slate-900/70' : 'text-slate-600'}`}>
                      Sin cobros
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Celdas del mes posterior (inactivas) */}
          {nextMonthCells.map((dayNum, i) => (
            <div 
              key={`next-${i}`} 
              className="min-h-[64px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-600 select-none flex flex-col justify-between opacity-40 cursor-not-allowed"
            >
              <span className="text-xs font-semibold">{dayNum}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN DE DETALLE Y COBROS DEL DÍA SELECCIONADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Encabezado del Día Seleccionado y Acciones */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Día Seleccionado
              </span>
              <span className="text-xs text-slate-400 font-mono">({selectedDate})</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 capitalize">
              {formattedSelectedDate}
            </h3>
          </div>

          {/* Botones de Acción para el Día */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleGenerate}
              disabled={isClosed}
              className={`px-4 py-2.5 font-bold rounded-xl text-sm transition-all border flex items-center gap-1.5 cursor-pointer shadow-md ${
                isClosed 
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isClosed ? 'Día Cerrado' : 'Generar Ruta Automática'}</span>
            </button>

            <button 
              onClick={() => {
                if (isClosed) {
                  alert('No puedes agregar recibos a un día que ya está cerrado.');
                  return;
                }
                setShowManualModal(true);
              }}
              disabled={isClosed}
              className={`px-4 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                isClosed 
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Recibo Manual</span>
            </button>

            <button 
              onClick={handlePrintBulkReceipts}
              disabled={receipts.length === 0}
              className={`px-4 py-2.5 font-bold rounded-xl text-sm transition-all border flex items-center gap-1.5 cursor-pointer shadow-md ${
                receipts.length === 0
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                  : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Imprimir Planilla</span>
            </button>
          </div>
        </div>

        {/* Resumen en Píldoras del Día */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-slate-500 font-bold block mb-0.5 uppercase">Total Recibos</span>
            <span className="text-xl font-black text-white">{receipts.length}</span>
          </div>
          <div className="bg-slate-950 border border-emerald-900/40 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-emerald-400 font-bold block mb-0.5 uppercase">Pagados</span>
            <span className="text-xl font-black text-emerald-400">{paidCount}</span>
          </div>
          <div className="bg-slate-950 border border-amber-900/40 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-amber-400 font-bold block mb-0.5 uppercase">Pendientes</span>
            <span className="text-xl font-black text-amber-400">{pendingCount}</span>
          </div>
          <div className="bg-slate-950 border border-red-900/40 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-red-400 font-bold block mb-0.5 uppercase">Atrasos</span>
            <span className="text-xl font-black text-red-400">{atrasadosCount}</span>
          </div>
          <div className="bg-slate-950 border border-blue-900/40 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] text-blue-400 font-bold block mb-0.5 uppercase">Dominicales</span>
            <span className="text-xl font-black text-blue-400">{dominicalesCount}</span>
          </div>
        </div>

        {/* Lista de Cobros del Día */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Listado de Clientes Programados ({receipts.length})</span>
            {receipts.length > 0 && (
              <span className="text-xs text-slate-500">
                Total a recaudar: ${receipts.reduce((acc, r) => acc + Number(r.expectedAmount || 0), 0).toLocaleString()}
              </span>
            )}
          </h4>

          {receipts.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-slate-500 space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-bold text-slate-400">No hay cobros programados para este día.</p>
              <p className="text-xs">Usa "Generar Ruta Automática" o "Agregar Recibo Manual" para programar cobros.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {receipts.map((r, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border border-slate-800/90 rounded-2xl gap-3 hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{r.loan?.client?.fullName || 'Cliente'}</h4>
                      {r.isManual && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                      <span>Préstamo #{r.loanId}</span>
                      <span>•</span>
                      <span>{r.loan?.frequency === 'DAILY' ? 'Diario' : r.loan?.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'}</span>
                      <span>•</span>
                      <span>{r.loan?.installmentsPaid}/{r.loan?.installmentsTotal} Cuotas</span>
                      <span>•</span>
                      <span>Saldo: ${Number(r.loan?.balance || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-left sm:text-right">
                      <p className="font-black text-emerald-400 text-base">${Number(r.expectedAmount).toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        r.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        r.status === 'ATRASADO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        r.status === 'DOMINICAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {r.status === 'DOMINICAL' && <Coffee className="w-3 h-3" />}
                        {r.status === 'ATRASADO' && <XCircle className="w-3 h-3" />}
                        {r.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-3">
                      <button 
                        onClick={() => handlePrintReceipt(r)}
                        className="p-2 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-all cursor-pointer"
                        title="Imprimir Recibo Térmico"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => handleShareWhatsApp(r)}
                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer"
                        title="Compartir por WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {!isClosed && (
                        r.status === 'PENDING' ? (
                          <>
                            <button 
                              onClick={() => openPaymentModal(r, 'PAID')}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md"
                              title="Cobrar Cuota"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Cobrar</span>
                            </button>

                            <button 
                              onClick={() => openPaymentModal(r, 'ATRASADO')}
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Marcar Atraso"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={() => openPaymentModal(r, 'DOMINICAL')}
                              className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Marcar Dominical (Avanza a mañana)"
                            >
                              <Coffee className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openPaymentModal(r, r.status)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Editar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
