const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function removeToken() {
  localStorage.removeItem('auth_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Sunucu hatasi' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<any>('/api/auth/me'),

  register: (data: any) =>
    request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Branches
  getBranches: (facilityType?: string) => {
    const params = facilityType ? `?facilityType=${facilityType}` : '';
    return request<any[]>(`/api/branches${params}`);
  },

  getBranch: (id: string) => request<any>(`/api/branches/${id}`),

  createBranch: (data: any) =>
    request<any>('/api/branches', { method: 'POST', body: JSON.stringify(data) }),

  updateBranch: (id: string, data: any) =>
    request<any>(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Templates
  getTemplates: (facilityType?: string) => {
    const params = facilityType ? `?facilityType=${facilityType}` : '';
    return request<any[]>(`/api/templates${params}`);
  },

  getTemplate: (id: string) => request<any>(`/api/templates/${id}`),

  updateTemplate: (id: string, data: any) =>
    request<any>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTemplate: (id: string) =>
    request<any>(`/api/templates/${id}`, { method: 'DELETE' }),

  createTemplate: (data: any) =>
    request<any>('/api/templates', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  addCategory: (templateId: string, data: any) =>
    request<any>(`/api/templates/${templateId}/categories`, { method: 'POST', body: JSON.stringify(data) }),

  updateCategory: (categoryId: string, data: any) =>
    request<any>(`/api/templates/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCategory: (categoryId: string) =>
    request<any>(`/api/templates/categories/${categoryId}`, { method: 'DELETE' }),

  // Items
  addItem: (categoryId: string, data: any) =>
    request<any>(`/api/templates/categories/${categoryId}/items`, { method: 'POST', body: JSON.stringify(data) }),

  updateItem: (itemId: string, data: any) =>
    request<any>(`/api/templates/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteItem: (itemId: string) =>
    request<any>(`/api/templates/items/${itemId}`, { method: 'DELETE' }),

  // Inspections
  getInspections: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: any[]; total: number }>(`/api/inspections${query}`);
  },

  getInspection: (id: string) => request<any>(`/api/inspections/${id}`),

  deleteInspection: (id: string) =>
    request<any>(`/api/inspections/${id}`, { method: 'DELETE' }),

  updateInspection: (id: string, data: any) =>
    request<any>(`/api/inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: () => request<any[]>('/api/users'),
  updateUser: (id: string, data: any) =>
    request<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Schedules
  getSchedules: () => request<any[]>('/api/schedules'),
  createSchedule: (data: any) =>
    request<any>('/api/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: any) =>
    request<any>(`/api/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: string) =>
    request<any>(`/api/schedules/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<any[]>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<any>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // Reports
  getDashboard: () => request<any>('/api/reports/dashboard'),
  getBranchComparison: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<any[]>(`/api/reports/branch-comparison?${params}`);
  },

  // Corrective Actions
  getDeficiencies: (inspectionId: string) =>
    request<any[]>(`/api/corrective-actions/inspection/${inspectionId}/deficiencies`),

  getCorrectiveActions: (inspectionId: string) =>
    request<any[]>(`/api/corrective-actions/inspection/${inspectionId}`),

  createCorrectiveAction: (data: { inspectionId: string; responseId: string; description: string }) =>
    request<any>('/api/corrective-actions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadEvidence: async (actionId: string, photo: File, notes?: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('photo', photo);
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_URL}/api/corrective-actions/${actionId}/evidence`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Sunucu hatasi' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  getPreviousFindings: (branchId: string) =>
    request<any[]>(`/api/inspections/previous-findings/${branchId}`),

  // Tutanak
  getTutanaklar: (inspectionId: string) =>
    request<any[]>(`/api/tutanak/inspection/${inspectionId}`),

  getTutanak: (id: string) => request<any>(`/api/tutanak/${id}`),

  createTutanak: (data: { inspectionId: string; title?: string; content: any }) =>
    request<any>('/api/tutanak', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTutanak: (id: string, data: { title?: string; content?: any }) =>
    request<any>(`/api/tutanak/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  sendTutanak: (id: string) =>
    request<any>(`/api/tutanak/${id}/send`, { method: 'POST' }),

  // Activity Logs
  getActivityLogs: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(`/api/activity-logs${query}`);
  },

  getActivityLogStats: () =>
    request<{ action: string; count: number }[]>('/api/activity-logs/stats'),
};
