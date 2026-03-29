"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Building2,
  Calendar,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import { api } from "@/lib/api";

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getScoreBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="neutral">-</Badge>;
  if (score >= 80) return <Badge variant="success">{score}</Badge>;
  if (score >= 60) return <Badge variant="warning">{score}</Badge>;
  return <Badge variant="danger">{score}</Badge>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="info">Gönderildi</Badge>;
    case "pending_action":
      return <Badge variant="warning">İşlem Bekliyor</Badge>;
    case "reviewed":
      return <Badge variant="success">Tamamlandı</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

interface ManagerInspection {
  id: string;
  branch: { name: string; facilityType: string };
  inspector: { fullName: string };
  status: string;
  scorePercentage: number | null;
  completedAt: string | null;
  createdAt: string;
  scheduledDate: string | null;
  deficiencyCount?: number;
}

export default function ManagerPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<ManagerInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch completed and pending_action inspections
        const [completedRes, pendingRes] = await Promise.all([
          api.getInspections({ status: "completed", limit: "50" }),
          api.getInspections({ status: "pending_action", limit: "50" }),
        ]);

        const allInspections = [
          ...(completedRes.data || []),
          ...(pendingRes.data || []),
        ].sort((a, b) => {
          const dateA = new Date(a.completedAt || a.createdAt).getTime();
          const dateB = new Date(b.completedAt || b.createdAt).getTime();
          return dateB - dateA;
        });

        setInspections(allInspections);
      } catch (err: any) {
        console.error("Şube paneli verileri yüklenirken hata:", err);
        setError(err.message || "Veriler yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const pendingCount = inspections.filter(
    (i) => i.status === "completed" || i.status === "pending_action"
  ).length;

  const criticalCount = inspections.filter(
    (i) => i.status === "pending_action"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-green-600" />
          <p className="text-sm text-gray-500">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatCard
          icon={ClipboardCheck}
          label="Bekleyen Denetimler"
          value={pendingCount}
          variant="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="İşlem Bekleyen Kritik Bulgular"
          value={criticalCount}
          variant="red"
        />
      </div>

      {/* Inspection List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={20} className="text-primary-800" />
            Şube Denetimleri
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Tamamlanan ve işlem bekleyen denetimler
          </p>
        </div>

        {inspections.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <ClipboardCheck size={40} className="text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500 mt-3">
                Henüz bekleyen denetim bulunmuyor.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {inspections.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/dashboard/inspections/${item.id}`)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {item.branch?.name || "-"}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(item.completedAt || item.scheduledDate || item.createdAt)}
                    </span>
                    {item.inspector?.fullName && (
                      <span>Denetçi: {item.inspector.fullName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  {getScoreBadge(item.scorePercentage)}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
