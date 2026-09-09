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
import { authService, loanService, modalityService, clientService, assetService, investorService } from './services/api';
import LoginView from './views/LoginView';
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
  ShieldCheck
} from 'lucide-react';
import EditClientModal from './components/EditClientModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(() => authService.getUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [loans, setLoans] = useState<any[]>([]);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [realAssets, setRealAssets] = useState<any[]>([]);
  const [realInvestors, setRealInvestors] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [selectedModalityId, setSelectedModalityId] = useState<string>('custom');
  const [formData, setFormData] = useState({ name: '', amount: '', frequency: 'DAILY', interestRate: '20', installments: '20' });
  const [clientFormData, setClientFormData] = useState({ fullName: '', documentId: '', phone: '', address: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
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
          cuota: `$${((l.totalAmount || 0) / (l.installmentsTotal || 20)).toLocaleString()}`,
          client: l.client
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

  const openPayment = (client: any) => {
    setSelectedClient(client);
    setPaymentAmount(client.cuota.replace(/[^0-9]/g, ''));
    setShowPaymentModal(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loanService.create({
        name: formData.name,
        amount: Number(formData.amount),
        installments: Number(formData.installments),
        interestRate: Number(formData.interestRate),
        frequency: formData.frequency
      });
      setShowAddModal(false);
      setFormData({ name: '', amount: '', frequency: 'DAILY', interestRate: '20', installments: '20' });
      await loadData(); // Recargar después de crear
    } catch (error) {
      alert('Error al crear el crédito. Verifica el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await clientService.create(clientFormData);
      setShowAddClientModal(false);
      setClientFormData({ fullName: '', documentId: '', phone: '', address: '' });
      // Si estamos en la pestaña clientes, queremos que se recargue, 
      // pero ClientesView carga por sí solo al montarse.
      // Por simplicidad, podríamos forzar recarga recargando la tab
      const currentTab = activeTab;
      setActiveTab('dashboard'); 
      setTimeout(() => setActiveTab(currentTab), 10);
      alert('Cliente creado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al crear el cliente');
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
    
    // Calcular recaudo hoy buscando pagos cuya fecha de creación sea la de hoy
    const todayStr = new Date().toISOString().split('T')[0];
    const recaudoHoy = rawLoans.reduce((acc, l) => {
      const todayPayments = l.payments?.filter((p: any) => p.createdAt?.startsWith(todayStr)) || [];
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
          onAssetClick={() => setShowAssetModal(true)} 
          onEditClient={handleEditClient} 
          customLoans={loans} 
          assets={realAssets}
          stats={getStats()}
        />
      );
    }
    if (activeTab === 'clientes') return <ClientesView onNewClientClick={() => setShowAddClientModal(true)} />;
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
        onAssetClick={() => setShowAssetModal(true)} 
        onEditClient={handleEditClient} 
        customLoans={loans} 
        assets={realAssets}
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
              <span className="font-bold text-white tracking-tighter text-xl">JD Inversiones</span>
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
              <span className="font-bold text-white tracking-tighter">JD Inv</span>
            </div>
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">JD Inversiones</span>
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
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="Nombre del Cliente (Existente o Nuevo)" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" 
                    required 
                    title="Si el nombre existe, se enlazará; si no, se creará uno nuevo."
                    list="clients-datalist"
                    autoComplete="off"
                  />
                  <datalist id="clients-datalist">
                    {allClients.map(c => (
                      <option key={c.id} value={c.fullName} />
                    ))}
                  </datalist>
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Nuevo Cliente</h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-slate-400"><X /></button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateClient}>
              <div className="space-y-4">
                <input type="text" value={clientFormData.fullName} onChange={(e) => setClientFormData({...clientFormData, fullName: e.target.value})} placeholder="Nombre Completo" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                <input type="text" value={clientFormData.documentId} onChange={(e) => setClientFormData({...clientFormData, documentId: e.target.value})} placeholder="Documento de Identidad (Opcional)" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                <input type="text" value={clientFormData.phone} onChange={(e) => setClientFormData({...clientFormData, phone: e.target.value})} placeholder="Teléfono" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
                <input type="text" value={clientFormData.address} onChange={(e) => setClientFormData({...clientFormData, address: e.target.value})} placeholder="Dirección" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" required />
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg flex justify-center transition-all disabled:opacity-50 mt-4">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Registrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cobro */}
      {showPaymentModal && selectedClient && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4"><h3 className="font-bold">Cobro: {selectedClient.name}</h3><button onClick={() => setShowPaymentModal(false)}><X /></button></div>
            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full bg-slate-900 p-4 rounded-xl text-2xl font-bold mb-4 border border-slate-700 text-white" />
            <button onClick={() => setShowPaymentModal(false)} className="w-full py-3 bg-emerald-500 rounded-lg font-bold">Confirmar</button>
          </div>
        </div>
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
