"use client";

import { usePathname } from "next/navigation";
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
  "/dashboard/notifications": "Bildirimler",
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
      {/* lg: sidebar 256px açık, mobilde sidebar overlay */}
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Mobilde hamburger için boşluk */}
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 pl-10 lg:pl-0">{title}</h1>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
