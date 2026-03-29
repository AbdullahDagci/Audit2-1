import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  variant?: "green" | "blue" | "orange" | "red";
}

const variantStyles = {
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  variant = "green",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            variantStyles[variant]
          )}
        >
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {trend >= 0 ? "+" : ""}
            {trend}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
      {trendLabel && (
        <p className="text-xs text-gray-400 mt-2">{trendLabel}</p>
      )}
    </div>
  );
}
