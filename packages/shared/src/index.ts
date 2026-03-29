// Types
export type {
  Profile,
  Branch,
  ChecklistTemplate,
  ChecklistCategory,
  ChecklistItem,
  Inspection,
  InspectionResponse,
  InspectionPhoto,
  CorrectiveAction,
  InspectionSchedule,
  Notification,
  PushToken,
  InspectionWithDetails,
  ChecklistCategoryWithItems,
  ChecklistTemplateWithCategories,
} from './types/database';

export type {
  UserRole,
  FacilityType,
  InspectionStatus,
  SeverityLevel,
  ChecklistItemType,
} from './types/enums';

export {
  FacilityTypeLabels,
  InspectionStatusLabels,
  SeverityLabels,
  UserRoleLabels,
} from './types/enums';

// Utils
export {
  calculateCategoryScore,
  calculateOverallScore,
  getScoreColor,
  getScoreLabel,
  getScoreBadgeClass,
} from './utils/scoring';

export type { CategoryScore, OverallScore } from './utils/scoring';

export {
  calculateDistance,
  isWithinGeofence,
  isValidEmail,
  isValidPhone,
  formatDateTR,
  formatDateTimeTR,
  formatRelativeDate,
} from './utils/validation';
