"use client";

import { useState, useEffect } from "react";
import { Check, X, Plus, Mail, Send, Trash2, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

interface UserSettings {
  companyName: string;
  defaultRadius: string;
  language: string;
  emailNotif: boolean;
  pushNotif: boolean;
  criticalAlert: boolean;
  weeklyReport: boolean;
  overdueReminder: boolean;
}

const SETTINGS_KEY = "user-settings";

const defaultSettings: UserSettings = {
  companyName: "ERTANSA",
  defaultRadius: "200",
  language: "Turkce",
  emailNotif: true,
  pushNotif: true,
  criticalAlert: true,
  weeklyReport: true,
  overdueReminder: true,
};

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {}
  return defaultSettings;
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw);
      return user.id || null;
    }
  } catch {}
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState(defaultSettings.companyName);
  const [defaultRadius, setDefaultRadius] = useState(defaultSettings.defaultRadius);
  const [language, setLanguage] = useState(defaultSettings.language);
  const [emailNotif, setEmailNotif] = useState(defaultSettings.emailNotif);
  const [pushNotif, setPushNotif] = useState(defaultSettings.pushNotif);
  const [criticalAlert, setCriticalAlert] = useState(defaultSettings.criticalAlert);
  const [weeklyReport, setWeeklyReport] = useState(defaultSettings.weeklyReport);
  const [overdueReminder, setOverdueReminder] = useState(defaultSettings.overdueReminder);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Management emails state
  const [managementEmails, setManagementEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [testingSendTo, setTestingSendTo] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preferences saving state
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = loadSettings();
    setCompanyName(saved.companyName);
    setDefaultRadius(saved.defaultRadius);
    setLanguage(saved.language);
  }, []);

  // Load notification preferences from API
  useEffect(() => {
    api
      .getMe()
      .then((user) => {
        if (user.emailNotifications !== undefined) setEmailNotif(user.emailNotifications);
        if (user.pushNotifications !== undefined) setPushNotif(user.pushNotifications);
        if (user.criticalAlerts !== undefined) setCriticalAlert(user.criticalAlerts);
        if (user.weeklyReport !== undefined) setWeeklyReport(user.weeklyReport);
        if (user.overdueReminder !== undefined) setOverdueReminder(user.overdueReminder);
      })
      .catch(() => {
        // API'den yuklenemezse localStorage'dan yükle
        const saved = loadSettings();
        setEmailNotif(saved.emailNotif);
        setPushNotif(saved.pushNotif);
        setCriticalAlert(saved.criticalAlert);
        setWeeklyReport(saved.weeklyReport);
        setOverdueReminder(saved.overdueReminder);
      });
  }, []);

  // Load management emails from API
  useEffect(() => {
    api
      .getManagementEmails()
      .then((res) => {
        setManagementEmails(res.emails || []);
      })
      .catch(() => {
        setErrorMsg("Email listesi yuklenemedi");
      })
      .finally(() => setEmailsLoading(false));
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Auto-hide error message
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleTogglePreference = async (
    field: string,
    currentValue: boolean,
    setter: (val: boolean) => void
  ) => {
    const newValue = !currentValue;
    setter(newValue);

    const userId = getUserId();
    if (!userId) return;

    setPrefsSaving(true);
    try {
      await api.updatePreferences(userId, { [field]: newValue });
    } catch {
      // Hata olursa geri al
      setter(currentValue);
      setErrorMsg("Tercih guncellenemedi");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSave = () => {
    const settings: UserSettings = {
      companyName,
      defaultRadius,
      language,
      emailNotif,
      pushNotif,
      criticalAlert,
      weeklyReport,
      overdueReminder,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSuccessMsg("Ayarlar basariyla kaydedildi");
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Mevcut sifrenizi girin");
      return;
    }
    if (!newPassword) {
      setPasswordError("Yeni sifrenizi girin");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Yeni sifre en az 6 karakter olmalidir");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni sifreler eslesmiyor");
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setPasswordError("Kullanici bilgisi bulunamadi. Tekrar giris yapin.");
      return;
    }

    setPasswordChanging(true);
    try {
      await api.changePassword(userId, currentPassword, newPassword);
      setSuccessMsg("Sifreniz basariyla guncellendi");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Sifre degistirilemedi");
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleAddEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    setEmailError(null);

    if (!email) {
      setEmailError("Email adresi bos olamaz");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Gecerli bir email adresi girin");
      return;
    }
    if (managementEmails.includes(email)) {
      setEmailError("Bu email zaten listede mevcut");
      return;
    }

    const updated = [...managementEmails, email];
    setEmailSaving(true);
    try {
      await api.updateManagementEmails(updated);
      setManagementEmails(updated);
      setNewEmail("");
      setSuccessMsg("Email adresi eklendi");
    } catch (err: any) {
      setErrorMsg(err.message || "Email eklenirken hata olustu");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    const updated = managementEmails.filter((e) => e !== emailToRemove);
    setEmailSaving(true);
    try {
      await api.updateManagementEmails(updated);
      setManagementEmails(updated);
      setSuccessMsg("Email adresi kaldirildi");
    } catch (err: any) {
      setErrorMsg(err.message || "Email kaldirilamadi");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmail = async (email: string) => {
    setTestingSendTo(email);
    try {
      await api.sendTestEmail(email);
      setSuccessMsg(`Test maili ${email} adresine gonderildi`);
    } catch (err: any) {
      setErrorMsg(err.message || "Test maili gonderilemedi");
    } finally {
      setTestingSendTo(null);
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Success notification */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check size={16} className="text-green-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error notification */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <X size={16} className="text-red-600" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Management Emails Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-primary-800" />
          <h3 className="text-lg font-semibold text-gray-900">Yonetim Email Adresleri</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Denetim raporlari ve bildirimler asagidaki adreslere gonderilir.
        </p>

        {emailsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Yukleniyor...</span>
          </div>
        ) : (
          <>
            {/* Email list */}
            {managementEmails.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg mb-4">
                Henuz email adresi eklenmemis
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {managementEmails.map((email) => (
                  <div
                    key={email}
                    className="group flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700"
                  >
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{email}</span>
                    <button
                      onClick={() => handleTestEmail(email)}
                      disabled={testingSendTo === email}
                      className="ml-1 p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Test maili gonder"
                    >
                      {testingSendTo === email ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      disabled={emailSaving}
                      className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Kaldir"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add email input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="ornek@sirket.com"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm ${
                    emailError ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-red-500 mt-1">{emailError}</p>
                )}
              </div>
              <button
                onClick={handleAddEmail}
                disabled={emailSaving || !newEmail.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {emailSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Ekle
              </button>
            </div>
          </>
        )}
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={20} className="text-primary-800" />
          <h3 className="text-lg font-semibold text-gray-900">Sifre Degistir</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Hesabinizin sifresini guncelleyin.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mevcut Sifre
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Mevcut sifrenizi girin"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yeni Sifre
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Yeni sifrenizi girin"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yeni Sifre Tekrar
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Yeni sifrenizi tekrar girin"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <X size={14} className="text-red-500 flex-shrink-0" />
              {passwordError}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordChanging ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            Sifreyi Guncelle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Genel Ayarlar</h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sirket Adi
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayilan Geofence Yaricapi (metre)
            </label>
            <input
              type="number"
              value={defaultRadius}
              onChange={(e) => setDefaultRadius(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Denetim lokasyon dogrulamasi icin kullanilir
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayilan Dil
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            >
              <option>Turkce</option>
              <option>English</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Bildirim Tercihleri</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">E-posta Bildirimleri</p>
              <p className="text-xs text-gray-400">Denetim sonuclari ve raporlar</p>
            </div>
            <button
              onClick={() => handleTogglePreference("emailNotifications", emailNotif, setEmailNotif)}
              disabled={prefsSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailNotif ? "bg-primary-800" : "bg-gray-300"
              } ${prefsSaving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  emailNotif ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Push Bildirimleri</p>
              <p className="text-xs text-gray-400">Anlik bildirimler</p>
            </div>
            <button
              onClick={() => handleTogglePreference("pushNotifications", pushNotif, setPushNotif)}
              disabled={prefsSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pushNotif ? "bg-primary-800" : "bg-gray-300"
              } ${prefsSaving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  pushNotif ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Kritik Bulgu Uyarilari</p>
              <p className="text-xs text-gray-400">Kritik bulgularda aninda bildirim</p>
            </div>
            <button
              onClick={() => handleTogglePreference("criticalAlerts", criticalAlert, setCriticalAlert)}
              disabled={prefsSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                criticalAlert ? "bg-primary-800" : "bg-gray-300"
              } ${prefsSaving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  criticalAlert ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Haftalik Rapor</p>
              <p className="text-xs text-gray-400">Her pazartesi haftalik ozet</p>
            </div>
            <button
              onClick={() => handleTogglePreference("weeklyReport", weeklyReport, setWeeklyReport)}
              disabled={prefsSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                weeklyReport ? "bg-primary-800" : "bg-gray-300"
              } ${prefsSaving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  weeklyReport ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Gecikme Hatirlatmalari</p>
              <p className="text-xs text-gray-400">Planlanmis denetimlerin gecikme uyarilari</p>
            </div>
            <button
              onClick={() => handleTogglePreference("overdueReminder", overdueReminder, setOverdueReminder)}
              disabled={prefsSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                overdueReminder ? "bg-primary-800" : "bg-gray-300"
              } ${prefsSaving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  overdueReminder ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
