"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Loader2, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";

// Map API status values to Turkish display labels
const STATUS_MAP: Record<string, string> = {
  all: "Tumu",
  scheduled: "Planlanmis",
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  completed: "Onay Bekliyor",
  reviewed: "Onaylandi",
};

const STATUS_CHIPS = Object.entries(STATUS_MAP);

// Map API facilityType values to Turkish labels
const FACILITY_TYPES: Record<string, string> = {
  all: "Tum Turler",
  restaurant: "Restoran",
  cafe: "Kafe",
  hotel: "Otel",
  factory: "Fabrika",
  warehouse: "Depo",
};

function getScoreBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="neutral">-</Badge>;
  if (score >= 80) return <Badge variant="success">{score}</Badge>;
  if (score >= 60) return <Badge variant="warning">{score}</Badge>;
  return <Badge variant="danger">{score}</Badge>;
}

function getStatusBadge(status: string) {
  const label = STATUS_MAP[status] || status;
  switch (status) {
    case "reviewed":
      return <Badge variant="success">{label}</Badge>;
    case "completed":
      return <Badge variant="info">{label}</Badge>;
    case "in_progress":
      return <Badge variant="warning">{label}</Badge>;
    case "scheduled":
      return <Badge variant="neutral">{label}</Badge>;
    case "draft":
      return <Badge variant="neutral">{label}</Badge>;
    default:
      return <Badge variant="neutral">{label}</Badge>;
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR");
  } catch {
    return dateStr;
  }
}

interface Inspection {
  id: string;
  branch: { name: string; facilityType: string };
  inspector: { fullName: string };
  status: string;
  scorePercentage: number | null;
  completedAt: string | null;
  createdAt: string;
  scheduledDate: string | null;
  template: { name: string };
}

export default function InspectionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityTypeFilter, setFacilityTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (facilityTypeFilter !== "all") params.facilityType = facilityTypeFilter;

      const result = await api.getInspections(params);
      setInspections(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error("Denetimler yuklenirken hata olustu:", err);
      setInspections([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, facilityTypeFilter]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Client-side search filter on branch name
  const filtered = searchQuery
    ? inspections.filter((i) =>
        i.branch?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inspections;

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bu denetimi silmek istediginizden emin misiniz?")) return;
    setDeleting(id);
    try {
      await api.deleteInspection(id);
      await fetchInspections();
    } catch (err) {
      console.error("Denetim silinirken hata olustu:", err);
      alert("Denetim silinemedi.");
    } finally {
      setDeleting(null);
    }
  };

  const canDelete = (status: string) =>
    status === "scheduled" || status === "draft";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Sube ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
          </div>

          {/* Facility type dropdown */}
          <select
            value={facilityTypeFilter}
            onChange={(e) => {
              setFacilityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
          >
            {Object.entries(FACILITY_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors">
          <Download size={16} />
          Disari Aktar
        </button>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_CHIPS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === value
                ? "bg-primary-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-800" />
            <span className="ml-3 text-sm text-gray-500">Yukleniyor...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">Denetim bulunamadi.</span>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Tarih
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Sube
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Denetci
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Sablon
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Puan
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Durum
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">
                    Islem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() =>
                      router.push(`/dashboard/inspections/${item.id}`)
                    }
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(item.scheduledDate || item.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {item.branch?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.inspector?.fullName || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.template?.name || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {getScoreBadge(item.scorePercentage)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary-800 hover:text-primary-900 font-medium">
                          Detay
                        </span>
                        {canDelete(item.status) && (
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            disabled={deleting === item.id}
                            className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            title="Sil"
                          >
                            {deleting === item.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Toplam {total} kayittan{" "}
                  {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, total)} arasi
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg text-sm font-medium hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 2
                    )
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      typeof p === "string" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="w-8 h-8 flex items-center justify-center text-sm text-gray-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium ${
                            p === page
                              ? "bg-primary-800 text-white"
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg text-sm font-medium hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
