import { receiptService } from '../services/api';

export interface OfflinePayment {
  id: string;
  receiptId: number;
  loanId: number;
  clientName: string;
  status: string;
  amountPaid: number;
  paymentMethod: string;
  cashAmount?: number;
  digitalAmount?: number;
  nextPaymentDate?: string;
  timestamp: string;
  lastError?: string;
}

const STORAGE_KEY = 'cola_pagos_pendientes';

export const getOfflineQueue = (): OfflinePayment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error al leer cola offline:', e);
    return [];
  }
};

const saveOfflineQueue = (queue: OfflinePayment[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue);
  } catch (e) {
    console.error('Error al guardar cola offline:', e);
  }
};

export const enqueueOfflinePayment = (payment: Omit<OfflinePayment, 'id' | 'timestamp'>): OfflinePayment => {
  const currentQueue = getOfflineQueue();
  const newEntry: OfflinePayment = {
    ...payment,
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };

  currentQueue.push(newEntry);
  saveOfflineQueue(currentQueue);
  console.log('>> [OFFLINE QUEUE] Pago encolado:', newEntry);
  return newEntry;
};

export const removeOfflinePayment = (id: string) => {
  const currentQueue = getOfflineQueue();
  const filtered = currentQueue.filter(item => item.id !== id);
  saveOfflineQueue(filtered);
};

export const clearOfflineQueue = () => {
  saveOfflineQueue([]);
};

const notifyQueueChange = (queue: OfflinePayment[]) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: queue }));
  }
};

let isCurrentlySyncing = false;

export const syncOfflineQueue = async (
  onProgress?: (synced: number, total: number) => void
): Promise<{ success: number; failed: number }> => {
  if (isCurrentlySyncing) {
    console.log('>> [OFFLINE SYNC] Sincronización ya en curso...');
    return { success: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  isCurrentlySyncing = true;
  notifyQueueChange(queue);

  let success = 0;
  let failed = 0;
  const remaining: OfflinePayment[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await receiptService.updateStatus(
        item.receiptId,
        item.status,
        item.amountPaid,
        item.paymentMethod,
        item.cashAmount,
        item.digitalAmount,
        item.nextPaymentDate
      );
      success++;
      console.log(`>> [OFFLINE SYNC] Recibo #${item.receiptId} sincronizado exitosamente.`);
    } catch (err: any) {
      console.error(`!! [OFFLINE SYNC] Error sincronizando recibo #${item.receiptId}:`, err);
      failed++;
      remaining.push({
        ...item,
        lastError: err.message || 'Error de red o validación'
      });
    }

    if (onProgress) {
      onProgress(i + 1, queue.length);
    }
  }

  saveOfflineQueue(remaining);
  isCurrentlySyncing = false;
  notifyQueueChange(remaining);

  return { success, failed };
};

// Escuchador automático del evento 'online' de la ventana
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('>> [NETWORK] Conexión a internet reestablecida. Iniciando sincronización automática...');
    const queue = getOfflineQueue();
    if (queue.length > 0) {
      await syncOfflineQueue();
    }
  });
}
