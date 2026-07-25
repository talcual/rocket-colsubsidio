export interface Employee {
  id: number;
  code: string;
  name: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  category?: string;
}

export interface CountSession {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  location: string;
  status: 'open' | 'closed';
  started_at: string;
  ended_at?: string;
  notes?: string;
  item_count?: number;
}

export interface CountItem {
  id: number;
  session_id: number;
  product_code: string;
  product_name?: string;
  quantity: number;
  unit?: string;
  input_method: 'manual' | 'voice' | 'camera';
  created_at: string;
}

export type InputMethod = 'manual' | 'voice' | 'camera';

export interface AuditComparison {
  product_code: string;
  product_name: string;
  unit: string;
  expected_quantity: number;
  counted_quantity: number;
  difference: number;
  status: 'match' | 'surplus' | 'deficit';
}

export interface AuditResult {
  date: string;
  session?: CountSession;
  comparison: AuditComparison[];
  summary?: {
    total: number;
    match: number;
    surplus: number;
    deficit: number;
  };
}

export interface AnalyticsData {
  days: number;
  consumption: Array<{
    product_code: string;
    product_name: string;
    unit: string;
    count_date: string;
    total_quantity: number;
  }>;
  topProducts: Array<{
    product_code: string;
    product_name: string;
    unit: string;
    total_quantity: number;
    session_count: number;
  }>;
  inputMethodStats: Array<{
    input_method: string;
    count: number;
  }>;
}
