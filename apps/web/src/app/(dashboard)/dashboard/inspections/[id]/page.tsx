"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  User,
  Clock,
  Shield,
  Camera,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  FileWarning,
  History,
  FileText,
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import ScoreBreakdown from "@/components/inspections/ScoreBreakdown";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function photoUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="info">Gönderildi</Badge>;
    case "pending_action":
      return <Badge variant="warning">İşlem Bekliyor</Badge>;
    case "reviewed":
      return <Badge variant="success">Tamamlandı</Badge>;
    case "approved":
      return <Badge variant="success">Onaylandı</Badge>;
    case "rejected":
      return <Badge variant="danger">Reddedildi</Badge>;
    case "in_progress":
      return <Badge variant="warning">Devam Ediyor</Badge>;
    case "scheduled":
      return <Badge variant="info">Planlanmış</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

function getSeverityBadge(severity: string | null | undefined) {
  switch (severity) {
    case "critical":
      return <Badge variant="danger">Kritik</Badge>;
    case "high":
      return <Badge variant="danger">Yüksek</Badge>;
    case "medium":
      return <Badge variant="warning">Orta</Badge>;
    case "low":
      return <Badge variant="info">Düşük</Badge>;
    default:
      return null;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "critical":
      return <Badge variant="danger">Kritik</Badge>;
    case "high":
      return <Badge variant="danger">Yüksek</Badge>;
    case "medium":
      return <Badge variant="warning">Orta</Badge>;
    case "low":
      return <Badge variant="info">Düşük</Badge>;
    default:
      return <Badge variant="neutral">{priority}</Badge>;
  }
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

function getAnswerLabel(value: string | number | boolean | null | undefined): string {
  if (value === true || value === "yes" || value === "evet") return "Evet";
  if (value === false || value === "no" || value === "hayir") return "Hayır";
  if (value === "partial" || value === "kismi") return "Kısmi";
  if (value === "na" || value === "n/a") return "U/D";
  if (value != null) return String(value);
  return "-";
}

function getAnswerColor(value: string | number | boolean | null | undefined): string {
  if (value === true || value === "yes" || value === "evet") return "text-green-600";
  if (value === false || value === "no" || value === "hayir") return "text-red-600";
  if (value === "partial" || value === "kismi") return "text-orange-500";
  return "text-gray-600";
}

// ------- Fullscreen Photo Viewer -------
function FullscreenViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) setIndex(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, photos.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
      >
        <X size={28} />
      </button>
      {index > 0 && (
        <button
          onClick={() => setIndex(index - 1)}
          className="absolute left-4 text-white hover:text-gray-300 transition-colors"
        >
          <ChevronLeft size={36} />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={() => setIndex(index + 1)}
          className="absolute right-4 text-white hover:text-gray-300 transition-colors"
        >
          <ChevronRight size={36} />
        </button>
      )}
      <div className="max-w-4xl w-full mx-4">
        <img
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          className="max-h-[80vh] mx-auto rounded-xl object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <p className="text-center text-gray-400 mt-3 text-sm">
          {index + 1} / {photos.length}
        </p>
      </div>
    </div>
  );
}

