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
      return <Badge variant="success">Tamamlandi</Badge>;
    case "approved":
      return <Badge variant="success">Onaylandi</Badge>;
    case "rejected":
      return <Badge variant="danger">Reddedildi</Badge>;
    case "in_progress":
      return <Badge variant="warning">Devam Ediyor</Badge>;
    case "scheduled":
      return <Badge variant="info">Planlanmis</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

function getSeverityBadge(severity: string | null | undefined) {
  switch (severity) {
    case "critical":
      return <Badge variant="danger">Kritik</Badge>;
    case "high":
      return <Badge variant="danger">Yuksek</Badge>;
    case "medium":
      return <Badge variant="warning">Orta</Badge>;
    case "low":
      return <Badge variant="info">Dusuk</Badge>;
    default:
      return null;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "critical":
      return <Badge variant="danger">Kritik</Badge>;
    case "high":
      return <Badge variant="danger">Yuksek</Badge>;
    case "medium":
      return <Badge variant="warning">Orta</Badge>;
    case "low":
      return <Badge variant="info">Dusuk</Badge>;
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
  if (value === false || value === "no" || value === "hayir") return "Hayir";
  if (value === "partial" || value === "kismi") return "Kismi";
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
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Approval state
  const [reviewNotes, setReviewNotes] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setError(err.message || "Denetim yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const toggleCategory = (catId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setExpandedCategories(next);
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      setActionError(null);
      await api.approveInspection(inspectionId, reviewNotes || undefined);
      router.push("/dashboard/inspections");
    } catch (err: any) {
      setActionError(err.message || "Onaylama basarisiz oldu");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setActionError("Reddetme icin not yazmak zorunludur");
      return;
    }
    try {
      setRejecting(true);
      setActionError(null);
      await api.rejectInspection(inspectionId, reviewNotes);
      router.push("/dashboard/inspections");
    } catch (err: any) {
      setActionError(err.message || "Reddetme basarisiz oldu");
    } finally {
      setRejecting(false);
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
          <p className="mt-3 text-gray-500">Denetim yukleniyor...</p>
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
          <p className="mt-3 text-red-600 font-medium">{error || "Denetim bulunamadi"}</p>
          <Link
            href="/dashboard/inspections"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Denetimlere Don
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

  const score =
    scorePercentage ?? (maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0);

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

  const canReview = status === "completed";

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Puanlari</h3>
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
            <span className="text-sm text-green-600 font-medium">Konum Dogrulandi</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <XCircle size={18} className="text-red-400" />
            <span className="text-sm text-red-500 font-medium">Konum Dogrulanmadi</span>
          </div>
        )}
      </div>

      {/* -------- Detailed Responses by Category -------- */}
      {template?.categories && template.categories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Detayli Yanitlar</h3>
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
                                    Yanitlanmamis
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
            Tum Fotograflar ({allPhotoUrls.length})
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

      {/* -------- Corrective Actions -------- */}
      {actions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duzeltici Faaliyetler</h3>
          <div className="space-y-3">
            {actions.map((action: any) => (
              <div key={action.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{action.description}</p>
                  {action.priority && getPriorityBadge(action.priority)}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                  {action.assignedTo && <span>Atanan: {action.assignedTo}</span>}
                  {action.dueDate && <span>Termin: {formatDate(action.dueDate)}</span>}
                  {action.status && (
                    <Badge
                      variant={
                        action.status === "completed"
                          ? "success"
                          : action.status === "overdue"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {action.status === "open"
                        ? "Acik"
                        : action.status === "completed"
                        ? "Tamamlandi"
                        : action.status === "overdue"
                        ? "Gecikti"
                        : action.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
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

      {/* -------- Approval / Rejection Section -------- */}
      {canReview && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={20} />
            Denetim Degerlendirmesi
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="review-notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Degerlendirme Notlari
                <span className="text-gray-400 font-normal ml-1">
                  (reddetme icin zorunlu)
                </span>
              </label>
              <textarea
                id="review-notes"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Degerlendirme notlarinizi buraya yazin..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
              />
            </div>

            {actionError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertTriangle size={16} />
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {approving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Onayla
              </button>
              <button
                onClick={handleReject}
                disabled={approving || rejecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {rejecting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
