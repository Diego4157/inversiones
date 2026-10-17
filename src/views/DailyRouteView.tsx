import React, { useState, useEffect } from 'react';
import { 
  Map, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  DollarSign, 
  AlertCircle, 
  Printer, 
  FileText, 
  PauseCircle, 
  ShieldAlert,
  Search,
  Phone,
  Share2
} from 'lucide-react';
import { receiptService, reportService, clientService, loanService } from '../services/api';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { ArqueoModal } from '../components/ArqueoModal';
import { enqueueOfflinePayment } from '../utils/offlineQueue';
import { printHtml, printThermalReceipt } from '../utils/print';
import { generateReceiptsPDF } from '../lib/pdf';
import { formatWhatsAppReceipt, openWhatsAppShare } from '../utils/whatsapp';
import type { ReceiptData } from '../lib/logic';

const DailyRouteView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [recoveryLoans, setRecoveryLoans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ROUTE' | 'RECOVERY'>('ROUTE');
  const [summary, setSummary] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>('PAID');
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [showArqueoModal, setShowArqueoModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OTHER'>('ALL');
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

      // Cargar cartera de recuperación / congelados
      const recData = await loanService.getRecoveryLoans();
      setRecoveryLoans(Array.isArray(recData) ? recData : []);
    } catch (error) {
      console.error(error);
      setReceipts([]);
      setIsClosed(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Filtrado de recibos: Activos vs Congelados/Castigados
  const activeReceipts = receipts.filter(r => {
    const cStatus = r.loan?.client?.status;
    const lStatus = r.loan?.status;
    return cStatus !== 'CONGELADO' && cStatus !== 'CASTIGADO' && lStatus !== 'CONGELADO' && lStatus !== 'CASTIGADO';
  });

  const frozenReceipts = receipts.filter(r => {
    const cStatus = r.loan?.client?.status;
    const lStatus = r.loan?.status;
    return cStatus === 'CONGELADO' || cStatus === 'CASTIGADO' || lStatus === 'CONGELADO' || lStatus === 'CASTIGADO';
  });

  // Cálculo de caja esperada excluyendo congelados
  const expectedPendingAmount = activeReceipts
    .filter(r => r.status === 'PENDING')
    .reduce((sum, r) => sum + Number(r.expectedAmount || 0), 0);

  const pendingCount = activeReceipts.filter(r => r.status === 'PENDING').length;
  const paidCount = activeReceipts.filter(r => r.status === 'PAID').length;
  const otherCount = activeReceipts.filter(r => r.status === 'ATRASADO' || r.status === 'DOMINICAL').length;

  const displayedReceipts = activeReceipts.filter(r => {
    if (statusFilter === 'PENDING' && r.status !== 'PENDING') return false;
    if (statusFilter === 'PAID' && r.status !== 'PAID') return false;
    if (statusFilter === 'OTHER' && r.status !== 'ATRASADO' && r.status !== 'DOMINICAL') return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (r.loan?.client?.fullName || '').toLowerCase();
    const doc = (r.loan?.client?.documentId || '').toLowerCase();
    const phone = (r.loan?.client?.phone || '').toLowerCase();
    return name.includes(term) || doc.includes(term) || phone.includes(term);
  });

  const handleShareReceiptWhatsApp = (r: any) => {
    const totalAmount = Number(r.loan?.totalAmount || 0);
    const balance = Number(r.loan?.balance || 0);
    const expectedAmount = Number(r.expectedAmount || 0);
    const clientName = r.loan?.client?.fullName || 'Cliente';
    const clientPhone = r.loan?.client?.phone || '';
    const documentId = r.loan?.client?.documentId || '';
    const latestPayment = r.loan?.payments?.[0];
    const amountPaid = latestPayment ? Number(latestPayment.amount) : expectedAmount;
    const prevBalance = latestPayment ? Number(latestPayment.previousBalance) : (balance + expectedAmount);
    const newBalance = latestPayment ? Number(latestPayment.newBalance) : balance;
    const dominicales = r.loan?.scheduledReceipts?.filter((rec: any) => rec.status === 'DOMINICAL')?.length || 0;
    const arrears = r.loan?.atrasosAcumulados || 0;
    const installmentsPaid = r.loan?.installmentsPaid || 0;
    const installmentsTotal = r.loan?.installmentsTotal || 20;

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
      receiptNumber: r.id,
      date: selectedDate
    });

    openWhatsAppShare(clientPhone, msg);
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

    // Comprobación previa de desconexión
    if (!navigator.onLine) {
      enqueueOfflinePayment({
        receiptId: activeReceipt.id,
        loanId: activeReceipt.loan.id,
        clientName: activeReceipt.loan?.client?.fullName || 'Cliente',
        status: paymentData.status,
        amountPaid: paymentData.amountPaid,
        paymentMethod: paymentData.paymentMethod,
        cashAmount: paymentData.cashAmount,
        digitalAmount: paymentData.digitalAmount,
        nextPaymentDate: paymentData.nextPaymentDate
      });
      setReceipts(prev => prev.map(r => r.id === activeReceipt.id ? { ...r, status: paymentData.status } : r));
      setActiveReceipt(null);
      alert('📡 Dispositivo sin conexión. El abono fue guardado en cola local y se sincronizará automáticamente al volver la señal.');
      return;
    }

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
      loadData();
    } catch (error: any) {
      console.error("Error al registrar abono:", error);
      if (!navigator.onLine || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        enqueueOfflinePayment({
          receiptId: activeReceipt.id,
          loanId: activeReceipt.loan.id,
          clientName: activeReceipt.loan?.client?.fullName || 'Cliente',
          status: paymentData.status,
          amountPaid: paymentData.amountPaid,
          paymentMethod: paymentData.paymentMethod,
          cashAmount: paymentData.cashAmount,
          digitalAmount: paymentData.digitalAmount,
          nextPaymentDate: paymentData.nextPaymentDate
        });
        setReceipts(prev => prev.map(r => r.id === activeReceipt.id ? { ...r, status: paymentData.status } : r));
        setActiveReceipt(null);
        alert('📡 Falla de red temporal. El abono quedó guardado en cola local para sincronizarse en cuanto vuelva la conexión.');
      } else {
        alert(error.message || 'Error al procesar el pago');
      }
    }
  };

  const handleUnfreezeClient = async (clientId: number) => {
    if (!confirm('¿Deseas reactivar este cliente y regresar sus créditos a la ruta activa?')) return;
    try {
      await clientService.updateStatus(clientId, 'ACTIVE');
      alert('Cliente reactivado exitosamente.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al reactivar cliente');
    }
  };

  const handleOpenArqueoModal = () => {
    if (!isClosed) {
      const hasPending = activeReceipts.some(r => r.status === 'PENDING');
      if (hasPending) {
        alert('No puedes cerrar la caja porque aún tienes cobros activos PENDIENTES por registrar.');
        return;
      }
    }
    setShowArqueoModal(true);
  };

  // Descarga de comprobantes en PDF a dos columnas
  const handleDownloadBatchPDF = () => {
    const targetList = activeReceipts.length > 0 ? activeReceipts : receipts;
    if (targetList.length === 0) {
      alert('No hay cobros para generar la planilla de recibos.');
      return;
    }

    const mapped: ReceiptData[] = targetList.map((r, i) => {
      const balance = Number(r.loan?.balance || 0);
      const cuota = Number(r.expectedAmount || 0);
      const totalInst = r.loan?.installmentsTotal || 20;
      const paidInst = r.loan?.installmentsPaid || 0;

      return {
        clientName: r.loan?.client?.fullName || `Cliente ${i + 1}`,
        documentId: r.loan?.client?.documentId,
        previousBalance: balance,
        paymentAmount: cuota,
        newBalance: Math.max(0, balance - cuota),
        remainingInstallments: Math.max(0, totalInst - paidInst),
        arrears: r.loan?.atrasosAcumulados || 0,
        date: selectedDate,
        receiptNumber: r.id
      };
    });

    generateReceiptsPDF(mapped);
  };

  const handlePrintDailySummary = () => {
    if (!summary) return;
    const dateStr = selectedDate;
    
    let receiptsRows = '';
    activeReceipts.forEach(r => {
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
      <h3 class="text-center font-bold">INVERSIONES DMR</h3>
      <p class="text-center font-bold">CUADRE DIARIO DE CAJA</p>
      <div class="divider"></div>
      <div class="flex-between"><span>Fecha de Ruta:</span> <span>${dateStr}</span></div>
      <div class="flex-between"><span>Total Cobros Activos:</span> <span>${activeReceipts.length}</span></div>
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
      <div class="flex-between"><span>Total Pendiente Ruta:</span> <span>$${Number(expectedPendingAmount).toLocaleString()}</span></div>
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
      {/* Header */}
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
          <p className="text-slate-400 mt-1">Supervisa cobros del día y gestiona la cartera de recuperación</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadBatchPDF}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
            title="Descargar Planilla de Recibos en PDF tamaño carta (2 columnas)"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Recibos PDF (2 Cols)</span>
          </button>

          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Pestañas de Navegación: Ruta Activa vs Recuperación / Castigados */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ROUTE')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'ROUTE'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Ruta Activa del Día ({activeReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECOVERY')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'RECOVERY'
              ? 'bg-red-600/90 text-white shadow-lg shadow-red-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Recuperación / Castigados ({frozenReceipts.length + recoveryLoans.length})</span>
        </button>
      </div>

      {/* Alertas informativas */}
      <div className="space-y-4">
        {statusInfo.hasPendingBefore && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start space-x-3 text-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">⚠️ Atención: Ruta pendiente en el pasado</p>
              <p className="mt-1 text-slate-300">
                Tienes cobros pendientes del día <strong className="text-amber-300">{statusInfo.pendingBeforeDate}</strong>. 
                Debes seleccionar esa fecha, cuadrar sus cobros y cerrarla antes de continuar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contenido Principal según pestaña */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'ROUTE' ? (
            /* TAB 1: RUTA ACTIVA */
            activeReceipts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
                No hay cobros activos en la ruta para hoy. Ve al Almanaque para generarla.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Barra de Filtros y Búsqueda */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por cliente, cédula o teléfono..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-16 py-2 text-white placeholder-slate-500 text-sm focus:border-blue-500 outline-none transition-all"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'ALL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Todos ({activeReceipts.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('PENDING')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'PENDING'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800/80 text-amber-400 hover:bg-slate-800'
                      }`}
                    >
                      Pendientes ({pendingCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('PAID')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'PAID'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                      }`}
                    >
                      Pagados ({paidCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('OTHER')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'OTHER'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-red-400 hover:bg-slate-800'
                      }`}
                    >
                      Atrasos/Dom ({otherCount})
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5">Cliente / Crédito</th>
                          <th className="px-4 py-3.5 text-right">Saldo Actual</th>
                          <th className="px-4 py-3.5 text-right">A Pagar</th>
                          <th className="px-4 py-3.5 text-center">Estado</th>
                          <th className="px-4 py-3.5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {displayedReceipts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-slate-500 italic">
                              No hay cobros que coincidan con la búsqueda o filtro seleccionado.
                            </td>
                          </tr>
                        ) : (
                          displayedReceipts.map((r, i) => (
                            <tr key={r.id || i} className="hover:bg-slate-800/25 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-sm">{r.loan?.client?.fullName}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                  {r.loan?.client?.phone && (
                                    <a 
                                      href={`tel:${r.loan.client.phone}`}
                                      className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                                      title="Llamar al cliente"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-400" />
                                      <span>{r.loan.client.phone}</span>
                                    </a>
                                  )}
                                  {r.loan?.client?.documentId && (
                                    <span className="text-slate-500">• CC: {r.loan.client.documentId}</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {r.loan?.frequency === 'DAILY' ? 'Diario' : r.loan?.frequency === 'WEEKLY' ? 'Semanal' : 'Quincenal'} • Cuota {r.loan?.installmentsPaid || 0}/{r.loan?.installmentsTotal || 20}
                                </div>
                                {r.loan?.atrasosAcumulados > 0 && (
                                  <div className="text-xs text-red-400 font-bold mt-0.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{r.loan?.atrasosAcumulados} Atraso(s) acumulado(s)</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="font-bold text-slate-200">${Number(r.loan?.balance || 0).toLocaleString()}</div>
                                <div className="text-[11px] text-slate-500">Total: ${Number(r.loan?.totalAmount || 0).toLocaleString()}</div>
                              </td>
                              <td className="px-4 py-3.5 text-right font-black text-emerald-400 text-base">
                                ${Number(r.expectedAmount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
                                  r.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  r.status === 'ATRASADO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                  r.status === 'DOMINICAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                  r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {r.status === 'DOMINICAL' && <Coffee className="w-3.5 h-3.5" />}
                                  {r.status === 'ATRASADO' && <XCircle className="w-3.5 h-3.5" />}
                                  {r.status === 'PAID' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {r.status === 'PENDING' && <AlertCircle className="w-3.5 h-3.5" />}
                                  {r.status === 'PAID' ? 'PAGADO' : r.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {r.status === 'PENDING' ? (
                                  !isClosed ? (
                                    <div className="flex items-center justify-center space-x-1.5">
                                      <button 
                                        onClick={() => openPaymentModal(r, 'PAID')}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                                        title="Cobrar Cuota(s)"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Cobrar</span>
                                      </button>
                                      <button 
                                        onClick={() => openPaymentModal(r, 'ATRASADO')}
                                        className="p-1.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl transition-all cursor-pointer"
                                        title="No pagó / Marcar Atrasado"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => openPaymentModal(r, 'DOMINICAL')}
                                        className="p-1.5 bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl transition-all cursor-pointer"
                                        title="Marcar Dominical (Pasa al día siguiente)"
                                      >
                                        <Coffee className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-500">Caja cerrada</span>
                                  )
                                ) : r.status === 'PAID' ? (
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <button
                                      onClick={() => handleShareReceiptWhatsApp(r)}
                                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                      title="Compartir Recibo Oficial por WhatsApp al cliente"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span>WhatsApp</span>
                                    </button>
                                    <button
                                      onClick={() => printThermalReceipt(r)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
                                      title="Imprimir Tirilla Térmica (58mm/80mm)"
                                    >
                                      <Printer className="w-4 h-4 text-slate-300" />
                                    </button>
                                    {!isClosed && (
                                      <button
                                        onClick={() => openPaymentModal(r, r.status)}
                                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                        title="Modificar o anular este cobro para restaurar saldo"
                                      >
                                        Modificar
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  /* ATRASADO o DOMINICAL */
                                  <div className="flex items-center justify-center space-x-1.5">
                                    {!isClosed ? (
                                      <button
                                        onClick={() => openPaymentModal(r, r.status)}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        title="Cambiar estado o cobrar"
                                      >
                                        Modificar
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-500">Registrado</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* TAB 2: RECUPERACIÓN / CARTERA CONGELADA / CASTIGADA */
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <PauseCircle className="text-blue-400 mr-2 w-5 h-5" /> Cartera Congelada y Castigada
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Estos créditos han sido excluidos de la ruta diaria y no computan en el cuadre de caja regular.
                    </p>
                  </div>
                </div>

                {frozenReceipts.length === 0 && recoveryLoans.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    No tienes créditos congelados o castigados en este momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {/* Cobros congelados de la ruta de hoy */}
                    {frozenReceipts.map((r, i) => (
                      <div key={`fr-${i}`} className="py-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>{r.loan?.client?.fullName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                              {r.loan?.client?.status || 'CONGELADO'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">Saldo Pendiente: ${Number(r.loan?.balance || 0).toLocaleString()} COP</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openPaymentModal(r, 'PAID')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Abono Recuperación
                          </button>
                          <button
                            onClick={() => handleUnfreezeClient(r.loan?.client?.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Reactivar
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Créditos en Mora / Castigados registrados en el sistema */}
                    {recoveryLoans.map((l, i) => (
                      <div key={`rec-${i}`} className="py-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>{l.client?.fullName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                              {l.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">Saldo en recuperación: ${Number(l.balance || 0).toLocaleString()} COP</span>
                        </div>
                        <button
                          onClick={() => handleUnfreezeClient(l.client?.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Reactivar Cliente
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral: Cuadre Diario */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <DollarSign className="text-emerald-400 mr-2" /> Cuadre Final de Ruta
            </h2>
            
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-slate-400 text-sm">Recaudado Real</span>
                <span className="text-2xl font-black text-emerald-400">${(summary?.totalCollected || 0).toLocaleString()}</span>
              </div>

              {/* Caja Esperada Excluyendo Congelados */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-sm block">Pendiente Activo</span>
                  <span className="text-[11px] text-slate-500">(Excluye congelados)</span>
                </div>
                <span className="text-xl font-bold text-amber-400">${expectedPendingAmount.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="block text-slate-500 text-xs mb-1">Atrasos Hoy</span>
                  <span className="text-2xl font-bold text-red-400">
                    {summary?.totalAtrasosCount !== undefined ? summary.totalAtrasosCount : activeReceipts.filter(r => r.status === 'ATRASADO').length}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="block text-slate-500 text-xs mb-1">Dominicales</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {summary?.totalDominicalesCount !== undefined ? summary.totalDominicalesCount : activeReceipts.filter(r => r.status === 'DOMINICAL').length}
                  </span>
                </div>
              </div>

              {/* Desglose Métodos de Pago */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Desglose de Caja</span>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Efectivo:</span>
                  <span className="text-white font-bold">${(summary?.totalCash || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Digital:</span>
                  <span className="text-blue-400 font-bold">${(summary?.totalDigital || 0).toLocaleString()}</span>
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
              onClick={handleOpenArqueoModal}
              className={`w-full mt-6 py-4 font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isClosed 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              }`}
            >
              {isClosed ? 'Ver Arqueo y Voucher Oficial' : 'Cerrar Caja del Día y Arquear'}
            </button>

            {isClosed && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button 
                  onClick={handleOpenArqueoModal}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" /> Voucher PDF
                </button>
                <button 
                  onClick={handlePrintDailySummary}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" /> Tirilla Térmica
                </button>
              </div>
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

      {showArqueoModal && (
        <ArqueoModal
          date={selectedDate}
          isClosed={isClosed}
          onClose={() => setShowArqueoModal(false)}
          onClosedSuccess={() => {
            setShowArqueoModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default DailyRouteView;
