"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import BranchComparison from "@/components/reports/BranchComparison";
import TrendAnalysis, { TrendDataPoint } from "@/components/reports/TrendAnalysis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MONTH_LABELS: Record<number, string> = {
  0: "Oca",
  1: "Sub",
  2: "Mar",
  3: "Nis",
  4: "May",
  5: "Haz",
  6: "Tem",
  7: "Agu",
  8: "Eyl",
  9: "Eki",
  10: "Kas",
  11: "Ara",
};

interface BranchData {
  name: string;
  score: number;
}

type TabType = "comparison" | "trend" | "category";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("comparison");
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, inspectionsRes] = await Promise.all([
          api.getDashboard(),
          api.getInspections({ limit: "1000", sort: "date", order: "desc" }),
        ]);

        // Branch comparison data
        const branchList = (dashboardRes.branches || []).map((b: any) => ({
          name: b.name,
          score: Math.round(b.avgScore ?? b.score ?? 0),
        }));
        setBranches(branchList);

        // Trend analysis: group inspections by month and calculate avg score
        const inspections = inspectionsRes.data || [];
        const monthMap: Record<string, { total: number; count: number }> = {};

        for (const insp of inspections) {
          if (insp.score == null || !insp.date) continue;
          const d = new Date(insp.date);
          const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
          if (!monthMap[key]) {
            monthMap[key] = { total: 0, count: 0 };
          }
          monthMap[key].total += insp.score;
          monthMap[key].count += 1;
        }

        const trend: TrendDataPoint[] = Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => {
            const month = parseInt(key.split("-")[1], 10);
            const year = key.split("-")[0];
            return {
              month: `${MONTH_LABELS[month]} ${year}`,
              genel: Math.round(val.total / val.count),
            };
          });
        setTrendData(trend);

        // Category analysis: build from branch data if available
        // Keep as placeholder since category-level data requires template-level scores
        setCategoryData([]);
      } catch (err: any) {
        console.error("Rapor verileri yüklenirken hata:", err);
        setError(err.message || "Veriler yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const tabs: { key: TabType; label: string }[] = [
    { key: "comparison", label: "Şube Karşılaştırma" },
    { key: "trend", label: "Trend Analizi" },
    { key: "category", label: "Kategori Analizi" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Rapor verileri yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Hata</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm text-gray-500 mr-2">Baslangic:</label>
            <input
              type="date"
              defaultValue="2026-01-01"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mr-2">Bitis:</label>
            <input
              type="date"
              defaultValue="2026-03-29"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Download size={16} />
            PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
            <Download size={16} />
            Excel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary-800 text-primary-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {activeTab === "comparison" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Şube Karşılaştırma</h3>
            <BranchComparison branches={branches} />
          </div>
        )}

        {activeTab === "trend" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analizi</h3>
            <TrendAnalysis data={trendData} />
          </div>
        )}

        {activeTab === "category" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Analizi</h3>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Kategori analizi icin yeterli veri bulunmuyor.
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
