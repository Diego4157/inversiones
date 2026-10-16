import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  PlusCircle,
  PauseCircle,
  CheckCircle,
  ShieldAlert,
  Phone,
  MapPin
} from 'lucide-react';
import { clientService } from '../services/api';
import EditClientModal from '../components/EditClientModal';
import AddCapitalModal from '../components/AddCapitalModal';
import AssignCreditModal from '../components/AssignCreditModal';
import CreateClientModal from '../components/CreateClientModal';

interface ClientesViewProps {
  onNewClientClick?: () => void;
  onAddCreditClick?: (client: any) => void;
  onDataChanged?: () => void;
}

const ClientesView: React.FC<ClientesViewProps> = ({ 
  onNewClientClick, 
  onAddCreditClick,
  onDataChanged 
}) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignCreditTarget, setAssignCreditTarget] = useState<any | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [addCapitalTarget, setAddCapitalTarget] = useState<{ client: any; loan: any } | null>(null);

  const fetchClientes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getAll();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleOpenNewClient = () => {
    if (onNewClientClick) {
      onNewClientClick();
    } else {
      setShowCreateModal(true);
    }
  };

  const handleAssignCredit = (client: any) => {
    if (onAddCreditClick) {
      onAddCreditClick(client);
    } else {
      setAssignCreditTarget(client);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente y todos sus registros asociados?')) return;
    try {
      await clientService.delete(id);
      fetchClientes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error al eliminar cliente');
    }
  };

  const handleStatusChange = async (client: any, newStatus: string) => {
    try {
      await clientService.updateStatus(client.id, newStatus);
      fetchClientes();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado del cliente');
    }
  };

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.documentId && c.documentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONGELADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <PauseCircle className="w-3.5 h-3.5 mr-1" /> Congelado
          </span>
        );
      case 'CASTIGADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Castigado
          </span>
        );
      case 'ACTIVE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Activo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Clientes y Cartera</h2>
          <p className="text-xs text-slate-400 mt-1">
            Asigna créditos al instante, registra nuevos clientes y gestiona el estado de tu cartera
          </p>
        </div>
        <button 
          onClick={handleOpenNewClient}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold flex items-center transition-all cursor-pointer shadow-lg shadow-emerald-500/20 self-start sm:self-auto text-sm shrink-0"
        >
          <UserPlus className="mr-2 w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center space-x-3">
          <Search className="text-slate-400 w-5 h-5 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, documento o teléfono..." 
            className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center space-x-2">
          <span className="text-xs text-slate-400 shrink-0">Filtrar Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-white text-xs font-bold outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-white">Todos los Clientes</option>
            <option value="ACTIVE" className="bg-slate-900 text-emerald-400">Activos</option>
            <option value="CONGELADO" className="bg-slate-900 text-blue-400">Congelados</option>
            <option value="CASTIGADO" className="bg-slate-900 text-red-400">Castigados</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Vista de Clientes: Tarjetas móviles y Tabla Desktop */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex justify-center text-emerald-500">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : (
          <>
            {/* VISTA MÓVIL (Tarjetas) */}
            <div className="block md:hidden divide-y divide-slate-800">
              {filteredClientes.map((c) => {
                const activeLoan = c.loans?.find((l: any) => l.status === 'ACTIVE' || l.status === 'MORA' || l.status === 'CONGELADO');
                const currentBalance = activeLoan ? Number(activeLoan.balance || 0) : 0;

                return (
                  <div key={c.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-white text-base block">{c.fullName}</span>
                        <span className="text-xs text-slate-400">Doc: {c.documentId || 'Sin documento'}</span>
                      </div>
                      <div>
                        {getStatusBadge(c.status || 'ACTIVE')}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      {c.phone && (
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Crédito Activo Móvil */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-slate-400">Crédito Activo:</span>
                      {activeLoan ? (
                        <div className="text-right">
                          <span className="font-bold text-emerald-400 block text-sm">${currentBalance.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500">Crédito #{activeLoan.id} ({activeLoan.frequency})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin crédito</span>
                      )}
                    </div>

                    {/* Botones de acción móvil */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-2">
                        {/* Botón Asignar Crédito directo */}
                        <button
                          onClick={() => handleAssignCredit(c)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          + Crédito
                        </button>

                        {/* Botón Adicionar Capital si tiene crédito */}
                        {activeLoan && (
                          <button
                            onClick={() => setAddCapitalTarget({ client: c, loan: activeLoan })}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" />
                            + Capital
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button 
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer" 
                          onClick={() => setEditingClient(c)}
                          title="Editar Datos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer" 
                          onClick={() => handleDelete(c.id)}
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950/60 text-slate-400 text-xs font-bold uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Cliente / Documento</th>
                    <th className="px-6 py-4">Teléfono & Dirección</th>
                    <th className="px-6 py-4">Estado Cartera</th>
                    <th className="px-6 py-4">Crédito Activo</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredClientes.map((c) => {
                    const activeLoan = c.loans?.find((l: any) => l.status === 'ACTIVE' || l.status === 'MORA' || l.status === 'CONGELADO');
                    const currentBalance = activeLoan ? Number(activeLoan.balance || 0) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-white block">{c.fullName}</span>
                          <span className="text-xs text-slate-500">Doc: {c.documentId || 'Sin documento'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 block">{c.phone || 'Sin teléfono'}</span>
                          <span className="text-xs text-slate-500">{c.address || 'Sin dirección'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start space-y-1.5">
                            {getStatusBadge(c.status || 'ACTIVE')}
                            <select
                              value={c.status || 'ACTIVE'}
                              onChange={(e) => handleStatusChange(c, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none"
                              title="Cambiar estado de cartera"
                            >
                              <option value="ACTIVE" className="bg-slate-900">Marcar Activo</option>
                              <option value="CONGELADO" className="bg-slate-900">Congelar</option>
                              <option value="CASTIGADO" className="bg-slate-900">Castigar</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {activeLoan ? (
                            <div className="space-y-1">
                              <span className="font-bold text-emerald-400 block">${currentBalance.toLocaleString()}</span>
                              <span className="text-xs text-slate-500">Crédito #{activeLoan.id} ({activeLoan.frequency})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sin crédito activo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {/* Botón Asignar Crédito directo al cliente */}
                          <button 
                            onClick={() => handleAssignCredit(c)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all mr-1 cursor-pointer"
                            title="Asignar Crédito a este cliente"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" />
                            + Crédito
                          </button>

                          {/* Botón Agregar Capital para créditos activos */}
                          {activeLoan && (
                            <button 
                              onClick={() => setAddCapitalTarget({ client: c, loan: activeLoan })}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all mr-1 cursor-pointer"
                              title="Adicionar Capital a este crédito"
                            >
                              <PlusCircle className="w-3.5 h-3.5 mr-1" />
                              + Capital
                            </button>
                          )}
                          <button 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer" 
                            onClick={() => setEditingClient(c)}
                            title="Editar Datos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer" 
                            onClick={() => handleDelete(c.id)}
                            title="Eliminar Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredClientes.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                No se encontraron clientes con los filtros aplicados.
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Crear Nuevo Cliente (con Crédito Simultáneo Opcional) */}
      {showCreateModal && (
        <CreateClientModal
          existingClients={clientes}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(client, loan) => {
            setShowCreateModal(false);
            fetchClientes();
            if (onDataChanged) onDataChanged();
            if (loan) {
              alert(`¡Cliente "${client.fullName}" y Crédito #${loan.id} creados exitosamente!`);
            } else {
              alert(`¡Cliente "${client.fullName}" registrado exitosamente!`);
            }
          }}
          onSelectExistingClientForCredit={(existingClient) => {
            setShowCreateModal(false);
            setAssignCreditTarget(existingClient);
          }}
        />
      )}

      {/* Modal: Asignar Crédito directo a cliente seleccionado */}
      {assignCreditTarget && (
        <AssignCreditModal
          client={assignCreditTarget}
          onClose={() => setAssignCreditTarget(null)}
          onSuccess={(newLoan) => {
            setAssignCreditTarget(null);
            fetchClientes();
            if (onDataChanged) onDataChanged();
            alert(`¡Crédito #${newLoan?.id || ''} activado exitosamente para ${assignCreditTarget.fullName}!`);
          }}
        />
      )}

      {/* Modal: Editar Cliente */}
      {editingClient && (
        <EditClientModal 
          client={editingClient} 
          onClose={() => setEditingClient(null)} 
          onSuccess={() => {
            setEditingClient(null);
            fetchClientes();
            if (onDataChanged) onDataChanged();
          }} 
        />
      )}

      {/* Modal: Agregar Capital */}
      {addCapitalTarget && (
        <AddCapitalModal
          client={addCapitalTarget.client}
          loan={addCapitalTarget.loan}
          onClose={() => setAddCapitalTarget(null)}
          onSuccess={() => {
            setAddCapitalTarget(null);
            fetchClientes();
            if (onDataChanged) onDataChanged();
            alert('¡Capital adicionado exitosamente! El crédito y su saldo han sido actualizados.');
          }}
        />
      )}
    </div>
  );
};

export default ClientesView;
