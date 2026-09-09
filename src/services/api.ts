const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Servicio de Autenticación y Control de Accesos
 */
export const authService = {
  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  },
  getUser(): any | null {
    const userStr = localStorage.getItem('auth_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
  saveSession(token: string, user: any) {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_user');
    window.location.reload();
  },
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    let data: any = {};
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('El servidor se está sincronizando con la base de datos. Por favor recarga la página e intenta de nuevo.');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Credenciales inválidas');
    }
    if (data.token) {
      authService.saveSession(data.token, data.user);
    }
    return data;
  },
  async getMe() {
    const token = authService.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders()
      });
      if (!res.ok) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('auth_user');
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  }
};

/**
 * Helper para inyectar cabeceras y token de autorización JWT
 */
function getHeaders(customHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  const token = authService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Servicio para manejar los créditos y préstamos
 */
export const loanService = {
  async getAll() {
    const res = await fetch(`${API_URL}/loans`, { headers: getHeaders() });
    return await res.json();
  },

  async create(loanData: { name: string; amount: number; installments: number; interestRate?: number; frequency?: string }) {
    const res = await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(loanData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear préstamo');
    }
    return await res.json();
  },

  // Adicionar capital / refinanciar sobre crédito existente
  async addCapital(loanId: number, data: { amount: number; interestRate?: number; installments?: number; frequency?: string; notes?: string }) {
    const res = await fetch(`${API_URL}/loans/${loanId}/add-capital`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al adicionar capital al crédito');
    }
    return await res.json();
  },

  async recordPayment(paymentData: { loanId: number; amount: number }) {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });
    return await res.json();
  }
};

/**
 * Servicio para manejar los activos (Vehículos, Inmuebles, Otros)
 */
export const assetService = {
  async getAll() {
    const res = await fetch(`${API_URL}/assets`, { headers: getHeaders() });
    return await res.json();
  },
  async create(data: { 
    name: string; 
    category?: string; 
    identifier?: string; 
    plate?: string; 
    purchasePrice?: number; 
    dailyTargetIncome?: number;
    status?: string;
    debtPercent?: number;
    soatAmount?: number;
    maintenanceAmount?: number;
    contingencyAmount?: number;
  }) {
    const res = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear activo');
    }
    return await res.json();
  },
  async update(id: number, data: any) {
    const res = await fetch(`${API_URL}/assets/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar activo');
    }
    return await res.json();
  },
  async registerRevenue(assetId: number, amount: number) {
    const res = await fetch(`${API_URL}/assets/revenue`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, assetId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar ingreso de activo');
    }
    return await res.json();
  },
  async getStatus(id: number) {
    const res = await fetch(`${API_URL}/assets/${id}/status`, { headers: getHeaders() });
    return await res.json();
  }
};

export const receiptService = {
  async generateRoute(date: string) {
    const res = await fetch(`${API_URL}/receipts/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al generar la ruta');
    }
    return await res.json();
  },
  async getRouteByDate(date: string) {
    const res = await fetch(`${API_URL}/receipts/date?date=${date}`, { headers: getHeaders() });
    return await res.json();
  },
  async updateStatus(id: number, status: string, amountPaid?: number, paymentMethod?: string, cashAmount?: number, digitalAmount?: number, nextPaymentDate?: string) {
    const res = await fetch(`${API_URL}/receipts/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, amountPaid, paymentMethod, cashAmount, digitalAmount, nextPaymentDate }),
    });
    return await res.json();
  },
  async createManual(loanId: number, date: string) {
    const res = await fetch(`${API_URL}/receipts/manual`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ loanId, date }),
    });
    return await res.json();
  },
  async declareCivicDay(date: string) {
    const res = await fetch(`${API_URL}/receipts/civic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date }),
    });
    return await res.json();
  },
  async closeRoute(payload: string | { date: string; operationalExpenses?: number; expensesDescription?: string; notes?: string }) {
    const body = typeof payload === 'string' ? { date: payload } : payload;
    const res = await fetch(`${API_URL}/receipts/close`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al cerrar la ruta');
    }
    return await res.json();
  },
  async getArqueo(date: string) {
    const res = await fetch(`${API_URL}/receipts/arqueo?date=${date}`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener arqueo');
    }
    return await res.json();
  },
  async isRouteClosed(date: string) {
    const res = await fetch(`${API_URL}/receipts/is-closed?date=${date}`, { headers: getHeaders() });
    return await res.json();
  },
  async checkRouteStatus(date: string) {
    const res = await fetch(`${API_URL}/receipts/status-check?date=${date}`, { headers: getHeaders() });
    return await res.json();
  }
};

