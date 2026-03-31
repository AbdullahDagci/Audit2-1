"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Camera,
  Save,
  Send,
  Trash2,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  calculateCategoryScore,
  calculateOverallScore,
  getScoreBgColor,
  getScoreLabel,
} from "@/lib/scoring";

interface ResponseData {
  passed?: boolean;
  score?: number;
  notes?: string;
  textResponse?: string;
}

export default function InspectionFillPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id || "") as string;

  const [inspection, setInspection] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Responses: itemId -> { passed?, score?, notes? }
  const [responses, setResponses] = useState<Map<string, ResponseData>>(
    new Map()
  );
  // Photos: itemId -> File[]
  const [photos, setPhotos] = useState<Map<string, File[]>>(new Map());
  // Expanded categories
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  // Onceki bulgular
  const [previousFindings, setPreviousFindings] = useState<any[]>([]);
  const [findingsExpanded, setFindingsExpanded] = useState(false);
  // Tutanak
  const [showTutanak, setShowTutanak] = useState(false);
  const [tutanakTitle, setTutanakTitle] = useState("Denetim Tutanagi");
  const [tutanakRows, setTutanakRows] = useState<{ label: string; value: string }[]>([
    { label: "Konu", value: "" },
    { label: "Tespit Edilen Durum", value: "" },
    { label: "Alinan Onlem", value: "" },
    { label: "Sonuc", value: "" },
    { label: "Katilimcilar", value: "" },
  ]);
  const [savingTutanak, setSavingTutanak] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await api.getInspection(id);
      setInspection(insp);

      // Onceki bulgulari cek
      if (insp.branchId) {
        try {
          const findings = await api.getPreviousFindings(insp.branchId);
          if (Array.isArray(findings)) {
            setPreviousFindings(findings);
          } else if ((findings as any)?.findings) {
            setPreviousFindings((findings as any).findings);
          }
        } catch {
          setPreviousFindings([]);
        }
      }

      if (insp.template?.categories) {
        const cats = insp.template.categories
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            weight: Number(cat.weight) || 1.0,
            items: (cat.items || [])
              .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
              .map((item: any) => ({
                id: item.id,
                question_text: item.questionText,
                item_type: item.itemType,
                max_score: item.maxScore,
                is_critical: item.isCritical,
                photo_required: item.photoRequired,
                help_text: item.helpText,
              })),
          }));
        setCategories(cats);

        // Ilk kategoriyi ac
        if (cats.length > 0) {
          setExpandedCats(new Set([cats[0].id]));
        }

        // Onceden kaydedilmis yanitlari yukle
        if (insp.responses && insp.responses.length > 0) {
          const existing = new Map<string, ResponseData>();
          insp.responses.forEach((r: any) => {
            existing.set(r.checklistItemId, {
              passed: r.passed,
              score: r.score,
              notes: r.notes || "",
              textResponse: r.textResponse || "",
            });
          });
          setResponses(existing);
        }
      }
    } catch (err: any) {
      alert(err.message || "Denetim yuklenemedi.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Response guncelle
  const updateResponse = (itemId: string, data: Partial<ResponseData>) => {
    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) || {};
      next.set(itemId, { ...existing, ...data });
      return next;
    });
  };

  // Foto ekle
  const addPhoto = (itemId: string, files: FileList) => {
    setPhotos((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) || [];
      next.set(itemId, [...existing, ...Array.from(files)]);
      return next;
    });
  };

  // Foto sil
  const removePhoto = (itemId: string, index: number) => {
    setPhotos((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) || [];
      next.set(
        itemId,
        existing.filter((_, i) => i !== index)
      );
      return next;
    });
  };

  // Kategori ac/kapa
  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Skor hesaplari
  const categoryScores = useMemo(() => {
    return categories.map((cat) => {
      const result = calculateCategoryScore(
        cat.id,
        cat.name,
        cat.weight,
        cat.items,
        responses
      );
      const answeredCount = cat.items.filter((item: any) =>
        responses.has(item.id)
      ).length;
      return { ...result, answeredCount, totalItems: cat.items.length };
    });
  }, [responses, categories]);

  const overallScore = useMemo(
    () => calculateOverallScore(categoryScores),
    [categoryScores]
  );
  const totalAnswered = categoryScores.reduce(
    (sum, cs) => sum + cs.answeredCount,
    0
  );
  const totalItems = categories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );
  const progressPercent = totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0;

  // Payload olustur
  const buildResponsePayload = () => {
    const payload: any[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const resp = responses.get(item.id);
        if (!resp) continue;
        payload.push({
          checklistItemId: item.id,
          passed: resp.passed ?? null,
          score:
            item.item_type === "boolean"
              ? resp.passed
                ? item.max_score
                : 0
              : resp.score ?? 0,
          textResponse: resp.textResponse || null,
          notes: resp.notes || null,
        });
      }
    }
    return payload;
  };

  // Validasyon
  const validate = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    let unansweredCount = 0;
    let missingPhotoCount = 0;

    for (const cat of categories) {
      for (const item of cat.items) {
        const resp = responses.get(item.id);

        if (!resp) {
          unansweredCount++;
          continue;
        }

        if (item.item_type === "boolean" && resp.passed === undefined) {
          unansweredCount++;
          continue;
        }

        if (
          item.item_type === "score" &&
          (resp.score === undefined || resp.score === null)
        ) {
          unansweredCount++;
          continue;
        }

        if (item.item_type === "text" && !resp.textResponse?.trim()) {
          unansweredCount++;
          continue;
        }

        if (item.photo_required) {
          const itemPhotos = photos.get(item.id) || [];
          if (itemPhotos.length === 0) {
            missingPhotoCount++;
          }
        }
      }
    }

    if (unansweredCount > 0)
      errors.push(`${unansweredCount} soru cevaplanmamis.`);
    if (missingPhotoCount > 0)
      errors.push(`${missingPhotoCount} maddede zorunlu fotograf eksik.`);

    return { valid: errors.length === 0, errors };
  };

  // Taslak kaydet
  const handleSaveDraft = async () => {
    const payload = buildResponsePayload();
    if (payload.length === 0) {
      alert("Henuz hicbir soru cevaplanmamis.");
      return;
    }

    setSavingDraft(true);
    try {
      await api.saveResponses(id, payload);
      alert("Taslak kaydedildi.");
    } catch (err: any) {
      alert(err.message || "Taslak kaydedilemedi.");
    }
    setSavingDraft(false);
  };

  // Gonder
  const handleSubmit = async () => {
    const { valid, errors } = validate();

    if (!valid) {
      alert(
        "Eksik Maddeler:\n" +
          errors.join("\n") +
          "\n\nTum sorulari cevaplayin ve zorunlu fotograflari ekleyin."
      );
      return;
    }

    if (
      !confirm(
        "Denetimi tamamlayip gondermek istediginize emin misiniz? Gonderdikten sonra degisiklik yapamazsiniz."
      )
    )
      return;

    setSubmitting(true);
    try {
      const payload = buildResponsePayload();
      await api.saveResponses(id, payload);

      // Fotograflari yukle
      const photoEntries = Array.from(photos.entries());
      for (let i = 0; i < photoEntries.length; i++) {
        const [itemId, itemPhotos] = photoEntries[i];
        for (let j = 0; j < itemPhotos.length; j++) {
          try {
            await api.uploadInspectionPhoto(id, itemPhotos[j], itemId);
          } catch {
            // Sessizce devam et
          }
        }
      }

      await api.completeInspection(id);
      alert("Denetim basariyla gonderildi.");
      router.push("/dashboard/inspections");
    } catch (err: any) {
      alert(err.message || "Denetim gonderilemedi.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary-800" />
        <span className="ml-3 text-sm text-gray-500">
          Denetim formu yukleniyor...
        </span>
      </div>
    );
  }

  if (!inspection || categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-500">
        Denetim formu bulunamadi
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft size={16} />
            Geri
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {inspection.branch?.name}
          </h2>
          <p className="text-sm text-gray-500">
            {inspection.template?.name}
          </p>
        </div>

        {/* Genel skor */}
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${
              overallScore >= 75
                ? "text-green-600"
                : overallScore >= 50
                ? "text-orange-500"
                : "text-red-600"
            }`}
          >
            %{overallScore}
          </div>
          <p className="text-xs text-gray-400">{getScoreLabel(overallScore)}</p>
        </div>
      </div>

      {/* Onceki bulgular */}
      {previousFindings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setFindingsExpanded(!findingsExpanded)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Onceki Denetimden {previousFindings.length} Bulgu
              </span>
            </div>
            {findingsExpanded ? (
              <ChevronUp size={16} className="text-amber-600" />
            ) : (
              <ChevronDown size={16} className="text-amber-600" />
            )}
          </button>
          {findingsExpanded && (
            <div className="border-t border-amber-200 divide-y divide-amber-100">
              {previousFindings.map((f: any, i: number) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm text-amber-900 font-medium">
                    {f.questionText}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {f.categoryName}
                  </p>
                  {f.notes && (
                    <p className="text-xs text-amber-700 mt-1 italic">
                      Not: {f.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ilerleme cubugu */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Ilerleme</span>
          <span className="text-xs font-semibold text-gray-700">
            {totalAnswered} / {totalItems}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(
              progressPercent
            )}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Kategoriler */}
      {categories.map((cat, catIndex) => {
        const isExpanded = expandedCats.has(cat.id);
        const score = categoryScores[catIndex];

        return (
          <div
            key={cat.id}
            className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden"
          >
            {/* Kategori baslik */}
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${getScoreBgColor(
                    score?.percentage || 0
                  )}`}
                >
                  {score?.percentage || 0}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {score?.answeredCount || 0} / {score?.totalItems || 0}{" "}
                    cevaplanmis
                    {cat.weight > 1 && (
                      <span className="ml-2 text-primary-600">
                        x{cat.weight}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {/* Maddeler */}
            {isExpanded && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {cat.items.map((item: any, itemIndex: number) => {
                  const resp = responses.get(item.id);
                  const itemPhotos = photos.get(item.id) || [];

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      {/* Soru */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-400 mt-0.5">
                          {itemIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">
                            {item.question_text}
                          </p>
                          {item.is_critical && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-red-600">
                              <AlertTriangle size={12} />
                              Kritik
                            </span>
                          )}
                          {item.help_text && (
                            <p className="text-xs text-gray-400 mt-1">
                              {item.help_text}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Boolean: Evet / Hayir */}
                      {item.item_type === "boolean" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateResponse(item.id, { passed: true })
                            }
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                              resp?.passed === true
                                ? "bg-green-600 text-white shadow-soft"
                                : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-green-300"
                            }`}
                          >
                            <CheckCircle size={16} />
                            Evet
                          </button>
                          <button
                            onClick={() =>
                              updateResponse(item.id, { passed: false })
                            }
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                              resp?.passed === false
                                ? "bg-red-600 text-white shadow-soft"
                                : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-red-300"
                            }`}
                          >
                            <XCircle size={16} />
                            Hayir
                          </button>
                        </div>
                      )}

                      {/* Score: Sayi input */}
                      {item.item_type === "score" && (
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            max={item.max_score}
                            value={resp?.score ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : Math.min(Number(e.target.value), item.max_score);
                              updateResponse(item.id, { score: val });
                            }}
                            className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-400">
                            / {item.max_score}
                          </span>
                        </div>
                      )}

                      {/* Text tipi */}
                      {item.item_type === "text" && (
                        <textarea
                          value={resp?.textResponse || ""}
                          onChange={(e) =>
                            updateResponse(item.id, {
                              textResponse: e.target.value,
                            })
                          }
                          placeholder="Yanitinizi yazin..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none placeholder:text-gray-300"
                        />
                      )}

                      {/* Not */}
                      <div>
                        <textarea
                          value={resp?.notes || ""}
                          onChange={(e) =>
                            updateResponse(item.id, { notes: e.target.value })
                          }
                          placeholder="Not ekle (opsiyonel)"
                          rows={1}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none placeholder:text-gray-300"
                        />
                      </div>

                      {/* Fotograf yukleme */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            item.photo_required
                              ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          <Camera size={14} />
                          {item.photo_required
                            ? "Fotograf (zorunlu)"
                            : "Fotograf"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                addPhoto(item.id, e.target.files);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {/* Yuklenmis fotolar */}
                        {itemPhotos.map((file, fi) => (
                          <div
                            key={fi}
                            className="relative group w-12 h-12 rounded-lg overflow-hidden border border-gray-200"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removePhoto(item.id, fi)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <Trash2 size={14} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Tutanak modal */}
      {showTutanak && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-float w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Tutanak</h3>
              <button
                onClick={() => setShowTutanak(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Baslik */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Baslik
                </label>
                <input
                  type="text"
                  value={tutanakTitle}
                  onChange={(e) => setTutanakTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                />
              </div>

              {/* Satirlar */}
              {tutanakRows.map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => {
                        const next = [...tutanakRows];
                        next[i] = { ...next[i], label: e.target.value };
                        setTutanakRows(next);
                      }}
                      className="w-40 px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={() =>
                        setTutanakRows(tutanakRows.filter((_, idx) => idx !== i))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={row.value}
                    onChange={(e) => {
                      const next = [...tutanakRows];
                      next[i] = { ...next[i], value: e.target.value };
                      setTutanakRows(next);
                    }}
                    rows={2}
                    placeholder={`${row.label} giriniz...`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none placeholder:text-gray-300"
                  />
                </div>
              ))}

              <button
                onClick={() =>
                  setTutanakRows([...tutanakRows, { label: "", value: "" }])
                }
                className="text-sm text-primary-700 hover:text-primary-900 font-medium"
              >
                + Satir Ekle
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={async () => {
                  setSavingTutanak(true);
                  try {
                    await api.createTutanak({
                      inspectionId: id,
                      title: tutanakTitle,
                      content: tutanakRows,
                    });
                    alert("Tutanak kaydedildi.");
                    setShowTutanak(false);
                  } catch (err: any) {
                    alert(err.message || "Tutanak kaydedilemedi.");
                  }
                  setSavingTutanak(false);
                }}
                disabled={savingTutanak}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {savingTutanak ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Taslak Kaydet
              </button>
              <button
                onClick={async () => {
                  setSavingTutanak(true);
                  try {
                    const tutanak = await api.createTutanak({
                      inspectionId: id,
                      title: tutanakTitle,
                      content: tutanakRows,
                    });
                    await api.sendTutanak(tutanak.id);
                    alert("Tutanak gonderildi.");
                    setShowTutanak(false);
                  } catch (err: any) {
                    alert(err.message || "Tutanak gonderilemedi.");
                  }
                  setSavingTutanak(false);
                }}
                disabled={savingTutanak}
                className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 disabled:opacity-50"
              >
                {savingTutanak ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Gonder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky alt bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalAnswered}</span>{" "}
              / {totalItems}
            </span>
            <button
              onClick={() => setShowTutanak(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <FileText size={14} />
              Tutanak
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
            >
              {savingDraft ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Taslak Kaydet
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || savingDraft}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 transition-all duration-200 shadow-soft disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Gonder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
