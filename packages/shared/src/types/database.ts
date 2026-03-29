import type {
  UserRole,
  FacilityType,
  InspectionStatus,
  SeverityLevel,
  ChecklistItemType,
} from './enums';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  facility_type: FacilityType;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  facility_type: FacilityType;
  name: string;
  version: number;
  is_active: boolean;
  total_max_score: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistCategory {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  weight: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  category_id: string;
  question_text: string;
  item_type: ChecklistItemType;
  max_score: number;
  is_critical: boolean;
  photo_required: boolean;
  help_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface Inspection {
  id: string;
  branch_id: string;
  inspector_id: string;
  template_id: string;
  status: InspectionStatus;
  total_score: number | null;
  max_possible_score: number | null;
  score_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  location_verified: boolean;
  device_info: Record<string, unknown> | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionResponse {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  score: number | null;
  passed: boolean | null;
  text_response: string | null;
  notes: string | null;
  severity: SeverityLevel | null;
  created_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  response_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  caption: string | null;
  taken_at: string;
  created_at: string;
}

export interface CorrectiveAction {
  id: string;
  inspection_id: string;
  response_id: string | null;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completion_photo_path: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionSchedule {
  id: string;
  branch_id: string;
  template_id: string;
  inspector_id: string | null;
  frequency_days: number;
  last_inspection_date: string | null;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_info: Record<string, unknown> | null;
  created_at: string;
}

// Joined types for convenience
export interface InspectionWithDetails extends Inspection {
  branch?: Branch;
  inspector?: Profile;
  template?: ChecklistTemplate;
  responses?: InspectionResponse[];
  photos?: InspectionPhoto[];
}

export interface ChecklistCategoryWithItems extends ChecklistCategory {
  items: ChecklistItem[];
}

export interface ChecklistTemplateWithCategories extends ChecklistTemplate {
  categories: ChecklistCategoryWithItems[];
}
