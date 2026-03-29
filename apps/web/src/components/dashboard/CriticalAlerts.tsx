"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";

const alerts = [
  {
    type: "critical",
    branch: "Adana Seyhan",
    message: "Hijyen puanı kritik seviyenin altında (45/100)",
    time: "2 saat önce",
  },
  {
    type: "critical",
    branch: "Trabzon Merkez",
    message: "Yangın güvenliği eksiklikleri tespit edildi",
    time: "5 saat önce",
  },
  {
    type: "warning",
    branch: "Eskişehir",
    message: "Personel eğitim sertifikaları süresi dolmuş",
    time: "1 gün önce",
  },
  {
    type: "warning",
    branch: "Bursa Nilüfer",
    message: "Düzeltici faaliyet süresi yaklaşıyor",
    time: "2 gün önce",
  },
];

export default function CriticalAlerts() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Kritik Uyarılar
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              alert.type === "critical"
                ? "bg-red-50 border border-red-100"
                : "bg-orange-50 border border-orange-100"
            }`}
          >
            {alert.type === "critical" ? (
              <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-orange-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{alert.branch}</p>
              <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
              <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
