"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Pencil, Trash2, X } from "lucide-react";
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

interface BranchFormData {
  name: string;
  facilityType: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
}

const facilityTypes = ["Tumu", "Magaza", "Kesimhane", "Ahir", "Yufka", "Depo"];

const facilityTypeLabels: Record<string, string> = {
  Magaza: "Magaza",
  Kesimhane: "Kesimhane",
  Ahir: "Ahir",
  Yufka: "Yufka",
  Depo: "Depo",
};

const facilityTypeOptions = [
  { value: "Magaza", label: "Magaza" },
  { value: "Kesimhane", label: "Kesimhane" },
  { value: "Ahir", label: "Ahir" },
  { value: "Yufka", label: "Yufka" },
  { value: "Depo", label: "Depo" },
];

const emptyForm: BranchFormData = {
  name: "",
  facilityType: "Magaza",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
};

function getStatusBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="success">Aktif</Badge>
    : <Badge variant="danger">Pasif</Badge>;
}

export default function BranchesPage() {
  const [activeType, setActiveType] = useState("Tumu");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success notification
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const facilityParam = activeType === "Tumu" ? undefined : activeType;
      const data = await api.getBranches(facilityParam);
      setBranches(data);
    } catch (err: any) {
      setError(err.message || "Subeler yuklenirken hata olustu");
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || "",
      facilityType: branch.facilityType || "Magaza",
      address: branch.address || "",
      city: branch.city || "",
      latitude: branch.latitude != null ? String(branch.latitude) : "",
      longitude: branch.longitude != null ? String(branch.longitude) : "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleFormChange = (field: keyof BranchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError("Sube adi zorunludur");
      return;
    }
    if (!formData.city.trim()) {
      setFormError("Sehir zorunludur");
      return;
    }

    const payload: any = {
      name: formData.name.trim(),
      facilityType: formData.facilityType,
      address: formData.address.trim(),
      city: formData.city.trim(),
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    try {
      setSaving(true);
      setFormError(null);

      if (editingBranch) {
        await api.updateBranch(editingBranch.id, payload);
        setSuccessMsg("Sube basariyla guncellendi");
      } else {
        await api.createBranch(payload);
        setSuccessMsg("Sube basariyla olusturuldu");
      }

      closeModal();
      fetchBranches();
    } catch (err: any) {
      setFormError(err.message || "Kaydetme islemi basarisiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.deleteBranch(deleteTarget.id);
      setSuccessMsg("Sube basariyla silindi");
      setDeleteTarget(null);
      fetchBranches();
    } catch (err: any) {
      setFormError(err.message || "Silme islemi basarisiz");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success notification */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error notification (from delete etc.) */}
      {formError && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{formError}</span>
          <button onClick={() => setFormError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header: filter chips + new button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {facilityTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-ios ${
                activeType === type
                  ? "bg-primary-800 text-white shadow-soft"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {type === "Tumu" ? "Tumu" : facilityTypeLabels[type] || type}
            </button>
          ))}
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 transition-all duration-300 ease-ios hover:shadow-soft-lg"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Yeni Sube</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-800" size={32} />
          <span className="ml-3 text-gray-500 text-sm">Subeler yukleniyor...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl shadow-soft p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 p-12 text-center">
          <p className="text-gray-500 text-sm">Bu kategoride sube bulunamadi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Sube Adi</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Tesis Tipi</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Adres</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Sehir</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Sorumlu</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Durum</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 whitespace-nowrap">{branch.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {facilityTypeLabels[branch.facilityType] || branch.facilityType}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{branch.address || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{branch.city || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{branch.manager?.fullName || "-"}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(branch.isActive)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-primary-800 hover:bg-primary-50 transition-all duration-300 ease-ios"
                        title="Duzenle"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(branch)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300 ease-ios"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-soft-lg w-full max-w-[calc(100%-2rem)] sm:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBranch ? "Subeyi Duzenle" : "Yeni Sube"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-300 ease-ios"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sube Adi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Sube adini girin"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tesis Tipi <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.facilityType}
                  onChange={(e) => handleFormChange("facilityType", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                >
                  {facilityTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleFormChange("address", e.target.value)}
                  placeholder="Adres bilgisi"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sehir <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFormChange("city", e.target.value)}
                  placeholder="Sehir"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enlem (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleFormChange("latitude", e.target.value)}
                    placeholder="orn: 37.0015"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Boylam (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleFormChange("longitude", e.target.value)}
                    placeholder="orn: 35.3213"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm transition-all duration-300 ease-ios"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 ease-ios"
              >
                Iptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-800 rounded-xl hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-ios"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingBranch ? "Guncelle" : "Olustur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-soft-lg w-full max-w-[calc(100%-2rem)] sm:max-w-sm mx-4">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Subeyi Sil</h3>
              <p className="text-sm text-gray-600">
                <strong>{deleteTarget.name}</strong> subesini silmek istediginize emin misiniz? Bu islem geri alinamaz.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 ease-ios"
              >
                Iptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-ios"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
