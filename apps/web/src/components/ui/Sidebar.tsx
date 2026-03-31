"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/api";
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Settings,
  Bell,
  LogOut,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "inspector"] },
  { href: "/dashboard/manager", label: "Şube Paneli", icon: Building2, roles: ["manager"] },
  { href: "/dashboard/inspections", label: "Denetimler", icon: ClipboardCheck, roles: ["admin", "manager", "inspector"] },
  { href: "/dashboard/branches", label: "Şubeler", icon: Building2, roles: ["admin", "manager"] },
  { href: "/dashboard/templates", label: "Şablonlar", icon: FileText, roles: ["admin", "manager"] },
  { href: "/dashboard/users", label: "Kullanıcılar", icon: Users, roles: ["admin"] },
  { href: "/dashboard/schedules", label: "Takvim", icon: Calendar, roles: ["admin", "manager"] },
  { href: "/dashboard/reports", label: "Raporlar", icon: BarChart3, roles: ["admin", "manager"] },
  { href: "/dashboard/activity-logs", label: "Aktivite Kayıtları", icon: History, roles: ["admin"] },
  { href: "/dashboard/notifications", label: "Bildirimler", icon: Bell, roles: ["admin", "manager", "inspector"] },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings, roles: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = { admin: 'Yönetici', manager: 'Müdür', inspector: 'Denetçi' };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    document.cookie = "auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary-900 text-white flex flex-col z-50">
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <img src="/logo.png" alt="ERTANSA" className="h-10 w-10 rounded" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERTANSA</h1>
          <p className="text-xs text-primary-300 mt-0.5 uppercase tracking-widest">
            Denetim Sistemi
          </p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-3">
          {navItems
            .filter((item) => {
              if (!item.roles) return true;
              return user?.role && item.roles.includes(user.role);
            })
            .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-600 text-white"
                        : "text-primary-100 hover:bg-white/10"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.fullName || 'Kullanıcı'}</p>
            <p className="text-xs text-primary-300 truncate">{ROLE_LABELS[user?.role] || user?.role || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
