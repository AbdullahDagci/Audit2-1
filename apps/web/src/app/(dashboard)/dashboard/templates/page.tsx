"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface TemplateRow {
  id: string;
  name: string;
  facility_type: string;
  version: number;
  is_active: boolean;
  total_max_score: number;
  created_at: string;
  updated_at: string;
  checklist_categories: {
    id: string;
    name: string;
    sort_order: number;
    weight: number;
    checklist_items: { id: string }[];
  }[];
}

interface TemplateFormData {
  name: string;
  facility_type: string;
  is_active: boolean;
}

const FACILITY_TYPES = [
  { value: "magaza", label: "Magaza" },
  { value: "kesimhane", label: "Kesimhane" },
  { value: "ahir", label: "Ahir" },
  { value: "yufka", label: "Yufka" },
  { value: "depo", label: "Depo" },
];

const facilityLabel = (type: string) =>
  FACILITY_TYPES.find((f) => f.value === type)?.label ?? type;

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [detailTemplate, setDetailTemplate] = useState<TemplateRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<TemplateFormData>({
    name: "",
    facility_type: "magaza",
    is_active: true,
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTemplates();
      // API formatini TemplateRow formatina cevir
      const mapped: TemplateRow[] = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        facility_type: t.facilityType,
        version: t.version,
        is_active: t.isActive,
        total_max_score: t.totalMaxScore,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        checklist_categories: (t.categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          sort_order: c.sortOrder,
          weight: Number(c.weight),
          checklist_items: (c.items || []).map((i: any) => ({ id: i.id })),
        })),
      }));
      setTemplates(mapped);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // helpers
  const itemCount = (t: TemplateRow) =>
    t.checklist_categories?.reduce(
      (sum, c) => sum + (c.checklist_items?.length ?? 0),
      0
    ) ?? 0;

  const categoryCount = (t: TemplateRow) =>
    t.checklist_categories?.length ?? 0;

  // form helpers
  const resetForm = () =>
    setForm({ name: "", facility_type: "magaza", is_active: true });

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (t: TemplateRow) => {
    setForm({
      name: t.name,
      facility_type: t.facility_type,
      is_active: t.is_active,
    });
    setEditingTemplate(t);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createTemplate({
        name: form.name.trim(),
        facilityType: form.facility_type,
        isActive: form.is_active,
      });
      setShowCreateModal(false);
      resetForm();
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingTemplate || !form.name.trim()) return;
    setSaving(true);
    try {
      await api.updateTemplate(editingTemplate.id, {
        name: form.name.trim(),
        facilityType: form.facility_type,
        isActive: form.is_active,
      });
      setEditingTemplate(null);
      resetForm();
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await api.deleteTemplate(deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const toggleActive = async (t: TemplateRow) => {
    try {
      await api.updateTemplate(t.id, { isActive: !t.is_active });
      setTemplates((prev) =>
        prev.map((tmpl) =>
          tmpl.id === t.id ? { ...tmpl, is_active: !tmpl.is_active } : tmpl
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- RENDER ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-600 text-sm">Hata: {error}</p>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-900 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors"
        >
          <Plus size={16} />
          Yeni Sablon
        </button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          Henuz sablon bulunmuyor. Yeni bir sablon olusturun.
        </div>
      )}

      {/* Template cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                <FileText size={24} className="text-primary-800" />
              </div>
              <button onClick={() => toggleActive(template)}>
                <Badge variant={template.is_active ? "success" : "neutral"}>
                  {template.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </button>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {facilityLabel(template.facility_type)}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>v{template.version}</span>
              <span>{itemCount(template)} madde</span>
              <span>{categoryCount(template)} kategori</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Son guncelleme: {formatDate(template.updated_at)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
              <button
                onClick={() => router.push(`/dashboard/templates/${template.id}`)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Eye size={14} />
                Detay / Duzenle
              </button>
              <button
                onClick={() => openEdit(template)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Pencil size={14} />
                Duzenle
              </button>
              <button
                onClick={() => setDeleteConfirm(template)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              >
                <Trash2 size={14} />
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---- CREATE MODAL ---- */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Yeni Sablon Olustur"
      >
        <TemplateForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          saving={saving}
          submitLabel="Olustur"
        />
      </Modal>

      {/* ---- EDIT MODAL ---- */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title="Sablonu Duzenle"
      >
        <TemplateForm
          form={form}
          setForm={setForm}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTemplate(null)}
          saving={saving}
          submitLabel="Kaydet"
        />
      </Modal>

      {/* ---- DELETE CONFIRM MODAL ---- */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Sablonu Sil"
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong>{deleteConfirm?.name}</strong> sablonunu silmek istediginize
          emin misiniz? Bu islem geri alinamaz ve sablona bagli tum kategoriler
          ve maddeler de silinecektir.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Iptal
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </Modal>

      {/* ---- DETAIL MODAL ---- */}
      <Modal
        isOpen={!!detailTemplate}
        onClose={() => setDetailTemplate(null)}
        title={detailTemplate?.name}
        className="max-w-[calc(100%-2rem)] sm:max-w-2xl"
      >
        {detailTemplate && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tesis Turu:</span>{" "}
                <span className="font-medium">
                  {facilityLabel(detailTemplate.facility_type)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Versiyon:</span>{" "}
                <span className="font-medium">v{detailTemplate.version}</span>
              </div>
              <div>
                <span className="text-gray-500">Maks Puan:</span>{" "}
                <span className="font-medium">
                  {detailTemplate.total_max_score}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Durum:</span>{" "}
                <Badge
                  variant={detailTemplate.is_active ? "success" : "neutral"}
                >
                  {detailTemplate.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Kategoriler ({categoryCount(detailTemplate)})
              </h4>
              {detailTemplate.checklist_categories?.length === 0 && (
                <p className="text-xs text-gray-400">
                  Bu sablonda henuz kategori bulunmuyor.
                </p>
              )}
              <div className="space-y-2">
                {detailTemplate.checklist_categories
                  ?.sort((a, b) => a.sort_order - b.sort_order)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-800">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {cat.checklist_items?.length ?? 0} madde / agirlik{" "}
                        {cat.weight}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---- Form Component ----
function TemplateForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  form: TemplateFormData;
  setForm: (f: TemplateFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sablon Adi
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="orn. Magaza Genel Denetim"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tesis Turu
        </label>
        <select
          value={form.facility_type}
          onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {FACILITY_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {ft.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-gray-300 text-primary-800 focus:ring-primary-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Aktif
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Iptal
        </button>
        <button
          onClick={onSubmit}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 text-sm text-white bg-primary-800 rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
