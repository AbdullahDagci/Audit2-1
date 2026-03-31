"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Warehouse,
  ChevronLeft,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";

const facilityTypes = [
  { key: "magaza", label: "Magaza", Icon: Store },
  { key: "kesimhane", label: "Kesimhane", Icon: Store },
  { key: "ahir", label: "Ahir", Icon: Store },
  { key: "yufka", label: "Yufka", Icon: Store },
  { key: "depo", label: "Depo", Icon: Warehouse },
];

export default function NewInspectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("magaza");
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [creating, setCreating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        setUser(parsed);
        if (parsed.role !== "inspector") {
          router.push("/dashboard/inspections");
        }
      }
    } catch {}
  }, [router]);

  // Tesis tipine gore subeleri yukle
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = await api.getBranches(selectedType);
        setBranches(Array.isArray(data) ? data : []);
      } catch {
        setBranches([]);
      }
      setLoadingBranches(false);
    };
    fetchBranches();
    setSelectedBranch(null);
  }, [selectedType]);

  // Tesis tipine gore sablonlari yukle
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.getTemplates(selectedType);
        const list = Array.isArray(data) ? data : [];
        setTemplates(list);
        setSelectedTemplate(list.length > 0 ? list[0] : null);
      } catch {
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, [selectedType]);

  // Denetim olustur (scheduled)
  const handleCreate = async () => {
    if (!selectedBranch) return;
    if (!selectedTemplate) {
      alert("Bu tesis tipi icin denetim sablonu bulunamadi.");
      return;
    }
    if (!scheduledDate) {
      alert("Lutfen bir tarih secin.");
      return;
    }

    setCreating(true);
    try {
      await api.createInspection({
        branchId: selectedBranch.id,
        templateId: selectedTemplate.id,
        status: "scheduled",
        scheduledDate,
      });
      router.push("/dashboard/inspections");
    } catch (err: any) {
      alert(err.message || "Denetim olusturulurken bir hata olustu.");
    }
    setCreating(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Geri butonu */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Geri
      </button>

      {/* Tesis tipi secimi */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Tesis Tipi</h3>
        <div className="flex flex-wrap gap-2">
          {facilityTypes.map((ft) => (
            <button
              key={ft.key}
              onClick={() => setSelectedType(ft.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-ios ${
                selectedType === ft.key
                  ? "bg-primary-800 text-white shadow-soft"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50"
              }`}
            >
              <ft.Icon size={16} />
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sube listesi */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Sube Secin</h3>
        {loadingBranches ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-800" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            Bu tipte sube bulunamadi
          </div>
        ) : (
          <div className="grid gap-3">
            {branches.map((branch) => {
              const isSelected = selectedBranch?.id === branch.id;
              return (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 ease-ios ${
                    isSelected
                      ? "bg-primary-50 border-2 border-primary-800 shadow-soft"
                      : "bg-white border-2 border-transparent shadow-soft hover:border-primary-200"
                  }`}
                >
                  {/* Radio */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "border-primary-800"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-800" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {branch.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />
                      {branch.address || branch.city || "-"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sablon secimi - sube secildiginde gorunur */}
      {selectedBranch && templates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Denetim Sablonu</h3>
          <div className="grid gap-3">
            {templates.map((t: any) => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 ease-ios ${
                    isSelected
                      ? "bg-primary-50 border-2 border-primary-800 shadow-soft"
                      : "bg-white border-2 border-transparent shadow-soft hover:border-primary-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "border-primary-800" : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.facilityType && (
                      <p className="text-xs text-gray-500 mt-0.5">{t.facilityType}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Alt bar - sube ve sablon secildiginde gorunur */}
      {selectedBranch && selectedTemplate && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 -mx-6 px-6 py-4 mt-6 rounded-b-2xl">
          {/* Secili bilgiler */}
          <div className="flex items-center gap-2 mb-3">
            <Store size={16} className="text-primary-800" />
            <span className="text-sm font-semibold text-primary-800">
              {selectedBranch.name}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{selectedTemplate.name}</span>
          </div>

          {/* Tarih secici */}
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 mb-3">
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Planlanan Tarih:</span>
            <input
              type="date"
              value={scheduledDate}
              min={todayStr}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-blue-800 font-semibold outline-none"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !scheduledDate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-800 text-white rounded-xl text-sm font-semibold hover:bg-primary-900 transition-all duration-300 ease-ios shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Olusturuluyor...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Denetim Olustur
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
