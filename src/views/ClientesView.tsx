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
  DollarSign
} from 'lucide-react';
import { clientService } from '../services/api';
import EditClientModal from '../components/EditClientModal';
import AddCapitalModal from '../components/AddCapitalModal';

interface ClientesViewProps {
  onNewClientClick: () => void;
}

const ClientesView: React.FC<ClientesViewProps> = ({ onNewClientClick }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingClient, setEditingClient] = useState<any>(null);

  // Estado para modal de Agregar Capital
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

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente y todos sus registros asociados?')) return;
    try {
      await clientService.delete(id);
      fetchClientes();
    } catch (err) {
      alert('Error al eliminar cliente');
    }
  };

  const handleStatusChange = async (client: any, newStatus: string) => {
    try {
      await clientService.updateStatus(client.id, newStatus);
      fetchClientes();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado del cliente');
    }
  };

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.documentId.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONGELADO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <PauseCircle className="w-3.5 h-3.5 mr-1" /> Congelado
          </span>
        );
      case 'CASTIGADO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Castigado
          </span>
        );
      case 'ACTIVE':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Activo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Clientes y Cartera</h2>
          <p className="text-xs text-slate-400 mt-1">Supervisa estados de crédito, adiciona capital y gestiona cartera congelada/castigada</p>
        </div>
        <button 
          onClick={onNewClientClick}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold flex items-center transition-all cursor-pointer shadow-lg shadow-emerald-500/20 self-start text-sm"
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
            placeholder="Buscar por nombre o documento..." 
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

      {/* Tabla de Clientes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex justify-center text-emerald-500"><Loader2 className="animate-spin w-8 h-8" /></div>
        ) : (
          <div className="overflow-x-auto">
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
                        <span className="text-xs text-slate-500">Doc: {c.documentId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 block">{c.phone || 'Sin teléfono'}</span>
                        <span className="text-xs text-slate-500">{c.address || 'Sin dirección'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
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
                {filteredClientes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No se encontraron clientes con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar Cliente */}
      {editingClient && (
        <EditClientModal 
          client={editingClient} 
          onClose={() => setEditingClient(null)} 
          onSuccess={() => {
            setEditingClient(null);
            fetchClientes();
          }} 
        />
      )}

      {/* Modal Agregar Capital */}
      {addCapitalTarget && (
        <AddCapitalModal
          client={addCapitalTarget.client}
          loan={addCapitalTarget.loan}
          onClose={() => setAddCapitalTarget(null)}
          onSuccess={() => {
            setAddCapitalTarget(null);
            fetchClientes();
            alert('¡Capital adicionado exitosamente! El crédito y su saldo han sido actualizados.');
          }}
        />
      )}
    </div>
  );
};

export default ClientesView;
