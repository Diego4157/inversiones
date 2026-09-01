import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { clientService } from '../services/api';
import EditClientModal from '../components/EditClientModal';

interface ClientesViewProps {
  onNewClientClick: () => void;
}

const ClientesView: React.FC<ClientesViewProps> = ({ onNewClientClick }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<any>(null);

  const fetchClientes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getAll();
      setClientes(data);
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
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      await clientService.delete(id);
      fetchClientes();
    } catch (err) {
      alert('Error al eliminar cliente');
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.documentId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Clientes</h2>
        <button 
          onClick={onNewClientClick}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold flex items-center hover:bg-emerald-600 transition-all cursor-pointer"
        >
          <UserPlus className="mr-2 w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center space-x-3">
        <Search className="text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Buscar por nombre o documento..." 
          className="bg-transparent border-none outline-none text-white w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center text-emerald-500"><Loader2 className="animate-spin w-8 h-8" /></div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-700/50 text-slate-300 text-xs font-bold uppercase">
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredClientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-700/20">
                  <td className="px-6 py-4 font-bold text-white">{c.fullName}</td>
                  <td className="px-6 py-4 text-slate-200">{c.documentId}</td>
                  <td className="px-6 py-4 text-slate-200">{c.phone}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="p-2 text-slate-400 hover:text-white" onClick={() => setEditingClient(c)}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-400 hover:text-red-300" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay clientes</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
};

export default ClientesView;
