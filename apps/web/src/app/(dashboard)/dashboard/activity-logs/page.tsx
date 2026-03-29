"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";

const ACTION_LABELS: Record<string, string> = {
  INSPECTION_CREATED: "Denetim Oluşturuldu",
  INSPECTION_COMPLETED: "Denetim Tamamlandı",
  INSPECTION_REVIEWED: "Denetim İncelendi",
  CORRECTIVE_ACTION_CREATED: "Düzeltici Faaliyet Eklendi",
  EVIDENCE_UPLOADED: "Kanıt Yüklendi",
  TUTANAK_CREATED: "Tutanak Oluşturuldu",
  TUTANAK_UPDATED: "Tutanak Güncellendi",
  TUTANAK_SENT: "Tutanak Gönderildi",
  USER_CREATED: "Kullanıcı Oluşturuldu",
  USER_UPDATED: "Kullanıcı Güncellendi",
  BRANCH_CREATED: "Şube Oluşturuldu",
  BRANCH_UPDATED: "Şube Güncellendi",
  BRANCH_DELETED: "Şube Silindi",
  TEMPLATE_CREATED: "Şablon Oluşturuldu",
  TEMPLATE_UPDATED: "Şablon Güncellendi",
  TEMPLATE_DELETED: "Şablon Silindi",
  SCHEDULE_CREATED: "Takvim Oluşturuldu",
  SCHEDULE_UPDATED: "Takvim Güncellendi",
  LOGIN: "Giriş Yapıldı",
  LOGOUT: "Çıkış Yapıldı",
};

type ActionColor = "success" | "info" | "danger" | "warning" | "neutral";

function getActionColor(action: string): ActionColor {
  if (action.includes("CREATED") || action.includes("COMPLETED") || action === "LOGIN")
    return "success";
  if (action.includes("UPDATED") || action.includes("UPLOADED") || action.includes("REVIEWED") || action.includes("SENT"))
    return "info";
  if (action.includes("DELETED") || action === "LOGOUT")
    return "danger";
  return "neutral";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Stats
  const [stats, setStats] = useState<{ action: string; count: number }[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "50",
      };
      if (filterAction) params.action = filterAction;
      if (filterUserId) params.userId = filterUserId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const result = await api.getActivityLogs(params);
      setLogs(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err: any) {
      setError(err.message || "Aktivite kayıtları yüklenemedi");
    }
    setLoading(false);
  }, [page, filterAction, filterUserId, filterStartDate, filterEndDate]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch {
      // Sessiz
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getActivityLogStats();
      setStats(data || []);
    } catch {
      // Sessiz
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  const handleReset = () => {
    setFilterAction("");
    setFilterUserId("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  const uniqueActions = Array.from(
    new Set([...Object.keys(ACTION_LABELS), ...stats.map((s) => s.action)])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History size={24} className="text-primary-800" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Aktivite Kayıtları
            </h2>
            <p className="text-sm text-gray-500">
              Sistemdeki tüm işlemlerin kayıtları
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchLogs(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={16} />
          Yenile
        </button>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Son 30 Gün Özeti
          </h3>
          <div className="flex flex-wrap gap-3">
            {stats
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((stat) => (
                <div
                  key={stat.action}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <Badge variant={getActionColor(stat.action)}>
                    {ACTION_LABELS[stat.action] || stat.action}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-700">
                    {stat.count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filtreler</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              İşlem Tipi
            </label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">Tümü</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Kullanıcı
            </label>
            <select
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">Tümü</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        {(filterAction || filterUserId || filterStartDate || filterEndDate) && (
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-primary-800 hover:text-primary-600 font-medium transition-colors"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-800" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-400 text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Tarih
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Kullanıcı
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      İşlem
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Varlık
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Detay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {log.user ? (
                          <div>
                            <span className="font-medium">
                              {log.user.fullName}
                            </span>
                            <span className="text-xs text-gray-400 block">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Sistem</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionColor(log.action)}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className="font-medium">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-xs text-gray-400 block truncate max-w-[140px]">
                            {log.entityId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 max-w-[250px]">
                        {log.details ? (
                          <div className="space-y-0.5">
                            {Object.entries(log.details as Record<string, any>)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div key={key} className="text-xs truncate">
                                  <span className="text-gray-400">{key}:</span>{" "}
                                  <span className="text-gray-600">
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Toplam {total} kayıt, Sayfa {page}/{totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      let p: number;
                      if (totalPages <= 5) {
                        p = i + 1;
                      } else if (page <= 3) {
                        p = i + 1;
                      } else if (page >= totalPages - 2) {
                        p = totalPages - 4 + i;
                      } else {
                        p = page - 2 + i;
                      }
                      return p;
                    }
                  ).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        p === page
                          ? "bg-primary-800 text-white"
                          : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
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
