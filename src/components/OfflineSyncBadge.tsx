import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineQueue, syncOfflineQueue, type OfflinePayment } from '../utils/offlineQueue';

interface OfflineSyncBadgeProps {
  onSyncComplete?: () => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingPayments, setPendingPayments] = useState<OfflinePayment[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdated = (e: any) => {
      if (e.detail) {
        setPendingPayments(e.detail);
      } else {
        setPendingPayments(getOfflineQueue());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdated);

    // Initial check
    setPendingPayments(getOfflineQueue());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdated);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncMessage('Sincronizando pagos...');

    try {
      const result = await syncOfflineQueue();
      if (result.success > 0) {
        setSyncMessage(`✓ ${result.success} pago(s) sincronizados`);
        setTimeout(() => setSyncMessage(null), 3500);
      }
      if (result.failed > 0) {
        setSyncMessage(`⚠️ ${result.failed} fallo(s). Reintentando...`);
      }
      setPendingPayments(getOfflineQueue());
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (e) {
      console.error('Error durante sincronización:', e);
      setSyncMessage('Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = pendingPayments.length;

  return (
    <div className="flex items-center space-x-2">
      {/* Indicador de Red */}
      <div 
        className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isOnline 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}
        title={isOnline ? 'Conexión activa con el servidor' : 'Sin conexión a internet. Los cobros se guardarán localmente.'}
      >
        {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
        <span>{isOnline ? 'En línea' : 'Modo Offline'}</span>
      </div>

      {/* Indicador de Pagos Pendientes y Botón Sincronizar */}
      {pendingCount > 0 && (
        <div className="flex items-center space-x-2 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-2xl animate-pulse">
          <span className="text-xs font-bold text-amber-300 flex items-center">
            📡 {pendingCount} {pendingCount === 1 ? 'pago pendiente' : 'pagos pendientes'}
          </span>
          <button
            type="button"
            disabled={isSyncing || !isOnline}
            onClick={handleManualSync}
            className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer"
            title={!isOnline ? 'Se sincronizará automáticamente al recuperar la señal' : 'Enviar pagos encolados al servidor'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
          </button>
        </div>
      )}

      {/* Notificación temporal de éxito de sync */}
      {syncMessage && pendingCount === 0 && (
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-2xl">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{syncMessage}</span>
        </div>
      )}
    </div>
  );
};
