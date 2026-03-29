import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';

const API_URL = Config.API_URL;

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Sunucu hatası' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    return data;
  },

  async logout() {
    await removeToken();
  },

  async getMe() {
    return request<any>('/api/auth/me');
  },

  getToken,
  setToken,
  removeToken,

  // Branches
  async getBranches(facilityType?: string) {
    const params = facilityType ? `?facilityType=${facilityType}` : '';
    return request<any[]>(`/api/branches${params}`);
  },

  async getBranch(id: string) {
    return request<any>(`/api/branches/${id}`);
  },

  // Templates
  async getTemplates(facilityType?: string, includeInactive?: boolean) {
    const query = new URLSearchParams();
    if (facilityType) query.set('facilityType', facilityType);
    if (includeInactive) query.set('includeInactive', 'true');
    const qs = query.toString();
    return request<any[]>(`/api/templates${qs ? `?${qs}` : ''}`);
  },

  async getTemplate(id: string) {
    return request<any>(`/api/templates/${id}`);
  },

  // Inspections
  async getInspections(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: any[]; total: number }>(`/api/inspections${query}`);
  },

  async getInspection(id: string) {
    return request<any>(`/api/inspections/${id}`);
  },

  async createInspection(data: any) {
    return request<any>('/api/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInspection(inspectionId: string, data: any) {
    return request<any>(`/api/inspections/${inspectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteInspection(inspectionId: string) {
    return request<any>(`/api/inspections/${inspectionId}`, {
      method: 'DELETE',
    });
  },

  async saveResponses(inspectionId: string, responses: any[]) {
    return request<any>(`/api/inspections/${inspectionId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  },

  async completeInspection(inspectionId: string) {
    return request<any>(`/api/inspections/${inspectionId}/complete`, { method: 'POST' });
  },

  // Corrective Actions
  async getDeficiencies(inspectionId: string) {
    return request<any[]>(`/api/corrective-actions/inspection/${inspectionId}/deficiencies`);
  },

  async getCorrectiveActions(inspectionId: string) {
    return request<any[]>(`/api/corrective-actions/inspection/${inspectionId}`);
  },

  async createCorrectiveAction(data: { inspectionId: string; responseId: string; description: string }) {
    return request<any>('/api/corrective-actions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadEvidence(actionId: string, photoUri: string, notes?: string) {
    const token = await getToken();
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      name: 'evidence.jpg',
      type: 'image/jpeg',
    } as any);
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_URL}/api/corrective-actions/${actionId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error('Kanıt yüklenemedi');
    return res.json();
  },

  async getPreviousFindings(branchId: string) {
    return request<any[]>(`/api/inspections/previous-findings/${branchId}`);
  },

  async uploadPhoto(inspectionId: string, photoUri: string, responseId?: string) {
    const token = await getToken();
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
    if (responseId) formData.append('responseId', responseId);

    const res = await fetch(`${API_URL}/api/inspections/${inspectionId}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error('Fotoğraf yüklenemedi');
    return res.json();
  },

  // Schedules
  async getSchedules() {
    return request<any[]>('/api/schedules');
  },

  // Notifications
  async getNotifications() {
    return request<any[]>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<any>(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  async savePushToken(expoPushToken: string) {
    return request<any>('/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken }),
    });
  },

  // Reports
  async getDashboard() {
    return request<any>('/api/reports/dashboard');
  },

  // Users (admin)
  async getUsers() {
    return request<any[]>('/api/users');
  },

  async register(data: any) {
    return request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: any) {
    return request<any>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Template management (admin)
  async addCategory(templateId: string, data: any) {
    return request<any>(`/api/templates/${templateId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(categoryId: string) {
    return request<any>(`/api/templates/categories/${categoryId}`, { method: 'DELETE' });
  },

  async addItem(categoryId: string, data: any) {
    return request<any>(`/api/templates/categories/${categoryId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateItem(itemId: string, data: any) {
    return request<any>(`/api/templates/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteItem(itemId: string) {
    return request<any>(`/api/templates/items/${itemId}`, { method: 'DELETE' });
  },

  // Template CRUD
  async createTemplate(data: any) {
    return request<any>('/api/templates', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateTemplate(id: string, data: any) {
    return request<any>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteTemplate(id: string) {
    return request<any>(`/api/templates/${id}`, { method: 'DELETE' });
  },

  async updateCategory(categoryId: string, data: any) {
    return request<any>(`/api/templates/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Branch CRUD
  async getBranches(facilityType?: string) {
    const params = facilityType ? `?facilityType=${facilityType}` : '';
    return request<any[]>(`/api/branches${params}`);
  },

  async createBranch(data: any) {
    return request<any>('/api/branches', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateBranch(id: string, data: any) {
    return request<any>(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteBranch(id: string) {
    return request<any>(`/api/branches/${id}`, { method: 'DELETE' });
  },

  // Schedule CRUD
  async createSchedule(data: any) {
    return request<any>('/api/schedules', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateSchedule(id: string, data: any) {
    return request<any>(`/api/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Facility Types
  async getFacilityTypes() {
    return request<any[]>('/api/facility-types');
  },

  async createFacilityType(data: { key: string; label: string }) {
    return request<any>('/api/facility-types', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateFacilityType(key: string, data: any) {
    return request<any>(`/api/facility-types/${key}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Tutanak
  async getTutanaklar(inspectionId: string) {
    return request<any[]>(`/api/tutanak/inspection/${inspectionId}`);
  },

  async createTutanak(data: { inspectionId: string; title?: string; content: any }) {
    return request<any>('/api/tutanak', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTutanak(id: string, data: { title?: string; content?: any }) {
    return request<any>(`/api/tutanak/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async sendTutanak(id: string) {
    return request<any>(`/api/tutanak/${id}/send`, { method: 'POST' });
  },
};
