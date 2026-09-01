import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { clientService } from '../services/api';

interface EditClientModalProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: client?.fullName || '',
    documentId: client?.documentId || '',
    phone: client?.phone || '',
    address: client?.address || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await clientService.update(client.id, formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Error al actualizar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Editar Cliente</h3>
          <button onClick={onClose} className="text-slate-400"><X /></button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input 
              type="text" 
              value={formData.fullName} 
              onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
              placeholder="Nombre Completo" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" 
              required 
            />
            <input 
              type="text" 
              value={formData.documentId} 
              onChange={(e) => setFormData({...formData, documentId: e.target.value})} 
              placeholder="Documento de Identidad (Opcional)" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" 
            />
            <input 
              type="text" 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              placeholder="Teléfono" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" 
              required 
            />
            <input 
              type="text" 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              placeholder="Dirección" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg flex justify-center transition-all disabled:opacity-50 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal;