// ------- Main Page -------
export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = (params?.id || '') as string;

  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Tutanak state
  const [tutanaklar, setTutanaklar] = useState<any[]>([]);
  const [loadingTutanaklar, setLoadingTutanaklar] = useState(false);

  // Corrective action state
  const [deficiencies, setDeficiencies] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [newActionDesc, setNewActionDesc] = useState<Record<string, string>>({});
  const [newActionFiles, setNewActionFiles] = useState<Record<string, File | null>>({});
  const [uploadingEvidence, setUploadingEvidence] = useState<string | null>(null);
  const [creatingAction, setCreatingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previousFindings, setPreviousFindings] = useState<any[]>([]);
  const [showPreviousFindings, setShowPreviousFindings] = useState(false);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Photo viewer
  const [viewerPhotos, setViewerPhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchInspection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInspection(inspectionId);
      setInspection(data);
      // Auto-expand first category
      if (data?.template?.categories?.length > 0) {
        setExpandedCategories(new Set([data.template.categories[0].id]));
      }
    } catch (err: any) {
      setError(err.message || "Denetim yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  // Load current user from localStorage
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, []);

  // Fetch deficiencies when inspection is completed or pending_action
  useEffect(() => {
    if (!inspection) return;
    const s = inspection.status;
    if (s === "completed" || s === "pending_action" || s === "reviewed") {
      api
        .getDeficiencies(inspectionId)
        .then((data) => setDeficiencies(data || []))
        .catch(() => setDeficiencies([]));
      api
        .getCorrectiveActions(inspectionId)
        .then((data) => setCorrectiveActions(data || []))
        .catch(() => setCorrectiveActions([]));
    }
  }, [inspection?.status, inspectionId]);

  // Fetch tutanaklar
  useEffect(() => {
    if (!inspection) return;
    setLoadingTutanaklar(true);
    api
      .getTutanaklar(inspectionId)
      .then((data) => setTutanaklar(data || []))
      .catch(() => setTutanaklar([]))
      .finally(() => setLoadingTutanaklar(false));
  }, [inspection?.id, inspectionId]);

  const toggleCategory = (catId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setExpandedCategories(next);
  };

  const [batchSaving, setBatchSaving] = useState(false);

  const handleCreateAction = async (responseId: string) => {
    const desc = newActionDesc[responseId]?.trim();
    if (!desc) {
      setActionError("Açıklama alanı zorunludur");
      return;
    }
    try {
      setCreatingAction(responseId);
      setActionError(null);
      const created = await api.createCorrectiveAction({
        inspectionId,
        responseId,
        description: desc,
      });
      setCorrectiveActions((prev) => [...prev, created]);
      setDeficiencies((prev) =>
        prev.map((d) =>
          d.responseId === responseId
            ? { ...d, hasCorrectiveAction: true, correctiveAction: created }
            : d
        )
      );
      setNewActionDesc((prev) => {
        const next = { ...prev };
        delete next[responseId];
        return next;
      });
    } catch (err: any) {
      setActionError(err.message || "Düzeltici faaliyet oluşturulamadı");
    } finally {
      setCreatingAction(null);
    }
  };

  const handleBatchSave = async () => {
    // Doldurulan tüm açıklamaları topla
    const actionsToCreate = deficiencies
      .filter((d: any) => !d.hasCorrectiveAction && newActionDesc[d.responseId]?.trim())
      .map((d: any) => ({ responseId: d.responseId, description: newActionDesc[d.responseId].trim() }));

    // Kritik eksikliklerde açıklama zorunlu kontrolü
    const missingCritical = deficiencies.filter(
      (d: any) => d.isCritical && !d.hasCorrectiveAction && !newActionDesc[d.responseId]?.trim()
    );
    if (missingCritical.length > 0) {
      setActionError(`${missingCritical.length} kritik eksiklik için açıklama zorunludur`);
      return;
    }
    if (actionsToCreate.length === 0) {
      setActionError("Kaydedilecek faaliyet bulunamadı");
      return;
    }

    setBatchSaving(true);
    setActionError(null);
    try {
      const result = await api.batchCreateCorrectiveActions(inspectionId, actionsToCreate);

      // Evidence dosyaları yükle
      for (const action of result.actions) {
        const file = newActionFiles[action.responseId];
        if (file) {
          try {
            await api.uploadEvidence(action.id, file);
          } catch {}
        }
      }

      // Listeyi yenile
      const [defsRes, acts] = await Promise.all([
        api.getDeficiencies(inspectionId),
        api.getCorrectiveActions(inspectionId),
      ]);
      setDeficiencies(Array.isArray(defsRes) ? defsRes : (defsRes as any)?.deficiencies || []);
      setCorrectiveActions(Array.isArray(acts) ? acts : []);
      setNewActionDesc({});
      setNewActionFiles({});
    } catch (err: any) {
      setActionError(err.message || "Toplu kayıt başarısız");
    } finally {
      setBatchSaving(false);
    }
  };

  const handleUploadEvidence = async (actionId: string, responseId: string) => {
    const file = newActionFiles[responseId];
    if (!file) {
      setActionError("Lütfen bir fotoğraf seçin");
      return;
    }
    try {
      setUploadingEvidence(actionId);
      setActionError(null);
      const notes = newActionDesc[`evidence_${actionId}`] || undefined;
      const updated = await api.uploadEvidence(actionId, file, notes);
      setCorrectiveActions((prev) =>
        prev.map((a) => (a.id === actionId ? updated : a))
      );
      setDeficiencies((prev) =>
        prev.map((d) =>
          d.correctiveAction?.id === actionId
            ? { ...d, correctiveAction: updated }
            : d
        )
      );
      setNewActionFiles((prev) => {
        const next = { ...prev };
        delete next[responseId];
        return next;
      });
    } catch (err: any) {
      setActionError(err.message || "Kanıt yüklenemedi");
    } finally {
      setUploadingEvidence(null);
    }
  };

  const handleFetchPreviousFindings = async () => {
    if (previousFindings.length > 0) {
      setShowPreviousFindings(!showPreviousFindings);
      return;
    }
    if (!inspection?.branch?.id) return;
    try {
      setLoadingFindings(true);
      const data = await api.getPreviousFindings(inspection.branch.id);
      setPreviousFindings(data || []);
      setShowPreviousFindings(true);
    } catch {
      setPreviousFindings([]);
      setShowPreviousFindings(true);
    } finally {
      setLoadingFindings(false);
    }
  };

  const openPhotoViewer = (photos: string[], startIndex: number) => {
    setViewerPhotos(photos);
    setViewerIndex(startIndex);
  };

  // ------- Loading state -------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-800 mx-auto" />
          <p className="mt-3 text-gray-500">Denetim yükleniyor...</p>
        </div>
      </div>
    );
  }

  // ------- Error state -------
  if (error || !inspection) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto" />
          <p className="mt-3 text-red-600 font-medium">{error || "Denetim bulunamadı"}</p>
          <Link
            href="/dashboard/inspections"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Denetimlere Dön
          </Link>
        </div>
      </div>
    );
  }

  // ------- Derive data from API response -------
  const {
    branch,
    inspector,
    template,
    responses = [],
    photos: allPhotos = [],
    actions = [],
    scorePercentage,
    totalScore,
    maxPossibleScore,
    status,
    locationVerified,
    reviewedBy,
    reviewerNotes,
    scheduledDate,
    completedAt,
  } = inspection;

  const branchName = branch?.name || branch?.branchName || "-";
  const inspectorName = inspector
    ? `${inspector.firstName || ""} ${inspector.lastName || ""}`.trim() || inspector.email
    : "-";
  const reviewerName = reviewedBy
    ? `${reviewedBy.firstName || ""} ${reviewedBy.lastName || ""}`.trim() || reviewedBy.email
    : null;

  const score = Math.round(
    Number(scorePercentage ?? (maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0))
  );

  // Build category data for score breakdown
  const categories = (template?.categories || []).map((cat: any) => {
    const catResponses = responses.filter((r: any) => {
      const item = cat.items?.find((i: any) => i.id === r.itemId);
      return !!item;
    });
    const catMaxScore = (cat.items || []).reduce(
      (sum: number, item: any) => sum + (item.maxScore || 0),
      0
    );
    const catScore = catResponses.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0);
    return { category: cat.name, score: catScore, maxScore: catMaxScore };
  });

  // Build a response lookup: itemId -> response
  const responseMap: Record<string, any> = {};
  responses.forEach((r: any) => {
    responseMap[r.itemId] = r;
  });

  // Collect all photo URLs for the general gallery
  const allPhotoUrls: string[] = [];
  allPhotos.forEach((p: any) => {
    if (p.storagePath || p.url) allPhotoUrls.push(photoUrl(p.storagePath || p.url));
  });
  responses.forEach((r: any) => {
    (r.photos || []).forEach((p: any) => {
      const url = photoUrl(p.storagePath || p.url || p);
      if (url && !allPhotoUrls.includes(url)) allPhotoUrls.push(url);
    });
  });

  const isManager = currentUser?.role === "manager";
  const isManagerOrAdmin = currentUser?.role === "manager" || currentUser?.role === "admin";
  const showCorrectiveSection =
    (status === "completed" || status === "pending_action" || status === "reviewed");
  const canUploadEvidence = isManager;

  return (
    <div className="space-y-6">
      {/* Fullscreen photo viewer */}
      {viewerPhotos && (
        <FullscreenViewer
          photos={viewerPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerPhotos(null)}
        />
      )}

      {/* -------- Header -------- */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/inspections"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">{branchName}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
            <span className="flex items-center gap-1">
              <User size={14} />
              {inspectorName}
            </span>
            {scheduledDate && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(scheduledDate)}
              </span>
            )}
            {completedAt && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDate(completedAt)}
              </span>
            )}
          </div>
        </div>
        {getStatusBadge(status)}
      </div>

      {/* -------- Score + Category Breakdown -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score circle */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={score >= 80 ? "#4CAF50" : score >= 60 ? "#FF9800" : "#F44336"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 2.83} 283`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{score}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Genel Puan</p>
          {totalScore != null && maxPossibleScore != null && (
            <p className="text-xs text-gray-400 mt-1">
              {totalScore} / {maxPossibleScore}
            </p>
          )}
        </div>

        {/* Category bars */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Puanları</h3>
          {categories.length > 0 ? (
            <ScoreBreakdown categories={categories} />
          ) : (
            <p className="text-sm text-gray-400">Kategori bilgisi yok</p>
          )}
        </div>
      </div>

      {/* -------- Location Verification -------- */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <MapPin size={20} className="text-primary-800 flex-shrink-0" />
        {locationVerified ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={18} className="text-green-500" />
            <span className="text-sm text-green-600 font-medium">Konum Doğrulandı</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <XCircle size={18} className="text-red-400" />
            <span className="text-sm text-red-500 font-medium">Konum Doğrulanmadı</span>
          </div>
        )}
      </div>

      {/* -------- Detailed Responses by Category -------- */}
      {template?.categories && template.categories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Detaylı Yanıtlar</h3>
          </div>
          {template.categories.map((cat: any) => {
            const isExpanded = expandedCategories.has(cat.id);
            const items = cat.items || [];
            return (
              <div key={cat.id} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{cat.name}</span>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-6 pb-4 space-y-3">
                    {items.map((item: any) => {
                      const resp = responseMap[item.id];
                      const itemScore = resp?.score ?? null;
                      const answerValue = resp?.value ?? resp?.answer ?? null;
                      const notes = resp?.notes || "";
                      const severity = resp?.severity || null;

                      // Photos from response
                      const respPhotos: string[] = (resp?.photos || []).map(
                        (p: any) => photoUrl(p.storagePath || p.url || p)
                      );

                      return (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {item.questionText}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                {resp ? (
                                  <>
                                    <span
                                      className={`text-sm font-medium ${getAnswerColor(
                                        answerValue
                                      )}`}
                                    >
                                      {getAnswerLabel(answerValue)}
                                    </span>
                                    {itemScore !== null && (
                                      <span className="text-sm text-gray-500">
                                        {itemScore}/{item.maxScore || 0}
                                      </span>
                                    )}
                                    {getSeverityBadge(severity)}
                                    {item.isCritical && (
                                      <Badge variant="danger">Kritik Madde</Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">
                                    Yanıtlanmamış
                                  </span>
                                )}
                              </div>
                              {notes && (
                                <p className="text-sm text-gray-500 mt-1.5">{notes}</p>
                              )}
                            </div>
                          </div>
                          {/* Response photos */}
                          {respPhotos.length > 0 && (
                            <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {respPhotos.map((url, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => openPhotoViewer(respPhotos, pIdx)}
                                  className="aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={url}
                                    alt={`Foto ${pIdx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const el = e.target as HTMLImageElement;
                                      el.style.display = "none";
                                      el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs"><span>Foto ${
                                        pIdx + 1
                                      }</span></div>`;
                                    }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------- All Photos Gallery -------- */}
      {allPhotoUrls.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera size={20} />
            Tüm Fotoğraflar ({allPhotoUrls.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {allPhotoUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => openPhotoViewer(allPhotoUrls, idx)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-80 transition-opacity"
              >
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500 text-xs font-medium"><span>Foto ${
                      idx + 1
                    }</span></div>`;
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* -------- Corrective Actions / Deficiencies Section -------- */}
      {showCorrectiveSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileWarning size={20} className="text-primary-800" />
              Düzeltici Faaliyetler
            </h3>
          </div>

          {/* Reviewed status indicator */}
          {status === "reviewed" && (
            <div className="mx-6 mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={18} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Tamamlandı - Rapor Gönderildi
              </span>
            </div>
          )}

          {/* No critical deficiencies message */}
          {deficiencies.length === 0 && (status === "completed" || status === "pending_action") && (
            <div className="mx-6 mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={18} className="text-green-600" />
              <span className="text-sm text-green-700">
                Kritik eksik bulunmamaktadır. Denetim otomatik tamamlanmıştır.
              </span>
            </div>
          )}

          {/* Error message */}
          {actionError && (
            <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertTriangle size={16} />
              {actionError}
            </div>
          )}

          {/* Deficiency list */}
          {deficiencies.length > 0 && (
            <div className="p-6 space-y-4">
              {deficiencies.map((def: any) => {
                const existingAction = def.correctiveAction;
                const isMandatory = def.isCritical;

                return (
                  <div
                    key={def.responseId}
                    className={`border rounded-lg p-4 ${
                      def.isCritical
                        ? "border-red-200 bg-red-50/50"
                        : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    {/* Deficiency header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {def.questionText}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-500">{def.categoryName}</span>
                          {def.isCritical && (
                            <Badge variant="danger">Kritik</Badge>
                          )}
                          {def.score !== null && (
                            <span className="text-xs text-gray-500">
                              Puan: {def.score}/{def.maxScore}
                            </span>
                          )}
                          {def.passed === false && (
                            <Badge variant="danger">Başarısız</Badge>
                          )}
                        </div>
                        {def.notes && (
                          <p className="text-xs text-gray-500 mt-1">{def.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Existing corrective action */}
                    {existingAction && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{existingAction.description}</p>
                            {existingAction.createdBy && (
                              <p className="text-xs text-gray-400 mt-1">
                                Oluşturan: {existingAction.createdBy.fullName}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              existingAction.status === "completed"
                                ? "success"
                                : existingAction.status === "evidence_uploaded"
                                ? "info"
                                : "warning"
                            }
                          >
                            {existingAction.status === "completed"
                              ? "Tamamlandı"
                              : existingAction.status === "evidence_uploaded"
                              ? "Kanıt Yüklendi"
                              : "Beklemede"}
                          </Badge>
                        </div>

                        {/* Evidence image */}
                        {existingAction.evidence_photo_path && (
                          <div className="mt-2">
                            <button
                              onClick={() =>
                                openPhotoViewer(
                                  [photoUrl(existingAction.evidence_photo_path)],
                                  0
                                )
                              }
                              className="inline-block rounded-lg overflow-hidden bg-gray-200 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={photoUrl(existingAction.evidence_photo_path)}
                                alt="Kanıt"
                                className="h-24 w-auto object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </button>
                            {existingAction.evidence_notes && (
                              <p className="text-xs text-gray-500 mt-1">
                                {existingAction.evidence_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Upload evidence form (sadece şube sorumlusu) */}
                        {!existingAction.evidence_photo_path && status !== "reviewed" && canUploadEvidence && (
                          <div className="mt-3 flex items-end gap-2 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs text-gray-500 mb-1">
                                Kanıt Fotoğrafı
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setNewActionFiles((prev) => ({
                                    ...prev,
                                    [def.responseId]: file,
                                  }));
                                }}
                                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                              />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs text-gray-500 mb-1">
                                Not (isteğe bağlı)
                              </label>
                              <input
                                type="text"
                                value={newActionDesc[`evidence_${existingAction.id}`] || ""}
                                onChange={(e) =>
                                  setNewActionDesc((prev) => ({
                                    ...prev,
                                    [`evidence_${existingAction.id}`]: e.target.value,
                                  }))
                                }
                                placeholder="Kanıt notu..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                              />
                            </div>
                            <button
                              onClick={() =>
                                handleUploadEvidence(existingAction.id, def.responseId)
                              }
                              disabled={
                                uploadingEvidence === existingAction.id ||
                                !newActionFiles[def.responseId]
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-800 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {uploadingEvidence === existingAction.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )}
                              Yükle
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create corrective action form (sadece şube sorumlusu) */}
                    {!existingAction && status !== "reviewed" && canUploadEvidence && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        {isMandatory ? (
                          /* Mandatory form for critical deficiencies */
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-2">
                              Kritik eksiklik - Düzeltici faaliyet zorunludur
                            </p>
                            <textarea
                              rows={2}
                              value={newActionDesc[def.responseId] || ""}
                              onChange={(e) =>
                                setNewActionDesc((prev) => ({
                                  ...prev,
                                  [def.responseId]: e.target.value,
                                }))
                              }
                              placeholder="Düzeltici faaliyet açıklaması yazın..."
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                            />
                            <button
                              onClick={() => handleCreateAction(def.responseId)}
                              disabled={
                                creatingAction === def.responseId ||
                                !newActionDesc[def.responseId]?.trim()
                              }
                              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {creatingAction === def.responseId ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Plus size={14} />
                              )}
                              Düzeltici Faaliyet Oluştur
                            </button>
                          </div>
                        ) : (
                          /* Optional button for non-critical deficiencies */
                          <div>
                            {newActionDesc[def.responseId] !== undefined ? (
                              <div>
                                <textarea
                                  rows={2}
                                  value={newActionDesc[def.responseId] || ""}
                                  onChange={(e) =>
                                    setNewActionDesc((prev) => ({
                                      ...prev,
                                      [def.responseId]: e.target.value,
                                    }))
                                  }
                                  placeholder="Düzeltici faaliyet açıklaması yazın..."
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => handleCreateAction(def.responseId)}
                                    disabled={
                                      creatingAction === def.responseId ||
                                      !newActionDesc[def.responseId]?.trim()
                                    }
                                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {creatingAction === def.responseId ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Plus size={14} />
                                    )}
                                    Oluştur
                                  </button>
                                  <button
                                    onClick={() =>
                                      setNewActionDesc((prev) => {
                                        const next = { ...prev };
                                        delete next[def.responseId];
                                        return next;
                                      })
                                    }
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                  >
                                    İptal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setNewActionDesc((prev) => ({
                                    ...prev,
                                    [def.responseId]: "",
                                  }))
                                }
                                className="flex items-center gap-1.5 text-sm text-primary-800 hover:text-primary-600 font-medium transition-colors"
                              >
                                <Plus size={14} />
                                Düzeltici Faaliyet Ekle
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tümünü Kaydet butonu */}
              {deficiencies.some((d: any) => !d.hasCorrectiveAction) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleBatchSave}
                    disabled={batchSaving || !Object.values(newActionDesc).some((v) => v?.trim())}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-800 text-white rounded-xl text-base font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                  >
                    {batchSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Tüm Faaliyetleri Kaydet
                        {Object.values(newActionDesc).filter((v) => v?.trim()).length > 0 &&
                          ` (${Object.values(newActionDesc).filter((v) => v?.trim()).length})`}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------- Tutanaklar Section -------- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-primary-800" />
            Tutanaklar
          </h3>
        </div>
        <div className="p-6">
          {loadingTutanaklar ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : tutanaklar.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">
              Bu denetim için henüz tutanak oluşturulmamış.
            </p>
          ) : (
            <div className="space-y-3">
              {tutanaklar.map((tutanak: any) => (
                <div
                  key={tutanak.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {tutanak.title || "Tutanak"}
                        </h4>
                        <Badge
                          variant={tutanak.status === "sent" ? "success" : "warning"}
                        >
                          {tutanak.status === "sent" ? "Gönderildi" : "Taslak"}
                        </Badge>
                      </div>
                      {tutanak.createdBy && (
                        <p className="text-xs text-gray-400 mb-2">
                          Oluşturan: {tutanak.createdBy.fullName} -{" "}
                          {formatDate(tutanak.createdAt)}
                        </p>
                      )}
                      {tutanak.sentAt && (
                        <p className="text-xs text-gray-400 mb-2">
                          Gönderilme: {formatDate(tutanak.sentAt)}
                        </p>
                      )}
                      {/* Content preview */}
                      {tutanak.content && Array.isArray(tutanak.content) && (
                        <div className="space-y-1 mt-2">
                          {tutanak.content.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700">{item.label}:</span>{" "}
                              {(item.value || "").substring(0, 100)}
                              {(item.value || "").length > 100 ? "..." : ""}
                            </div>
                          ))}
                          {tutanak.content.length > 3 && (
                            <p className="text-xs text-gray-400 italic">
                              +{tutanak.content.length - 3} alan daha
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -------- Previous Findings Section -------- */}
      {inspection?.branch?.id && showCorrectiveSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <button
            onClick={handleFetchPreviousFindings}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-gray-900">
              <History size={20} className="text-primary-800" />
              Önceki Denetim Bulguları
            </span>
            {loadingFindings ? (
              <Loader2 size={18} className="animate-spin text-gray-400" />
            ) : showPreviousFindings ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>
          {showPreviousFindings && (
            <div className="px-6 pb-4">
              {previousFindings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Bu şube için önceki denetim bulguları bulunamadı.
                </p>
              ) : (
                <div className="space-y-3">
                  {previousFindings.map((finding: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-100 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {finding.questionText || finding.description || "-"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {finding.categoryName && (
                              <span className="text-xs text-gray-500">
                                {finding.categoryName}
                              </span>
                            )}
                            {finding.isCritical && (
                              <Badge variant="danger">Kritik</Badge>
                            )}
                            {finding.inspectionDate && (
                              <span className="text-xs text-gray-400">
                                {formatDate(finding.inspectionDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        {finding.status && (
                          <Badge
                            variant={
                              finding.status === "completed"
                                ? "success"
                                : finding.status === "evidence_uploaded"
                                ? "info"
                                : "warning"
                            }
                          >
                            {finding.status === "completed"
                              ? "Tamamlandı"
                              : finding.status === "evidence_uploaded"
                              ? "Kanıt Yüklendi"
                              : "Beklemede"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------- Reviewer Info (if already reviewed) -------- */}
      {reviewedBy && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield size={20} />
            Degerlendirme Bilgisi
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28">Degerlendiren:</span>
              <span className="text-gray-900 font-medium">{reviewerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28">Durum:</span>
              {getStatusBadge(status)}
            </div>
            {reviewerNotes && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Notlar:</span>
                <span className="text-gray-700">{reviewerNotes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
