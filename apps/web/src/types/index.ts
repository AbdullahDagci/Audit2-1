export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "inspector" | "manager" | "viewer";
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Branch {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
  geofence_radius: number;
  is_active: boolean;
  created_at: string;
  average_score?: number;
  last_inspection_date?: string;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  facility_type: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: TemplateCategory[];
}

export interface TemplateCategory {
  id: string;
  template_id: string;
  name: string;
  weight: number;
  sort_order: number;
  items: TemplateItem[];
}

export interface TemplateItem {
  id: string;
  category_id: string;
  question: string;
  input_type: "yes_no" | "score" | "text" | "photo" | "multi_select";
  is_required: boolean;
  is_critical: boolean;
  max_score: number;
  sort_order: number;
  options?: string[];
}

export interface Inspection {
  id: string;
  branch_id: string;
  branch_name: string;
  template_id: string;
  inspector_id: string;
  inspector_name: string;
  status: "draft" | "in_progress" | "completed" | "approved";
  overall_score: number;
  started_at: string;
  completed_at?: string;
  location_verified: boolean;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_at: string;
}

export interface InspectionResponse {
  id: string;
  inspection_id: string;
  item_id: string;
  category_name: string;
  question: string;
  value: string;
  score: number;
  max_score: number;
  notes?: string;
  photo_urls?: string[];
  is_critical: boolean;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface CorrectiveAction {
  id: string;
  inspection_id: string;
  response_id: string;
  description: string;
  assigned_to: string;
  due_date: string;
  status: "open" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  completed_at?: string;
}

export interface Schedule {
  id: string;
  branch_id: string;
  branch_name: string;
  template_id: string;
  template_name: string;
  inspector_id: string;
  inspector_name: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  last_inspection_date?: string;
  next_inspection_date: string;
  is_active: boolean;
  status: "on_time" | "upcoming" | "overdue";
}

export interface DashboardStats {
  totalInspections: number;
  averageScore: number;
  criticalFindings: number;
  pendingInspections: number;
  totalInspectionsTrend: number;
  averageScoreTrend: number;
  criticalFindingsTrend: number;
}

export interface BranchPerformanceData {
  name: string;
  score: number;
}

export interface TrendData {
  date: string;
  score: number;
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
}
