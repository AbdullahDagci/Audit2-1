"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/inspections": "Denetimler",
  "/dashboard/branches": "Şubeler",
  "/dashboard/reports": "Raporlar",
  "/dashboard/users": "Kullanıcılar",
  "/dashboard/templates": "Şablonlar",
  "/dashboard/schedules": "Takvim",
  "/dashboard/settings": "Ayarlar",
  "/dashboard/manager": "Şube Paneli",
  "/dashboard/activity-logs": "Aktivite Kayıtları",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const title =
    (pathname ? pageTitles[pathname] : null) ||
    Object.entries(pageTitles).find(([key]) => pathname?.startsWith(key))?.[1] ||
    "Dashboard";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary-800 flex items-center justify-center text-white text-sm font-bold">
                AY
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
