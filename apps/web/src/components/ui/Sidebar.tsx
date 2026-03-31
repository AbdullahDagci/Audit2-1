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
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  // Sayfa değiştiğinde mobilde menüyü kapat
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    document.cookie = "auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-white/5 flex items-center gap-3">
        <img src="/logo-transparent.png" alt="ERTANSA" className="w-10 h-10 rounded-xl" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">ERTANSA</h1>
          <p className="text-[10px] text-primary-300 uppercase tracking-widest">Denetim Sistemi</p>
        </div>
        {/* Mobilde kapat butonu */}
        <button onClick={() => setOpen(false)} className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors duration-200">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        <ul className="space-y-0.5 px-2">
          {navItems
            .filter((item) => user?.role && item.roles.includes(user.role))
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-ios",
                      isActive
                        ? "bg-white/15 text-white border border-white/10 shadow-glass"
                        : "text-primary-100 hover:bg-white/[0.08] border border-transparent"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || 'Kullanıcı'}</p>
              <p className="text-xs text-primary-300 truncate">{ROLE_LABELS[user?.role] || ''}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-medium transition-all duration-200 ease-ios"
        >
          <LogOut size={14} />
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger butonu - sadece mobilde görünür */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2 bg-primary-900/95 backdrop-blur-xl text-white rounded-xl shadow-soft"
        aria-label="Menü"
      >
        <Menu size={22} />
      </button>

      {/* Masaüstü sidebar - lg ve üstü */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-primary-900/95 backdrop-blur-xl text-white flex-col z-50">
        {sidebarContent}
      </aside>

      {/* Mobil sidebar - overlay */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-[55] animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-primary-900/95 backdrop-blur-xl text-white flex flex-col z-[56] shadow-float animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
