import type { InspectionResponse, ChecklistItem, ChecklistCategory } from '../types/database';

export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  earnedScore: number;
  maxScore: number;
  percentage: number;
  weight: number;
  hasCriticalFailure: boolean;
}

export interface OverallScore {
  totalEarned: number;
  totalMax: number;
  percentage: number;
  categoryScores: CategoryScore[];
  criticalFailures: string[];
}

export function calculateCategoryScore(
  category: ChecklistCategory,
  items: ChecklistItem[],
  responses: InspectionResponse[]
): CategoryScore {
  let earnedScore = 0;
  let maxScore = 0;
  let hasCriticalFailure = false;

  for (const item of items) {
    maxScore += item.max_score;
    const response = responses.find((r) => r.checklist_item_id === item.id);

    if (!response) continue;

    if (item.item_type === 'boolean') {
      if (response.passed) {
        earnedScore += item.max_score;
      } else if (item.is_critical) {
        hasCriticalFailure = true;
      }
    } else if (item.item_type === 'score') {
      earnedScore += response.score ?? 0;
      if (item.is_critical && (response.score ?? 0) < item.max_score * 0.5) {
        hasCriticalFailure = true;
      }
    }
  }

  const percentage = maxScore > 0 ? (earnedScore / maxScore) * 100 : 0;

  return {
    categoryId: category.id,
    categoryName: category.name,
    earnedScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    weight: category.weight,
    hasCriticalFailure,
  };
}

export function calculateOverallScore(categoryScores: CategoryScore[]): OverallScore {
  const totalWeight = categoryScores.reduce((sum, cs) => sum + cs.weight, 0);
  const criticalFailures: string[] = [];

  let weightedSum = 0;
  let totalEarned = 0;
  let totalMax = 0;

  for (const cs of categoryScores) {
    weightedSum += cs.percentage * (cs.weight / totalWeight);
    totalEarned += cs.earnedScore;
    totalMax += cs.maxScore;

    if (cs.hasCriticalFailure) {
      criticalFailures.push(cs.categoryName);
    }
  }

  return {
    totalEarned,
    totalMax,
    percentage: Math.round(weightedSum * 100) / 100,
    categoryScores,
    criticalFailures,
  };
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 75) return '#4CAF50';
  if (percentage >= 50) return '#FF9800';
  return '#F44336';
}

export function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'Mükemmel';
  if (percentage >= 75) return 'İyi';
  if (percentage >= 50) return 'Orta';
  if (percentage >= 25) return 'Zayıf';
  return 'Kritik';
}

export function getScoreBadgeClass(percentage: number): string {
  if (percentage >= 75) return 'bg-green-100 text-green-800';
  if (percentage >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
