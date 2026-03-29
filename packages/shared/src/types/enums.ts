export type UserRole = 'admin' | 'manager' | 'inspector';

export type FacilityType = 'magaza' | 'kesimhane' | 'ahir' | 'yufka' | 'depo';

export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed';

export type SeverityLevel = 'critical' | 'major' | 'minor' | 'observation';

export type ChecklistItemType = 'boolean' | 'score' | 'text' | 'photo_required';

export const FacilityTypeLabels: Record<FacilityType, string> = {
  magaza: 'Magaza',
  kesimhane: 'Kesimhane',
  ahir: 'Ahir',
  yufka: 'Yufka Uretim',
  depo: 'Depo',
};

export const InspectionStatusLabels: Record<InspectionStatus, string> = {
  draft: 'Taslak',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandi',
  reviewed: 'Incelendi',
};

export const SeverityLabels: Record<SeverityLevel, string> = {
  critical: 'Kritik',
  major: 'Buyuk',
  minor: 'Kucuk',
  observation: 'Gozlem',
};

export const UserRoleLabels: Record<UserRole, string> = {
  admin: 'Yonetici',
  manager: 'Mudur',
  inspector: 'Denetci',
};
