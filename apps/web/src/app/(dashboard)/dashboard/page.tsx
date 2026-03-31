"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Target, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import BranchPerformance from "@/components/dashboard/BranchPerformance";
import RecentInspections from "@/components/dashboard/RecentInspections";
import CriticalAlerts from "@/components/dashboard/CriticalAlerts";
import TopNonconformities from "@/components/dashboard/TopNonconformities";

interface DashboardStats {
  totalInspections: number;
  avgScore: number;
  criticalCount: number;
  pendingSchedules: number;
}

interface Branch {
  name: string;
  score: number;
}

interface Inspection {
  id: string;
  date: string;
  branch: { name: string };
  inspector: { name: string };
  score: number;
  status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [nonconformities, setNonconformities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, inspectionsRes, allInspectionsRes, nonconformitiesRes] = await Promise.all([
          api.getDashboard(),
          api.getInspections({ limit: "5", sort: "date", order: "desc" }),
          api.getInspections({ limit: "200", sort: "date", order: "desc" }),
          api.getTopNonconformities().catch(() => []),
        ]);

        setStats(dashboardRes.stats);
        setBranches(dashboardRes.branches || []);
        setInspections(inspectionsRes.data || []);
        setAllInspections(allInspectionsRes.data || []);
        setNonconformities(nonconformitiesRes || []);
      } catch (err: any) {
        console.error("Dashboard veri yüklemesi başarısız:", err);
        setError(err.message || "Veriler yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
        <div className="bg-red-50 border border-red-200 rounded-2xl shadow-soft p-6 max-w-md text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-all duration-300 ease-ios"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={ClipboardCheck}
          label="Toplam Denetim"
          value={stats?.totalInspections ?? 0}
          variant="green"
        />
        <StatCard
          icon={Target}
          label="Ortalama Puan"
          value={stats?.avgScore != null ? Math.round(stats.avgScore) : 0}
          variant="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Kritik Bulgular"
          value={stats?.criticalCount ?? 0}
          variant="red"
        />
        <StatCard
          icon={Clock}
          label="Bekleyen Denetim"
          value={stats?.pendingSchedules ?? 0}
          variant="orange"
        />
      </div>

      <BranchPerformance branches={branches} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentInspections inspections={inspections} />
        <CriticalAlerts inspections={allInspections} />
      </div>

      <TopNonconformities data={nonconformities} />
    </div>
  );
}