export const reportService = {
  async getDailySummary(date: string) {
    const res = await fetch(`${API_URL}/reports/daily?date=${date}`, { headers: getHeaders() });
    return await res.json();
  }
};

export const modalityService = {
  async getAll() {
    const res = await fetch(`${API_URL}/modalities`, { headers: getHeaders() });
    return await res.json();
  },
  async create(data: { name: string; frequency: string; interestRate: number; installments: number }) {
    const res = await fetch(`${API_URL}/modalities`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async delete(id: number) {
    const res = await fetch(`${API_URL}/modalities/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await res.json();
  }
};

export const paymentPromiseService = {
  async getByDate(date: string) {
    const res = await fetch(`${API_URL}/promises/date?date=${date}`, { headers: getHeaders() });
    return await res.json();
  },
  async create(data: { loanId: number; promiseDate: string; amountExpected: number }) {
    const res = await fetch(`${API_URL}/promises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async updateStatus(id: number, status: string) {
    const res = await fetch(`${API_URL}/promises/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return await res.json();
  }
};

export const clientService = {
  async getAll() {
    const res = await fetch(`${API_URL}/clients`, { headers: getHeaders() });
    return await res.json();
  },
  async create(data: { fullName: string; documentId: string; phone: string; address: string; status?: string }) {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: getHeaders(),
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
      headers: getHeaders()
    });
    return await res.json();
  },
  async update(id: number, data: { fullName?: string; documentId?: string; phone?: string; address?: string; status?: string }) {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al actualizar cliente');
    }
    return await res.json();
  },
  async updateStatus(id: number, status: string) {
    const res = await fetch(`${API_URL}/clients/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al actualizar estado del cliente');
    }
    return await res.json();
  }
};

export const investorService = {
  async getAll() {
    const res = await fetch(`${API_URL}/investors`, { headers: getHeaders() });
    return await res.json();
  },
  async create(data: { fullName: string; initialCapital?: number; profitRate?: number; paymentFrequency?: string; nextPayoutDate?: string | null }) {
    const res = await fetch(`${API_URL}/investors`, {
      method: 'POST',
      headers: getHeaders(),
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
      headers: getHeaders(),
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
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al registrar transacción');
    }
    return await res.json();
  },
  async calculateSettlement(params: { startDate: string; endDate: string; operationalExpenses?: number }) {
    const url = new URL(`${API_URL}/investors/settlement`, window.location.origin);
    url.searchParams.set('startDate', params.startDate);
    url.searchParams.set('endDate', params.endDate);
    if (params.operationalExpenses !== undefined) {
      url.searchParams.set('operationalExpenses', String(params.operationalExpenses));
    }
    const res = await fetch(url.toString(), { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al calcular liquidación de inversionistas');
    }
    return await res.json();
  },
  async applySettlement(data: { startDate: string; endDate: string; operationalExpenses?: number; settlements: any[] }) {
    const res = await fetch(`${API_URL}/investors/settlement/apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al aplicar liquidación de inversionistas');
    }
    return await res.json();
  }
};

export const auditService = {
  async getLogs(params?: { limit?: number; action?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    const res = await fetch(`${API_URL}/audit-logs?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al cargar bitácora de auditoría');
    }
    return await res.json();
  }
};
