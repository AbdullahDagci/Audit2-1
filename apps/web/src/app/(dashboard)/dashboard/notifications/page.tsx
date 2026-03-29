"use client";

import { useEffect, useState } from "react";
import { Bell, Check, AlertTriangle, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

type FilterTab = "all" | "unread";

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return "Az once";
  if (diffMinutes < 60) return `${diffMinutes} dakika once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffWeeks < 4) return `${diffWeeks} hafta once`;
  return `${diffMonths} ay once`;
}

function getNotificationIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("uyari") || lower.includes("dikkat") || lower.includes("hata")) {
    return <AlertTriangle size={20} className="text-orange-500" />;
  }
  if (lower.includes("tamamla") || lower.includes("onay")) {
    return <Check size={20} className="text-green-500" />;
  }
  return <Bell size={20} className="text-blue-500" />;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getNotifications()
      .then((data) => {
        setNotifications(data as Notification[]);
      })
      .catch((err) => {
        setError(err.message || "Bildirimler yüklenirken hata oluştu");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.isRead || markingId) return;

    setMarkingId(id);
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Silently fail - notification stays unread
    } finally {
      setMarkingId(null);
    }
  };

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Bildirimler</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-8">
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
            <span className="text-sm">Bildirimler yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Bildirimler</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Bildirimler</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {unreadCount} okunmamis
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Tumu
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "unread"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Okunmamis
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="flex justify-center mb-3">
              <Bell size={40} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">
              {activeTab === "unread"
                ? "Okunmamis bildiriminiz bulunmuyor."
                : "Henuz bildiriminiz bulunmuyor."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleMarkAsRead(notification.id)}
              disabled={notification.isRead || markingId === notification.id}
              className={`w-full text-left bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                notification.isRead
                  ? "border-gray-100 opacity-75"
                  : "border-blue-100 hover:border-blue-200"
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Unread indicator */}
                <div className="flex-shrink-0 pt-0.5">
                  {!notification.isRead ? (
                    <span className="block w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  ) : (
                    <span className="block w-2.5 h-2.5 rounded-full" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.title)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm truncate ${
                        notification.isRead
                          ? "font-normal text-gray-700"
                          : "font-semibold text-gray-900"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400">
                      <Clock size={13} />
                      <span className="text-xs whitespace-nowrap">
                        {getRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                </div>

                {/* Mark as read indicator */}
                <div className="flex-shrink-0 pt-0.5">
                  {markingId === notification.id ? (
                    <svg
                      className="animate-spin h-4 w-4 text-gray-400"
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
                  ) : notification.isRead ? (
                    <Check size={16} className="text-gray-300" />
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
