const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Servicio para manejar los créditos y préstamos
 */
export const loanService = {
  // Obtener todos los préstamos activos
  async getAll() {
    const res = await fetch(`${API_URL}/loans`);
    return await res.json();
  },

  // Crear un nuevo préstamo
  async create(loanData: { name: string; amount: number; installments: number; interestRate?: number; frequency?: string }) {
    const res = await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    });
    return await res.json();
  },

  // Registrar un pago/abono
  async recordPayment(paymentData: { loanId: number; amount: number }) {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });
    return await res.json();
  }
};

/**
 * Servicio para manejar los activos (La moto)
 */
export const assetService = {
  async getAll() {
    const res = await fetch(`${API_URL}/assets`);
    return await res.json();
  },
  async create(data: { name: string; plate: string; purchasePrice?: number; dailyRentTarget?: number }) {
    const res = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async registerRevenue(assetId: number, amount: number) {
    const res = await fetch(`${API_URL}/assets/revenue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, assetId }),
    });
    return await res.json();
  },
  async getStatus(id: number) {
    const res = await fetch(`${API_URL}/assets/${id}/status`);
    return await res.json();
  }
};

export const receiptService = {
  async generateRoute(date: string) {
    const res = await fetch(`${API_URL}/receipts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al generar la ruta');
    }
    return await res.json();
  },
  async getRouteByDate(date: string) {
    const res = await fetch(`${API_URL}/receipts/date?date=${date}`);
    return await res.json();
  },
  async updateStatus(id: number, status: string, amountPaid?: number, paymentMethod?: string, cashAmount?: number, digitalAmount?: number, nextPaymentDate?: string) {
    const res = await fetch(`${API_URL}/receipts/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, amountPaid, paymentMethod, cashAmount, digitalAmount, nextPaymentDate }),
    });
    return await res.json();
  },
  async createManual(loanId: number, date: string) {
    const res = await fetch(`${API_URL}/receipts/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, date }),
    });
    return await res.json();
  },
  async declareCivicDay(date: string) {
    const res = await fetch(`${API_URL}/receipts/civic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    return await res.json();
  },
  async closeRoute(date: string) {
    const res = await fetch(`${API_URL}/receipts/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al cerrar la ruta');
    }
    return await res.json();
  },
  async isRouteClosed(date: string) {
    const res = await fetch(`${API_URL}/receipts/is-closed?date=${date}`);
    return await res.json();
  },
  async checkRouteStatus(date: string) {
    const res = await fetch(`${API_URL}/receipts/status-check?date=${date}`);
    return await res.json();
  }
};

export const reportService = {
  async getDailySummary(date: string) {
    const res = await fetch(`${API_URL}/reports/daily?date=${date}`);
    return await res.json();
  }
};

export const modalityService = {
  async getAll() {
    const res = await fetch(`${API_URL}/modalities`);
    return await res.json();
  },
  async create(data: { name: string; frequency: string; interestRate: number; installments: number }) {
    const res = await fetch(`${API_URL}/modalities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async delete(id: number) {
    const res = await fetch(`${API_URL}/modalities/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }
};

export const paymentPromiseService = {
  async getByDate(date: string) {
    const res = await fetch(`${API_URL}/promises/date?date=${date}`);
    return await res.json();
  },
  async create(data: { loanId: number; promiseDate: string; amountExpected: number }) {
    const res = await fetch(`${API_URL}/promises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async updateStatus(id: number, status: string) {
    const res = await fetch(`${API_URL}/promises/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  }
};

export const clientService = {
  async getAll() {
    const res = await fetch(`${API_URL}/clients`);
    return await res.json();
  },
  async create(data: { fullName: string; documentId: string; phone: string; address: string }) {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al crear cliente');
    }
    return await res.json();
  },
  async delete(id: number) {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },
  async update(id: number, data: { fullName: string; documentId: string; phone: string; address: string }) {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al actualizar cliente');
    }
    return await res.json();
  }
};

export const investorService = {
  async getAll() {
    const res = await fetch(`${API_URL}/investors`);
    return await res.json();
  },
  async create(data: { fullName: string; initialCapital?: number; profitRate?: number; paymentFrequency?: string; nextPayoutDate?: string | null }) {
    const res = await fetch(`${API_URL}/investors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al registrar inversionista');
    }
    return await res.json();
  },
  async update(id: number, data: { fullName?: string; profitRate?: number; paymentFrequency?: string; nextPayoutDate?: string | null }) {
    const res = await fetch(`${API_URL}/investors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al actualizar inversionista');
    }
    return await res.json();
  },
  async addTransaction(data: { investorId: number; amount: number; type: string }) {
    const res = await fetch(`${API_URL}/investors/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al registrar transacción');
    }
    return await res.json();
  }
};
