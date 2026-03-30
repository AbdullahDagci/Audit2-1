"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface CriticalAlertsProps {
  inspections: any[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr || "-";
  }
}

export default function CriticalAlerts({ inspections }: CriticalAlertsProps) {
  const pendingInspections = (inspections || []).filter(
    (insp: any) => insp.status === "pending_action"
  );

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Kritik Uyarilar
      </h3>
      {pendingInspections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <CheckCircle size={32} className="mb-2 text-green-400" />
          <p className="text-sm">Kritik bulgu yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingInspections.map((insp: any) => {
            const branchName =
              insp.branch?.name || insp.branchName || "Bilinmeyen Sube";
            const score =
              insp.scorePercentage ??
              (insp.maxPossibleScore > 0
                ? Math.round((insp.totalScore / insp.maxPossibleScore) * 100)
                : insp.score ?? 0);
            const isCritical = score < 60;

            return (
              <div
                key={insp.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  isCritical
                    ? "bg-red-50 border border-red-100"
                    : "bg-orange-50 border border-orange-100"
                }`}
              >
                <AlertTriangle
                  size={20}
                  className={`${
                    isCritical ? "text-red-500" : "text-orange-500"
                  } mt-0.5 shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">
                      {branchName}
                    </p>
                    <Badge variant="warning">Islem Bekliyor</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600">
                      Puan: <strong>{score}/100</strong>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(insp.date || insp.completedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
