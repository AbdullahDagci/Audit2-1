"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";

interface Schedule {
  id: string;
  branch: { id: string; name: string; facilityType: string };
  template: { id: string; name: string };
  inspector: { id: string; fullName: string };
  frequencyDays: number;
  lastInspectionDate: string | null;
  nextDueDate: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  facilityType: string;
}

interface Template {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface ScheduleFormData {
  branchId: string;
  templateId: string;
  inspectorId: string;
  frequencyDays: number;
  nextDueDate: string;
}

const emptyForm: ScheduleFormData = {
  branchId: "",
  templateId: "",
  inspectorId: "",
  frequencyDays: 30,
  nextDueDate: "",
};

function getDaysRemaining(nextDueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusInfo(daysRemaining: number): {
  label: string;
  variant: "danger" | "warning" | "success";
} {
  if (daysRemaining < 0) {
    return { label: "Gecikmis", variant: "danger" };
  }
  if (daysRemaining <= 7) {
    return { label: "Yaklasan", variant: "warning" };
  }
  return { label: "Zamaninda", variant: "success" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR");
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dropdown data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  const fetchSchedules = useCallback(() => {
    setLoading(true);
    api
      .getSchedules()
      .then((data) => {
        setSchedules(data as Schedule[]);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Planlar yuklenirken hata olustu");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const loadDropdowns = useCallback(async () => {
    if (branches.length > 0) return; // already loaded
    setDropdownsLoading(true);
    try {
      const [branchData, templateData, userData] = await Promise.all([
        api.getBranches(),
        api.getTemplates(),
        api.getUsers(),
      ]);
      setBranches(branchData as Branch[]);
      setTemplates(templateData as Template[]);
      setInspectors(
        (userData as User[]).filter(
          (u) => u.role === "inspector" || u.role === "admin"
        )
      );
    } catch {
      setFormError("Form verileri yuklenemedi");
    } finally {
      setDropdownsLoading(false);
    }
  }, [branches.length]);

  const openCreateModal = async () => {
    setEditingSchedule(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
    await loadDropdowns();
  };

  const openEditModal = async (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      branchId: schedule.branch.id,
      templateId: schedule.template.id,
      inspectorId: schedule.inspector.id,
      frequencyDays: schedule.frequencyDays,
      nextDueDate: schedule.nextDueDate
        ? schedule.nextDueDate.substring(0, 10)
        : "",
    });
    setFormError(null);
    setModalOpen(true);
    await loadDropdowns();
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingSchedule(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      !formData.branchId ||
      !formData.templateId ||
      !formData.inspectorId ||
      !formData.nextDueDate
    ) {
      setFormError("Lutfen tum alanlari doldurun");
      return;
    }

    if (formData.frequencyDays < 1) {
      setFormError("Periyot en az 1 gun olmalidir");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSchedule) {
        await api.updateSchedule(editingSchedule.id, formData);
      } else {
        await api.createSchedule(formData);
      }
      closeModal();
      fetchSchedules();
    } catch (err: any) {
      setFormError(
        err.message || "Kayit sirasinda hata olustu"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSchedule(deleteTarget.id);
      setDeleteTarget(null);
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || "Silme islemi basarisiz oldu");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-end">
          <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden p-8">
          <div className="flex items-center justify-center gap-3 text-gray-500">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Planlar yukleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl shadow-soft p-6 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const activeSchedules = schedules.filter((s) => s.isActive);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 transition-all duration-300 ease-ios hover:shadow-soft-lg"
        >
          <Plus size={16} />
          Yeni Plan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Sube
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Sablon
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Denetci
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Periyot (Gun)
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Sonraki Tarih
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Kalan Gun
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Durum
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">
                Islemler
              </th>
            </tr>
          </thead>
          <tbody>
            {activeSchedules.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  Henuz denetim plani bulunmuyor.
                </td>
              </tr>
            ) : (
              activeSchedules.map((schedule) => {
                const daysRemaining = getDaysRemaining(schedule.nextDueDate);
                const status = getStatusInfo(daysRemaining);

                return (
                  <tr
                    key={schedule.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150 ${
                      status.variant === "danger" ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {schedule.branch.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {schedule.template.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {schedule.inspector.fullName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {schedule.frequencyDays} gun
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(schedule.nextDueDate)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium whitespace-nowrap">
                      <span
                        className={
                          status.variant === "danger"
                            ? "text-red-600"
                            : status.variant === "warning"
                            ? "text-orange-600"
                            : "text-green-600"
                        }
                      >
                        {daysRemaining < 0
                          ? `${Math.abs(daysRemaining)} gun gecikmis`
                          : daysRemaining === 0
                          ? "Bugun"
                          : `${daysRemaining} gun`}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(schedule)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-all duration-300 ease-ios"
                          title="Duzenle"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(schedule)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300 ease-ios"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingSchedule ? "Plani Duzenle" : "Yeni Plan Olustur"}
      >
        {dropdownsLoading ? (
          <div className="flex items-center justify-center gap-3 py-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Veriler yukleniyor...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm">{formError}</p>
              </div>
            )}

            {/* Branch Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sube
              </label>
              <select
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 ease-ios"
                disabled={submitting}
              >
                <option value="">Sube secin</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sablon
              </label>
              <select
                value={formData.templateId}
                onChange={(e) =>
                  setFormData({ ...formData, templateId: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 ease-ios"
                disabled={submitting}
              >
                <option value="">Sablon secin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inspector Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Denetci
              </label>
              <select
                value={formData.inspectorId}
                onChange={(e) =>
                  setFormData({ ...formData, inspectorId: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 ease-ios"
                disabled={submitting}
              >
                <option value="">Denetci secin</option>
                {inspectors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periyot (Gun)
              </label>
              <input
                type="number"
                min={1}
                value={formData.frequencyDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequencyDays: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 ease-ios"
                disabled={submitting}
              />
            </div>

            {/* Next Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sonraki Denetim Tarihi
              </label>
              <input
                type="date"
                value={formData.nextDueDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextDueDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 ease-ios"
                disabled={submitting}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 ease-ios disabled:opacity-50"
              >
                Iptal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-800 rounded-xl hover:bg-primary-900 transition-all duration-300 ease-ios disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {editingSchedule ? "Guncelle" : "Olustur"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Plani Sil"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {deleteTarget?.branch.name}
            </span>{" "}
            subesine ait bu denetim planini silmek istediginize emin misiniz? Bu
            islem geri alinamaz.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 ease-ios disabled:opacity-50"
            >
              Vazgec
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 ease-ios disabled:opacity-50"
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              Evet, Sil
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
