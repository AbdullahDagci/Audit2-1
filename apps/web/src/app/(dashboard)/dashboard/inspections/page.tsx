"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Loader2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Plus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";

const STATUS_MAP: Record<string, string> = {
  all: "Tumu",
  scheduled: "Planlanmis",
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  completed: "Gonderildi",
  pending_action: "Islem Bekliyor",
  reviewed: "Onaylandi",
};

const STATUS_CHIPS = Object.entries(STATUS_MAP);

const FACILITY_TYPES: Record<string, string> = {
  all: "Tum Turler",
  magaza: "Magaza",
  kesimhane: "Kesimhane",
  ahir: "Ahir",
  yufka: "Yufka",
  depo: "Depo",
};

function getScoreBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="neutral">-</Badge>;
  const rounded = Math.round(Number(score));
  if (rounded >= 80) return <Badge variant="success">{rounded}</Badge>;
  if (rounded >= 60) return <Badge variant="warning">{rounded}</Badge>;
  return <Badge variant="danger">{rounded}</Badge>;
}

function getStatusBadge(status: string) {
  const label = STATUS_MAP[status] || status;
  switch (status) {
    case "reviewed":
      return <Badge variant="success">{label}</Badge>;
    case "completed":
      return <Badge variant="info">{label}</Badge>;
    case "pending_action":
    case "in_progress":
      return <Badge variant="warning">{label}</Badge>;
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

type SortField = "date" | "score" | "status" | "branch";

export default function InspectionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityTypeFilter, setFacilityTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUserRole(JSON.parse(u).role || "");
    } catch {}
  }, []);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 400);
  };

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
        sort: sortField,
        order: sortOrder,
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (facilityTypeFilter !== "all") params.facilityType = facilityTypeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

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
  }, [page, pageSize, statusFilter, facilityTypeFilter, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "date" ? "desc" : "asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-gray-300" />;
    return sortOrder === "asc"
      ? <ChevronUp size={14} className="text-primary-800" />
      : <ChevronDown size={14} className="text-primary-800" />;
  };

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
    <div className="space-y-4 sm:space-y-6">
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
              placeholder="Sube, denetci veya sablon ara..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all duration-300 ease-ios w-64"
            />
          </div>

          {/* Facility type dropdown */}
          <select
            value={facilityTypeFilter}
            onChange={(e) => {
              setFacilityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all duration-300 ease-ios"
          >
            {Object.entries(FACILITY_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Toplam: <strong className="text-gray-900">{total}</strong></span>
          {userRole === "inspector" && (
            <button
              onClick={() => router.push("/dashboard/inspections/new")}
              className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 transition-all duration-300 ease-ios shadow-soft"
            >
              <Plus size={16} />
              Yeni Denetim
            </button>
          )}
        </div>
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
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ease-ios ${
              statusFilter === value
                ? "bg-primary-800 text-white shadow-soft"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-800" />
            <span className="ml-3 text-sm text-gray-500">Yukleniyor...</span>
          </div>
        ) : inspections.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">
              {searchQuery ? `"${searchQuery}" icin sonuc bulunamadi.` : "Denetim bulunamadi."}
            </span>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th
                    onClick={() => handleSort("date")}
                    className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                  >
                    <span className="flex items-center gap-1">
                      Tarih <SortIcon field="date" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("branch")}
                    className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                  >
                    <span className="flex items-center gap-1">
                      Sube <SortIcon field="branch" />
                    </span>
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                    Denetci
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                    Sablon
                  </th>
                  <th
                    onClick={() => handleSort("score")}
                    className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                  >
                    <span className="flex items-center gap-1">
                      Puan <SortIcon field="score" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                  >
                    <span className="flex items-center gap-1">
                      Durum <SortIcon field="status" />
                    </span>
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                    Islem
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() =>
                      router.push(`/dashboard/inspections/${item.id}`)
                    }
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(item.scheduledDate || item.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.branch?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {item.inspector?.fullName || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {item.template?.name || "-"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getScoreBadge(item.scorePercentage)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary-800 hover:text-primary-900 font-medium">
                          Detay
                        </span>
                        {canDelete(item.status) && (
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            disabled={deleting === item.id}
                            className="text-red-500 hover:text-red-700 transition-colors duration-150 disabled:opacity-50"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
                <p className="text-sm text-gray-500">
                  Toplam {total} kayittan{" "}
                  {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, total)} arasi
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-xl text-sm font-medium hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-ios"
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
                          className={`w-8 h-8 rounded-xl text-sm font-medium transition-all duration-300 ease-ios ${
                            p === page
                              ? "bg-primary-800 text-white shadow-soft"
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
                    className="w-8 h-8 rounded-xl text-sm font-medium hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-ios"
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
