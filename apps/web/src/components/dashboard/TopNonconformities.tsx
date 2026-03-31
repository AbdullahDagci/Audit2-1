"use client";

import { AlertOctagon, ShieldAlert } from "lucide-react";

interface NonconformityItem {
  branchName: string;
  itemText: string;
  isCritical: boolean;
  count: number;
}

interface TopNonconformitiesProps {
  data: NonconformityItem[];
}

export default function TopNonconformities({ data }: TopNonconformitiesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-600" />
          En Cok Uygunsuzluk Alan Maddeler
        </h3>
        <p className="text-sm text-gray-400 text-center py-6">
          Son 30 gunde uygunsuzluk bulunmadi.
        </p>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ShieldAlert size={18} className="text-red-600" />
        En Cok Uygunsuzluk Alan Maddeler
      </h3>
      <p className="text-xs text-gray-400 mb-4">Son 30 gun</p>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="relative">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-primary-800 shrink-0">
                    {item.branchName}
                  </span>
                  {item.isCritical && (
                    <AlertOctagon size={12} className="text-red-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate" title={item.itemText}>
                  {item.itemText}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900 shrink-0">
                {item.count}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  item.isCritical ? "bg-red-500" : "bg-orange-400"
                }`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
