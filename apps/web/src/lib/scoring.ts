export interface CategoryScoreResult {
  categoryId: string;
  categoryName: string;
  earned: number;
  max: number;
  percentage: number;
  weight: number;
  hasCriticalFailure: boolean;
}

export function calculateCategoryScore(
  categoryId: string,
  categoryName: string,
  weight: number,
  items: Array<{ id: string; max_score: number; item_type: string; is_critical: boolean }>,
  responses: Map<string, { score?: number; passed?: boolean }>
): CategoryScoreResult {
  let earned = 0;
  let max = 0;
  let hasCriticalFailure = false;

  for (const item of items) {
    max += item.max_score;
    const response = responses.get(item.id);
    if (!response) continue;

    if (item.item_type === 'boolean') {
      if (response.passed) earned += item.max_score;
      else if (item.is_critical) hasCriticalFailure = true;
    } else if (item.item_type === 'score') {
      earned += response.score ?? 0;
      if (item.is_critical && (response.score ?? 0) < item.max_score * 0.5) {
        hasCriticalFailure = true;
      }
    }
  }

  const percentage = max > 0 ? Math.ceil((earned / max) * 100) : 0;
  return { categoryId, categoryName, earned, max, percentage, weight, hasCriticalFailure };
}

export function calculateOverallScore(categoryScores: CategoryScoreResult[]): number {
  const totalWeight = categoryScores.reduce((sum, cs) => sum + cs.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = categoryScores.reduce(
    (sum, cs) => sum + cs.percentage * (cs.weight / totalWeight),
    0
  );
  return Math.ceil(weightedSum);
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 75) return 'text-green-600';
  if (percentage >= 50) return 'text-orange-500';
  return 'text-red-600';
}

export function getScoreBgColor(percentage: number): string {
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'Mukemmel';
  if (percentage >= 75) return 'Iyi';
  if (percentage >= 50) return 'Orta';
  if (percentage >= 25) return 'Zayif';
  return 'Kritik';
}
