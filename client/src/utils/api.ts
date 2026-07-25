import axios from 'axios';
import type { Employee, Product, CountSession, CountItem, AuditResult, AnalyticsData } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const employeeApi = {
  login: (code: string) =>
    api.post<Employee>('/employees/login', { code }).then(r => r.data),
  list: () =>
    api.get<Employee[]>('/employees').then(r => r.data),
  create: (code: string, name: string) =>
    api.post<Employee>('/employees', { code, name }).then(r => r.data),
};

export const productApi = {
  search: (q?: string) =>
    api.get<Product[]>('/products', { params: q ? { q } : {} }).then(r => r.data),
  getByCode: (code: string) =>
    api.get<Product>(`/products/${encodeURIComponent(code)}`).then(r => r.data),
  create: (data: Omit<Product, 'id'>) =>
    api.post<Product>('/products', data).then(r => r.data),
};

export const sessionApi = {
  list: (params?: { employee_id?: number; status?: string }) => {
    if (params?.employee_id) {
      const query = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
      return api.get<CountSession[]>(`/sessions/employee/${params.employee_id}${query}`).then(r => r.data);
    }
    return api.get<CountSession[]>('/sessions', { params: params?.status ? { status: params.status } : {} }).then(r => r.data);
  },
  get: (id: number) =>
    api.get<CountSession & { items: CountItem[] }>(`/sessions/${id}`).then(r => r.data),
  create: (employee_id: number, location?: string) =>
    api.post<CountSession>('/sessions', { employee_id, location }).then(r => r.data),
  close: (id: number, notes?: string) =>
    api.put<{ message: string }>(`/sessions/${id}/close`, { notes }).then(r => r.data),
  addItem: (sessionId: number, product_code: string, quantity: number, input_method: string) =>
    api.post<CountItem>(`/sessions/${sessionId}/items`, { product_code, quantity, input_method }).then(r => r.data),
  deleteItem: (sessionId: number, itemId: number) =>
    api.delete(`/sessions/${sessionId}/items/${itemId}`).then(r => r.data),
};

export const auditApi = {
  getAudit: (params: { date?: string; session_id?: number }) =>
    api.get<AuditResult>('/audit', { params }).then(r => r.data),
  importErp: (report_date: string, items: Array<{ product_code: string; product_name?: string; expected_quantity: number; unit?: string }>) =>
    api.post('/audit/erp', { report_date, items }).then(r => r.data),
  getAnalytics: (days?: number) =>
    api.get<AnalyticsData>('/audit/analytics', { params: { days } }).then(r => r.data),
};

export default api;
