"use client";

import { cn } from "@/lib/utils";

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
}

interface ScoreBreakdownProps {
  categories: CategoryScore[];
}

export default function ScoreBreakdown({ categories }: ScoreBreakdownProps) {
  return (
    <div className="space-y-4">
      {categories.map((cat, idx) => {
        const percentage = Math.round((cat.score / cat.maxScore) * 100);
        return (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {cat.category}
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  percentage >= 80
                    ? "text-green-600"
                    : percentage >= 60
                    ? "text-orange-500"
                    : "text-red-600"
                )}
              >
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  percentage >= 80
                    ? "bg-green-500"
                    : percentage >= 60
                    ? "bg-orange-400"
                    : "bg-red-500"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
