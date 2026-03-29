"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("ERTANSA");
  const [defaultRadius, setDefaultRadius] = useState("200");
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [criticalAlert, setCriticalAlert] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [overdueReminder, setOverdueReminder] = useState(true);

  return (
    <div className="max-w-2xl space-y-8">
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
              Denetim lokasyon doğrulamasi için kullanılır
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayilan Dil
            </label>
            <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none">
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
              onClick={() => setEmailNotif(!emailNotif)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailNotif ? "bg-primary-800" : "bg-gray-300"
              }`}
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
              onClick={() => setPushNotif(!pushNotif)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pushNotif ? "bg-primary-800" : "bg-gray-300"
              }`}
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
              onClick={() => setCriticalAlert(!criticalAlert)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                criticalAlert ? "bg-primary-800" : "bg-gray-300"
              }`}
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
              onClick={() => setWeeklyReport(!weeklyReport)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                weeklyReport ? "bg-primary-800" : "bg-gray-300"
              }`}
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
              <p className="text-xs text-gray-400">Planlanmış denetimlerin gecikme uyarilari</p>
            </div>
            <button
              onClick={() => setOverdueReminder(!overdueReminder)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                overdueReminder ? "bg-primary-800" : "bg-gray-300"
              }`}
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
        <button className="px-6 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors">
          Kaydet
        </button>
      </div>
    </div>
  );
}
