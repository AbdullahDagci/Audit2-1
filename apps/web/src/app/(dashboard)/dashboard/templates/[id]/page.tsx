"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X, GripVertical,
  AlertTriangle, Camera, Loader2, ChevronDown, ChevronRight
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";

interface Item {
  id: string;
  questionText: string;
  itemType: string;
  maxScore: number;
  isCritical: boolean;
  photoRequired: boolean;
  helpText: string | null;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
  weight: number;
  sortOrder: number;
  items: Item[];
}

interface Template {
  id: string;
  name: string;
  facilityType: string;
  version: number;
  isActive: boolean;
  totalMaxScore: number;
  categories: Category[];
}

const ITEM_TYPES = [
  { value: "boolean", label: "Evet/Hayır" },
  { value: "score", label: "Puan (0-10)" },
  { value: "text", label: "Metin" },
  { value: "photo_required", label: "Fotoğraf Zorunlu" },
];

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = (params?.id || '') as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Category modal
  const [catModal, setCatModal] = useState<{ open: boolean; editing?: Category }>({ open: false });
  const [catForm, setCatForm] = useState({ name: "", weight: "1.0" });

  // Item modal
  const [itemModal, setItemModal] = useState<{ open: boolean; categoryId?: string; editing?: Item }>({ open: false });
  const [itemForm, setItemForm] = useState({
    questionText: "", itemType: "boolean", maxScore: "10",
    isCritical: false, photoRequired: false, helpText: "",
  });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: string; name: string } | null>(null);

  const [saving, setSaving] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTemplate(templateId);
      setTemplate(data);
      // Expand all categories by default
      setExpandedCats(new Set(data.categories.map((c: Category) => c.id)));
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ===== CATEGORY CRUD =====
  const openAddCategory = () => {
    setCatForm({ name: "", weight: "1.0" });
    setCatModal({ open: true });
  };

  const openEditCategory = (cat: Category) => {
    setCatForm({ name: cat.name, weight: String(cat.weight) });
    setCatModal({ open: true, editing: cat });
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    setSaving(true);
    try {
      if (catModal.editing) {
        await api.updateCategory(catModal.editing.id, {
          name: catForm.name.trim(),
          weight: parseFloat(catForm.weight),
        });
      } else {
        await api.addCategory(templateId, {
          name: catForm.name.trim(),
          weight: parseFloat(catForm.weight),
        });
      }
      setCatModal({ open: false });
      await fetchTemplate();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // ===== ITEM CRUD =====
  const openAddItem = (categoryId: string) => {
    setItemForm({
      questionText: "", itemType: "boolean", maxScore: "10",
      isCritical: false, photoRequired: false, helpText: "",
    });
    setItemModal({ open: true, categoryId });
  };

  const openEditItem = (item: Item) => {
    setItemForm({
      questionText: item.questionText,
      itemType: item.itemType,
      maxScore: String(item.maxScore),
      isCritical: item.isCritical,
      photoRequired: item.photoRequired,
      helpText: item.helpText || "",
    });
    setItemModal({ open: true, editing: item });
  };

  const saveItem = async () => {
    if (!itemForm.questionText.trim()) return;
    setSaving(true);
    try {
      const data = {
        questionText: itemForm.questionText.trim(),
        itemType: itemForm.itemType,
        maxScore: parseInt(itemForm.maxScore),
        isCritical: itemForm.isCritical,
        photoRequired: itemForm.photoRequired,
        helpText: itemForm.helpText || null,
      };
      if (itemModal.editing) {
        await api.updateItem(itemModal.editing.id, data);
      } else {
        await api.addItem(itemModal.categoryId!, data);
      }
      setItemModal({ open: false });
      await fetchTemplate();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // ===== DELETE =====
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "category") {
        await api.deleteCategory(deleteTarget.id);
      } else {
        await api.deleteItem(deleteTarget.id);
      }
      setDeleteTarget(null);
      await fetchTemplate();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-800" />
      </div>
    );
  }

  if (!template) {
    return <div className="text-center py-24 text-red-600">Şablon bulunamadı</div>;
  }

  const totalItems = template.categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/templates")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
          <p className="text-sm text-gray-500">
            {template.categories.length} kategori · {totalItems} madde
          </p>
        </div>
        <Badge variant={template.isActive ? "success" : "neutral"}>
          {template.isActive ? "Aktif" : "Pasif"}
        </Badge>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* Add Category Button */}
      <button
        onClick={openAddCategory}
        className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors"
      >
        <Plus size={16} /> Kategori Ekle
      </button>

      {/* Categories */}
      <div className="space-y-4">
        {template.categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((category) => {
            const isExpanded = expandedCats.has(category.id);
            return (
              <div key={category.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCat(category.id)}
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({category.items.length} madde · ağırlık: {Number(category.weight).toFixed(1)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditCategory(category)}
                      className="p-1.5 text-gray-400 hover:text-primary-800 hover:bg-primary-50 rounded"
                      title="Kategoriyi Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: "category", id: category.id, name: category.name })}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Kategoriyi Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {category.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item, idx) => (
                        <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group">
                          <span className="text-xs text-gray-400 mt-1 w-6 text-right">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-800">{item.questionText}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-400">
                                {ITEM_TYPES.find(t => t.value === item.itemType)?.label} · {item.maxScore} puan
                              </span>
                              {item.isCritical && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> Kritik
                                </span>
                              )}
                              {item.photoRequired && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  <Camera size={10} /> Foto Zorunlu
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditItem(item)}
                              className="p-1.5 text-gray-400 hover:text-primary-800 hover:bg-primary-50 rounded"
                              title="Maddeyi Düzenle"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.questionText })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Maddeyi Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* Add Item Button */}
                    <div className="px-4 py-2">
                      <button
                        onClick={() => openAddItem(category.id)}
                        className="flex items-center gap-1.5 text-xs text-primary-700 hover:text-primary-900 font-medium py-1"
                      >
                        <Plus size={14} /> Madde Ekle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ===== CATEGORY MODAL ===== */}
      <Modal
        isOpen={catModal.open}
        onClose={() => setCatModal({ open: false })}
        title={catModal.editing ? "Kategoriyi Düzenle" : "Yeni Kategori"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı</label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="örn. Temizlik ve Hijyen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ağırlık</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={catForm.weight}
              onChange={(e) => setCatForm({ ...catForm, weight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">Yüksek ağırlık = puanlamada daha etkili</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCatModal({ open: false })} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={saveCategory}
              disabled={saving || !catForm.name.trim()}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-lg hover:bg-primary-900 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== ITEM MODAL ===== */}
      <Modal
        isOpen={itemModal.open}
        onClose={() => setItemModal({ open: false })}
        title={itemModal.editing ? "Maddeyi Düzenle" : "Yeni Madde"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soru Metni</label>
            <textarea
              value={itemForm.questionText}
              onChange={(e) => setItemForm({ ...itemForm, questionText: e.target.value })}
              placeholder="örn. Zemin temiz mi?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yanıt Tipi</label>
              <select
                value={itemForm.itemType}
                onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ITEM_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maks Puan</label>
              <input
                type="number"
                min="1"
                max="100"
                value={itemForm.maxScore}
                onChange={(e) => setItemForm({ ...itemForm, maxScore: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.isCritical}
                onChange={(e) => setItemForm({ ...itemForm, isCritical: e.target.checked })}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-orange-700 font-medium">Kritik Madde</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.photoRequired}
                onChange={(e) => setItemForm({ ...itemForm, photoRequired: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-blue-700 font-medium">Fotoğraf Zorunlu</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yardım Metni (opsiyonel)</label>
            <input
              type="text"
              value={itemForm.helpText}
              onChange={(e) => setItemForm({ ...itemForm, helpText: e.target.value })}
              placeholder="Denetçiye yardımcı bilgi"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setItemModal({ open: false })} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={saveItem}
              disabled={saving || !itemForm.questionText.trim()}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-lg hover:bg-primary-900 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRM ===== */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === "category" ? "Kategoriyi Sil" : "Maddeyi Sil"}
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong>{deleteTarget?.name}</strong> {deleteTarget?.type === "category" ? "kategorisini ve içindeki tüm maddeleri" : "maddesini"} silmek istediğinize emin misiniz?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button
            onClick={confirmDelete}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
