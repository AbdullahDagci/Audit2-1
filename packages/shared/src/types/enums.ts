export type UserRole = 'admin' | 'manager' | 'inspector';

export type FacilityType = 'magaza' | 'kesimhane' | 'ahir' | 'yufka' | 'depo';

export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | 'pending_action' | 'reviewed';

export type SeverityLevel = 'critical' | 'major' | 'minor' | 'observation';

export type ChecklistItemType = 'boolean' | 'score' | 'text' | 'photo_required';

export type CorrectiveActionStatus = 'pending' | 'evidence_uploaded' | 'completed';

export type TutanakStatus = 'draft' | 'sent';

export const FacilityTypeLabels: Record<FacilityType, string> = {
  magaza: 'Mağaza',
  kesimhane: 'Kesimhane',
  ahir: 'Ahır',
  yufka: 'Yufka Üretim',
  depo: 'Depo',
};

export const InspectionStatusLabels: Record<InspectionStatus, string> = {
  draft: 'Taslak',
  in_progress: 'Devam Ediyor',
  completed: 'Gönderildi',
  pending_action: 'İşlem Bekliyor',
  reviewed: 'Tamamlandı',
};

export const SeverityLabels: Record<SeverityLevel, string> = {
  critical: 'Kritik',
  major: 'Büyük',
  minor: 'Küçük',
  observation: 'Gözlem',
};

export const UserRoleLabels: Record<UserRole, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  inspector: 'Denetçi',
};

export const CorrectiveActionStatusLabels: Record<CorrectiveActionStatus, string> = {
  pending: 'Bekliyor',
  evidence_uploaded: 'Kanıt Yüklendi',
  completed: 'Tamamlandı',
};

export const TutanakStatusLabels: Record<TutanakStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
};
