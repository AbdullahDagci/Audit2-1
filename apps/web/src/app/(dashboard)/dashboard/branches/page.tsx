"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";

interface Branch {
  id: string;
  name: string;
  facilityType: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number | null;
  managerId: string | null;
  isActive: boolean;
  manager?: { id: string; fullName: string } | null;
}

const facilityTypes = ["Tümü", "Magaza", "Kesimhane", "Ahir", "Yufka", "Depo"];

const facilityTypeLabels: Record<string, string> = {
  Magaza: "Magaza",
  Kesimhane: "Kesimhane",
  Ahir: "Ahir",
  Yufka: "Yufka",
  Depo: "Depo",
};

function getStatusBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="success">Aktif</Badge>
    : <Badge variant="danger">Pasif</Badge>;
}

export default function BranchesPage() {
  const [activeType, setActiveType] = useState("Tümü");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBranches() {
      setLoading(true);
      setError(null);
      try {
        const facilityParam = activeType === "Tümü" ? undefined : activeType;
        const data = await api.getBranches(facilityParam);
        setBranches(data);
      } catch (err: any) {
        setError(err.message || "Subeler yuklenirken hata olustu");
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, [activeType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {facilityTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === type
                  ? "bg-primary-800 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors">
          <Plus size={16} />
          Yeni Sube
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-800" size={32} />
          <span className="ml-3 text-gray-500 text-sm">Subeler yukleniyor...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-sm">Bu kategoride sube bulunamadi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Sube Adi</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Tesis Tipi</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Adres</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Sehir</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Sorumlu</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Durum</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {facilityTypeLabels[branch.facilityType] || branch.facilityType}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{branch.address || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{branch.city || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{branch.manager?.fullName || "-"}</td>
                  <td className="py-3 px-4">{getStatusBadge(branch.isActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
