"use client";

import { useEffect, useState, useCallback } from "react";
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

function jsonToCsv(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = val != null ? String(val) : "";
        // Escape quotes and wrap in quotes if needed
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csvContent: string, filename: string) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Turkish characters
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("comparison");
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filter state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [branchComparisonRes, inspectionsRes] = await Promise.all([
        api.getBranchComparison(startDate, endDate),
        api.getInspections({ limit: "1000", sort: "date", order: "desc" }),
      ]);

      // Branch comparison data from filtered API
      const branchList = (branchComparisonRes || []).map((b: any) => ({
        name: b.name || b.branchName || "?",
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

      // Category analysis placeholder
      setCategoryData([]);
    } catch (err: any) {
      console.error("Rapor verileri yuklenirken hata:", err);
      setError(err.message || "Veriler yuklenirken bir hata olustu");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCsv = () => {
    let dataToExport: any[] = [];
    let filename = "rapor.csv";

    if (activeTab === "comparison") {
      dataToExport = branches.map((b) => ({
        "Sube Adi": b.name,
        "Puan": b.score,
      }));
      filename = `sube-karsilastirma_${startDate}_${endDate}.csv`;
    } else if (activeTab === "trend") {
      dataToExport = trendData.map((t) => ({
        "Ay": t.month,
        "Genel Puan": t.genel,
      }));
      filename = `trend-analizi_${startDate}_${endDate}.csv`;
    } else if (activeTab === "category") {
      dataToExport = categoryData.map((c) => ({
        "Kategori": c.category,
        ...c,
      }));
      filename = `kategori-analizi_${startDate}_${endDate}.csv`;
    }

    if (dataToExport.length === 0) {
      alert("Disari aktarilacak veri bulunamadi");
      return;
    }

    const csv = jsonToCsv(dataToExport);
    downloadCsv(csv, filename);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "comparison", label: "Sube Karsilastirma" },
    { key: "trend", label: "Trend Analizi" },
    { key: "category", label: "Kategori Analizi" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Rapor verileri yukleniyor...</span>
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
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition-all duration-300 ease-ios"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-500 hidden sm:inline">Baslangic:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 sm:px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all duration-300 ease-ios"
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <label className="text-sm text-gray-500 hidden sm:inline">Bitis:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 sm:px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all duration-300 ease-ios"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition-all duration-300 ease-ios hover:shadow-soft-lg"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Disari Aktar (CSV)</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-300 ease-ios whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary-800 text-primary-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-soft border border-gray-100/50">
        {activeTab === "comparison" && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 uppercase tracking-wide mb-4">Sube Karsilastirma</h3>
            <BranchComparison branches={branches} />
          </div>
        )}

        {activeTab === "trend" && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 uppercase tracking-wide mb-4">Trend Analizi</h3>
            <TrendAnalysis data={trendData} />
          </div>
        )}

        {activeTab === "category" && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 uppercase tracking-wide mb-4">Kategori Analizi</h3>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500">
                Kategori analizi icin yeterli veri bulunmuyor.
              </div>
            ) : (
              <div className="h-64 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    {/* @ts-ignore - Recharts v2 React 18 type compat */}
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    {/* @ts-ignore */}
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    {/* @ts-ignore */}
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
                    {/* @ts-ignore */}
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
