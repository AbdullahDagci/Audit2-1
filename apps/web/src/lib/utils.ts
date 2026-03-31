import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern: string = "dd MMM yyyy") {
  return format(new Date(date), pattern, { locale: tr });
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "-";
  return Math.round(Number(score)).toString();
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#4CAF50";
  if (score >= 60) return "#FF9800";
  return "#F44336";
}

export function getScoreColorClass(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-orange-500";
  return "text-red-600";
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
    case "tamamlandi":
      return "bg-green-100 text-green-800";
    case "in_progress":
    case "devam_ediyor":
      return "bg-blue-100 text-blue-800";
    case "pending":
    case "beklemede":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
    case "gecikmi":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
