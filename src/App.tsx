import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import ClientesView from './views/ClientesView';
import CalendarView from './views/CalendarView';
import DailyRouteView from './views/DailyRouteView';
import ModalitiesView from './views/ModalitiesView';
import AssetsView from './views/AssetsView';
import InversionistasView from './views/InversionistasView';
import { AuditLogsView } from './views/AuditLogsView';
import { OfflineSyncBadge } from './components/OfflineSyncBadge';
import { authService, loanService, modalityService, clientService, assetService, investorService, receiptService } from './services/api';
import LoginView from './views/LoginView';
import RecordPaymentModal from './components/RecordPaymentModal';
import { enqueueOfflinePayment } from './utils/offlineQueue';
import { 
  Menu, 
  X, 
  LayoutDashboard,
  Users,
  TrendingUp,
  Loader2,
  AlertCircle,
  LogOut,
  Map,
  ShieldCheck,
  ChevronDown,
  UserPlus,
  CheckCircle
} from 'lucide-react';
import EditClientModal from './components/EditClientModal';
import CreateClientModal from './components/CreateClientModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(() => authService.getUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [loans, setLoans] = useState<any[]>([]);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [todayReceipts, setTodayReceipts] = useState<any[]>([]);
  const [activePaymentReceipt, setActivePaymentReceipt] = useState<any | null>(null);
  const [paymentInitialStatus, setPaymentInitialStatus] = useState<string>('PAID');
  const [realAssets, setRealAssets] = useState<any[]>([]);
  const [realInvestors, setRealInvestors] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [selectedModalityId, setSelectedModalityId] = useState<string>('custom');
  const [formData, setFormData] = useState<{
    name: string;
    clientId: number | null;
    amount: string;
    frequency: string;
    interestRate: string;
    installments: string;
    firstPaymentDate: string;
  }>({ name: '', clientId: null, amount: '', frequency: 'DAILY', interestRate: '20', installments: '20', firstPaymentDate: new Date().toISOString().split('T')[0] });
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [selectedClientObject, setSelectedClientObject] = useState<any | null>(null);
  const [allClients, setAllClients] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setStatusMessage("Conectando con el servidor...");
    try {
      const data = await loanService.getAll();
      console.log("Datos recibidos:", data);
      
      if (Array.isArray(data)) {
        setRawLoans(data);
        const formatted = data.map((l: any) => ({
          id: l.id,
          name: l.client?.fullName || 'Sin Nombre',
          balance: `$${(l.balance || 0).toLocaleString()}`,
          cuota: `$${Math.round((l.totalAmount || 0) / (l.installmentsTotal || 20)).toLocaleString()}`,
          client: l.client,
          rawLoan: l
        }));
        setLoans(formatted);
        setStatusMessage(null);
      } else {
        setStatusMessage("El servidor no envió una lista válida.");
      }
      
      const modData = await modalityService.getAll();
      setModalities(modData);

      const clientsData = await clientService.getAll();
      if (Array.isArray(clientsData)) setAllClients(clientsData);

      const assetsData = await assetService.getAll();
      if (Array.isArray(assetsData)) setRealAssets(assetsData);

      const investorsData = await investorService.getAll();
      if (Array.isArray(investorsData)) setRealInvestors(investorsData);

      // Cargar recibos programados de hoy para sincronizar el estado
      const todayStr = new Date().toISOString().split('T')[0];
      try {
        const rData = await receiptService.getRouteByDate(todayStr);
        if (Array.isArray(rData)) setTodayReceipts(rData);
      } catch (rErr) {
        console.warn("No se pudieron cargar recibos de hoy:", rErr);
      }

    } catch (error) {
      console.error("Error cargando:", error);
      setStatusMessage("No se pudo conectar con el servidor. ¿Está encendido?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      const user = await authService.getMe();
      if (user) {
        setCurrentUser(user);
        loadData();
      } else {
        setCurrentUser(null);
      }
      setIsCheckingAuth(false);
    };

    verifySession();
  }, []);

  const openPayment = async (client: any, initialStatus: string = 'PAID') => {
    setSelectedClient(client);
    setPaymentInitialStatus(initialStatus);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      // Buscar si ya existe un recibo de hoy para este crédito
      let receipt = todayReceipts.find(r => r.loanId === client.id);
      
      // Si no existe, crearlo o sincronizarlo automáticamente
      if (!receipt) {
        try {
          const res = await receiptService.createManual(client.id, todayStr);
          if (res && res.id && !res.error) {
            receipt = res;
          }
        } catch (mErr) {
          console.warn("No se pudo crear recibo manual en servidor:", mErr);
        }
      }

      const raw = rawLoans.find(l => l.id === client.id) || client.rawLoan || client;
      if (receipt && receipt.id) {
        if (!receipt.loan) {
          receipt.loan = raw;
        }
        setActivePaymentReceipt(receipt);
      } else {
        const expectedAmount = Number(client.cuota ? client.cuota.replace(/[^0-9]/g, '') : 0) || Math.round(Number(raw?.totalAmount || 0) / (raw?.installmentsTotal || 20));
        setActivePaymentReceipt({
          id: 'manual-' + client.id,
          loanId: client.id,
          date: todayStr,
          expectedAmount: expectedAmount,
          status: initialStatus,
          loan: raw
        });
      }
    } catch (err) {
      console.error("Error al preparar recibo de cobro:", err);
      // Fallback seguro con datos del crédito
      const raw = rawLoans.find(l => l.id === client.id) || client.rawLoan || client;
      const expectedAmount = Number(client.cuota ? client.cuota.replace(/[^0-9]/g, '') : 0) || Math.round(Number(raw?.totalAmount || 0) / (raw?.installmentsTotal || 20));
      setActivePaymentReceipt({
        id: 'manual-' + client.id,
        loanId: client.id,
        date: new Date().toISOString().split('T')[0],
        expectedAmount: expectedAmount,
        status: initialStatus,
        loan: raw
      });
    }
  };

  const handleDashboardPaymentConfirm = async (paymentData: {
    status: string;
    amountPaid: number;
    paymentMethod: string;
    cashAmount?: number;
    digitalAmount?: number;
    nextPaymentDate: string;
  }) => {
    if (!activePaymentReceipt) return;

    // Manejo Offline si no hay conexión a internet
    if (!navigator.onLine) {
      enqueueOfflinePayment({
        receiptId: typeof activePaymentReceipt.id === 'number' ? activePaymentReceipt.id : 0,
        loanId: activePaymentReceipt.loanId || activePaymentReceipt.loan?.id,
        clientName: activePaymentReceipt.loan?.client?.fullName || 'Cliente',
        status: paymentData.status,
        amountPaid: paymentData.amountPaid,
        paymentMethod: paymentData.paymentMethod,
        cashAmount: paymentData.cashAmount,
        digitalAmount: paymentData.digitalAmount,
        nextPaymentDate: paymentData.nextPaymentDate
      });
      setActivePaymentReceipt(null);
      alert('📡 Operación guardada en la cola offline. Se sincronizará automáticamente cuando vuelva la conexión.');
      await loadData();
      return;
    }

    try {
      if (typeof activePaymentReceipt.id === 'number') {
        await receiptService.updateStatus(
          activePaymentReceipt.id,
          paymentData.status,
          paymentData.amountPaid,
          paymentData.paymentMethod,
          paymentData.cashAmount,
          paymentData.digitalAmount,
          paymentData.nextPaymentDate
        );
      } else {
        // Fallback si fue creado como mock: intentar crear recibo real primero
        const loanId = activePaymentReceipt.loanId || activePaymentReceipt.loan?.id;
        try {
          const created = await receiptService.createManual(loanId, activePaymentReceipt.date || new Date().toISOString().split('T')[0]);
          if (created && created.id && !created.error) {
            await receiptService.updateStatus(
              created.id,
              paymentData.status,
              paymentData.amountPaid,
              paymentData.paymentMethod,
              paymentData.cashAmount,
              paymentData.digitalAmount,
              paymentData.nextPaymentDate
            );
          } else if (paymentData.status === 'PAID') {
            await loanService.recordPayment({
              loanId: loanId,
              amount: paymentData.amountPaid
            });
          }
        } catch (innerErr) {
          if (paymentData.status === 'PAID') {
            await loanService.recordPayment({
              loanId: loanId,
              amount: paymentData.amountPaid
            });
          }
        }
      }
      setActivePaymentReceipt(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al procesar el cobro');
    }
  };

  const openAddCreditForClient = (client: any) => {
    setSelectedClientObject(client);
    setFormData({
      name: client.fullName,
      clientId: client.id,
      amount: '',
      frequency: 'DAILY',
      interestRate: '20',
      installments: '20',
      firstPaymentDate: new Date().toISOString().split('T')[0]
    });
    setIsClientDropdownOpen(false);
    setShowAddModal(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor selecciona o escribe el nombre del cliente');
      return;
    }
    setIsLoading(true);
    try {
      await loanService.create({
        name: formData.name,
        clientId: formData.clientId || undefined,
        amount: Number(formData.amount),
        installments: Number(formData.installments),
        interestRate: Number(formData.interestRate),
        frequency: formData.frequency,
        firstPaymentDate: formData.firstPaymentDate
      });
      setShowAddModal(false);
      setFormData({ name: '', clientId: null, amount: '', frequency: 'DAILY', interestRate: '20', installments: '20', firstPaymentDate: new Date().toISOString().split('T')[0] });
      setSelectedClientObject(null);
      setIsClientDropdownOpen(false);
      await loadData(); // Recargar después de crear
    } catch (error: any) {
      alert(error.message || 'Error al crear el crédito. Verifica el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modId = e.target.value;
    setSelectedModalityId(modId);
    if (modId !== 'custom') {
      const mod = modalities.find(m => m.id === parseInt(modId));
      if (mod) {
        setFormData({
          ...formData,
          frequency: mod.frequency,
          interestRate: mod.interestRate.toString(),
          installments: mod.installments.toString()
        });
      }
    }
  };

  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setShowEditClientModal(true);
  };

  const getStats = () => {
    const carteraTotal = rawLoans.reduce((acc, l) => acc + Number(l.balance), 0);
    const enMora = rawLoans.reduce((acc, l) => acc + (Number(l.atrasosAcumulados) > 0 ? Number(l.balance) : 0), 0);
    const sociosCount = realInvestors.length;
    
    // Calcular recaudo hoy buscando pagos cuya fecha sea la de hoy
    const todayStr = new Date().toISOString().split('T')[0];
    const recaudoHoy = rawLoans.reduce((acc, l) => {
      const todayPayments = l.payments?.filter((p: any) => {
        const pDate = p.paymentDate || p.createdAt;
        return pDate ? pDate.toString().startsWith(todayStr) : false;
      }) || [];
      const sumToday = todayPayments.reduce((pAcc: number, p: any) => pAcc + Number(p.amount), 0);
      return acc + sumToday;
    }, 0);

    return { carteraTotal, recaudoHoy, enMora, sociosCount };
  };

  const renderView = () => {
    if (activeTab === 'dashboard') {
      return (
        <DashboardView 
          onNewClick={() => setShowAddModal(true)} 
          onPaymentClick={openPayment} 
          onNavigateToRoute={() => setActiveTab('ruta')}
          onAssetClick={() => setShowAssetModal(true)} 
          onEditClient={handleEditClient} 
          customLoans={loans} 
          assets={realAssets}
          todayReceipts={todayReceipts}
          stats={getStats()}
        />
      );
    }
    if (activeTab === 'clientes') return <ClientesView onDataChanged={loadData} />;
    if (activeTab === 'almanaque') return <CalendarView loans={loans} />;
    if (activeTab === 'ruta') return <DailyRouteView />;
    if (activeTab === 'modalidades') return <ModalitiesView />;
    if (activeTab === 'activos') return <AssetsView />;
    if (activeTab === 'inversionistas') return <InversionistasView />;
    if (activeTab === 'auditoria') return <AuditLogsView />;
    return (
      <DashboardView 
        onNewClick={() => setShowAddModal(true)} 
        onPaymentClick={openPayment} 
        onNavigateToRoute={() => setActiveTab('ruta')}
        onAssetClick={() => setShowAssetModal(true)} 
        onEditClient={handleEditClient} 
        customLoans={loans} 
        assets={realAssets}
        todayReceipts={todayReceipts}
        stats={getStats()}
      />
    );
  };

  // Cálculos para el Simulador
  const simAmount = Number(formData.amount) || 0;
  const simRate = Number(formData.interestRate) || 0;
  const simInstallments = Number(formData.installments) || 1;
  const simTotal = simAmount * (1 + (simRate / 100));
  const simCuota = simTotal / simInstallments;

  // Comprobación de Sesión Activa
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-emerald-500 space-y-3">
        <Loader2 className="animate-spin w-10 h-10" />
        <span className="text-xs text-slate-400">Verificando sesión de usuario...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden">
      {/* Menu Móvil Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/98 z-[150] flex flex-col p-8 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-emerald-400 w-6 h-6" />
              <span className="font-bold text-white tracking-tighter text-xl">Inversiones DMR</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center space-y-4">
            {[
              { id: 'dashboard', label: 'Resumen' },
              { id: 'clientes', label: 'Clientes' },
              { id: 'ruta', label: 'Ruta Diaria' },
              { id: 'almanaque', label: 'Almanaque / Calendario' },
              { id: 'modalidades', label: 'Modalidades de Cobro' },
              { id: 'activos', label: 'Mis Activos' },
              { id: 'inversionistas', label: 'Inversionistas / Socios' },
              { id: 'auditoria', label: 'Auditoría del Sistema' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`py-4 px-6 rounded-2xl text-lg font-bold transition-all text-left ${
                  activeTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                authService.logout();
                setCurrentUser(null);
              }}
              className="py-4 px-6 rounded-2xl text-lg font-bold text-red-400 hover:bg-red-500/10 text-left flex items-center space-x-2 mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </nav>
        </div>
      )}

      <div className="hidden lg:block border-r border-slate-800">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={currentUser}
          onLogout={() => {
            authService.logout();
            setCurrentUser(null);
          }}
        />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Superior Universal con Sincronización Offline */}
        <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 md:px-8 z-40 shrink-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 lg:hidden">
              <TrendingUp className="text-emerald-400 w-6 h-6" />
              <span className="font-bold text-white tracking-tighter">Inversiones DMR</span>
            </div>
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Inversiones DMR</span>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold">
                {activeTab === 'dashboard' && 'Resumen Ejecutivo'}
                {activeTab === 'clientes' && 'Gestión de Clientes'}
                {activeTab === 'ruta' && 'Ruta Diaria & Arqueo'}
                {activeTab === 'almanaque' && 'Almanaque y Cobros'}
                {activeTab === 'modalidades' && 'Modalidades de Préstamos'}
                {activeTab === 'inversionistas' && 'Socios e Inversionistas'}
                {activeTab === 'activos' && 'Parque de Activos'}
                {activeTab === 'auditoria' && 'Bitácora de Auditoría'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <OfflineSyncBadge onSyncComplete={loadData} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="max-w-5xl mx-auto space-y-6 pb-24">
            
            {/* Mensaje de Estado / Errores */}
            {statusMessage && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center space-x-3 text-amber-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{statusMessage}</p>
                <button onClick={loadData} className="ml-auto underline font-bold">Reintentar</button>
              </div>
            )}

            {renderView()}
          </div>
        </main>

        <nav className="lg:hidden h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40">
          <button onClick={() => setActiveTab('dashboard')} className={`p-3 ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-500'}`}><LayoutDashboard /></button>
          <button onClick={() => setActiveTab('ruta')} className={`p-3 ${activeTab === 'ruta' ? 'text-emerald-400' : 'text-slate-500'}`}><Map /></button>
          <button onClick={() => setActiveTab('clientes')} className={`p-3 ${activeTab === 'clientes' ? 'text-emerald-400' : 'text-slate-500'}`}><Users /></button>
          <button onClick={() => setActiveTab('auditoria')} className={`p-3 ${activeTab === 'auditoria' ? 'text-emerald-400' : 'text-slate-500'}`}><ShieldCheck /></button>
        </nav>
      </div>

      {/* MODAL: Nuevo Crédito */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Nuevo Crédito</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400"><X /></button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateLoan}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-400 font-medium">Cliente Asignado</label>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {allClients.length} cliente(s) registrados
                    </span>
                  </div>

                  <div className="relative">
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({...formData, name: val, clientId: null});
                          setSelectedClientObject(null);
                          setIsClientDropdownOpen(true);
                        }}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        placeholder="Escribe el nombre o documento del cliente..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-10 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all text-sm" 
                        required 
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                        className="absolute right-3 p-1 text-slate-400 hover:text-white cursor-pointer"
                        title="Ver lista de clientes"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isClientDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                      </button>
                    </div>

                    {/* Dropdown de Clientes flotante */}
                    {isClientDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800">
                        {(() => {
                          const query = (formData.name || '').toLowerCase().trim();
                          const matches = allClients.filter(c => 
                            c.fullName.toLowerCase().includes(query) || 
                            (c.documentId && c.documentId.toLowerCase().includes(query)) ||
                            (c.phone && c.phone.includes(query))
                          );

                          if (matches.length === 0) {
                            return (
                              <div className="p-4 text-center">
                                <p className="text-xs text-slate-400 mb-2">No se encontró cliente coincidente.</p>
                                <div className="inline-flex items-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium">
                                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                  Se creará "{formData.name}" como nuevo cliente
                                </div>
                              </div>
                            );
                          }

                          return matches.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setFormData({ ...formData, name: c.fullName, clientId: c.id });
                                setSelectedClientObject(c);
                                setIsClientDropdownOpen(false);
                              }}
                              className="p-3 hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                  {c.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                                    {c.fullName}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                                    {c.documentId && <span>Doc: {c.documentId}</span>}
                                    {c.phone && <span>• Tel: {c.phone}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  c.status === 'CONGELADO' ? 'bg-blue-500/20 text-blue-400' :
                                  c.status === 'CASTIGADO' ? 'bg-red-500/20 text-red-400' :
                                  'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {c.status || 'ACTIVO'}
                                </span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Indicador de cliente seleccionado */}
                  {selectedClientObject && (
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Cliente seleccionado: <strong>{selectedClientObject.fullName}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientObject(null);
                          setFormData({ ...formData, name: '', clientId: null });
                        }}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Valor Prestado" className="col-span-2 w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Plantilla / Modalidad de Cobro</label>
                  <select value={selectedModalityId} onChange={handleModalityChange} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-emerald-400 font-bold focus:border-emerald-500 transition-all outline-none">
                    <option value="custom">Personalizado (Manual)</option>
                    {modalities.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Frecuencia</label>
                  <select disabled={selectedModalityId !== 'custom'} value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50">
                    <option value="DAILY">Diario</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quincenal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">% Interés</label>
                  <input type="number" disabled={selectedModalityId !== 'custom'} value={formData.interestRate} onChange={(e) => setFormData({...formData, interestRate: e.target.value})} placeholder="20" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" required />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Plazo ({formData.frequency === 'DAILY' ? 'días' : formData.frequency === 'WEEKLY' ? 'semanas' : 'quincenas'})</label>
                  <input type="number" disabled={selectedModalityId !== 'custom'} value={formData.installments} onChange={(e) => setFormData({...formData, installments: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white disabled:opacity-50" required />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-emerald-400 font-bold mb-1 block">Fecha del Primer Cobro (Inicio de Ruta)</label>
                  <input
                    type="date"
                    value={formData.firstPaymentDate}
                    onChange={(e) => setFormData({...formData, firstPaymentDate: e.target.value})}
                    className="w-full bg-slate-900 border border-emerald-600/50 rounded-xl p-3 text-emerald-300 font-bold focus:border-emerald-500 transition-all outline-none"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    * Este crédito se programará automáticamente en la Ruta Diaria y Almanaque de esta fecha.
                  </span>
                </div>
              </div>

              {/* SIMULADOR */}
              {simAmount > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" /> Simulador de Crédito
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between col-span-2 border-b border-emerald-900/30 pb-1">
                      <span className="text-slate-400">Entrega cliente:</span>
                      <span className="text-white">${simAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-b border-emerald-900/30 pb-1">
                      <span className="text-slate-400">Total a cobrar (con {simRate}%):</span>
                      <span className="text-amber-400 font-bold">${simTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-400">Valor de cuota ({simInstallments}):</span>
                      <span className="text-emerald-400 font-bold text-lg">${simCuota.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading || simAmount <= 0} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg flex justify-center transition-all disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Crear Préstamo Real'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Cliente */}
      {showAddClientModal && (
        <CreateClientModal
          existingClients={allClients}
          onClose={() => setShowAddClientModal(false)}
          onSuccess={async (client, loan) => {
            setShowAddClientModal(false);
            await loadData();
            if (loan) {
              alert(`¡Cliente "${client.fullName}" y Crédito #${loan.id} creados exitosamente!`);
            } else {
              alert(`¡Cliente "${client.fullName}" registrado exitosamente!`);
            }
          }}
          onSelectExistingClientForCredit={(c) => {
            setShowAddClientModal(false);
            openAddCreditForClient(c);
          }}
        />
      )}

      {/* MODAL: Cobro & Cuadre */}
      {activePaymentReceipt && (
        <RecordPaymentModal
          receipt={activePaymentReceipt}
          initialStatus={paymentInitialStatus}
          onClose={() => setActivePaymentReceipt(null)}
          onConfirm={handleDashboardPaymentConfirm}
        />
      )}

      {/* MODAL: Renta Moto */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-center">
            {/* Omitiendo ícono directo de Bike para no complicar imports, usamos AlertCircle o texto */}
            <h3 className="font-bold mb-2">Renta Boxer CT 100</h3>
            <button onClick={() => setShowAssetModal(false)} className="w-full py-3 bg-blue-600 rounded-lg font-bold">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: Editar Cliente (desde Dashboard) */}
      {showEditClientModal && selectedClient && (
        <EditClientModal 
          client={selectedClient} 
          onClose={() => {
            setShowEditClientModal(false);
            setSelectedClient(null);
          }} 
          onSuccess={() => {
            setShowEditClientModal(false);
            setSelectedClient(null);
            loadData();
          }} 
        />
      )}
    </div>
  );
};

export default App;
