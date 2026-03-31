"use client";

import Badge from "@/components/ui/Badge";

interface Inspection {
  id: string;
  date: string;
  branch: { name: string };
  inspector: { name: string };
  score: number;
  status: string;
}

interface RecentInspectionsProps {
  inspections: Inspection[];
}

function getScoreBadge(score: number) {
  if (score >= 80) return <Badge variant="success">{score}</Badge>;
  if (score >= 60) return <Badge variant="warning">{score}</Badge>;
  return <Badge variant="danger">{score}</Badge>;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "scheduled": return "Planlanmış";
    case "draft": return "Taslak";
    case "in_progress": return "Devam Ediyor";
    case "completed": return "Gönderildi";
    case "pending_action": return "İşlem Bekliyor";
    case "reviewed": return "Onaylandı";
    default: return status;
  }
}

function getStatusBadge(status: string) {
  const label = getStatusLabel(status);
  switch (status) {
    case "reviewed": return <Badge variant="success">{label}</Badge>;
    case "completed": return <Badge variant="info">{label}</Badge>;
    case "pending_action": return <Badge variant="warning">{label}</Badge>;
    case "in_progress": return <Badge variant="warning">{label}</Badge>;
    case "scheduled": return <Badge variant="info">{label}</Badge>;
    case "draft": return <Badge variant="neutral">{label}</Badge>;
    default: return <Badge variant="neutral">{label}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function RecentInspections({ inspections }: RecentInspectionsProps) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Son Denetimler
        </h3>
        <p className="text-sm text-gray-500 text-center py-10">
          Henüz denetim verisi bulunmuyor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Son Denetimler
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-4">Tarih</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-4">Şube</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-4">Denetçi</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 pr-4">Puan</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 pr-4 text-sm text-gray-600">{formatDate(item.date)}</td>
                <td className="py-2.5 pr-4 text-sm font-medium text-gray-900">{item.branch?.name ?? "-"}</td>
                <td className="py-2.5 pr-4 text-sm text-gray-600">{item.inspector?.name ?? "-"}</td>
                <td className="py-2.5 pr-4">{item.score != null ? getScoreBadge(item.score) : "-"}</td>
                <td className="py-2.5">{getStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
