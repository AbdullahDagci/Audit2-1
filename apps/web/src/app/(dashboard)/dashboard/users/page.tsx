"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Pencil, Loader2, X, UserCheck, UserX, KeyRound } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  managerId: string | null;
}

const ROLES = [
  { value: "admin", label: "Yönetici" },
  { value: "manager", label: "Müdür" },
  { value: "inspector", label: "Denetçi" },
];

function getRoleBadge(role: string) {
  switch (role) {
    case "admin": return <Badge variant="danger">Yönetici</Badge>;
    case "manager": return <Badge variant="info">Müdür</Badge>;
    case "inspector": return <Badge variant="success">Denetçi</Badge>;
    default: return <Badge variant="neutral">{role}</Badge>;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "", password: "", fullName: "", role: "inspector", phone: "", branchId: "",
  });

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "", role: "inspector", phone: "", isActive: true, branchId: "",
  });

  // Password reset modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, branchesData] = await Promise.all([
        api.getUsers(),
        api.getBranches(),
      ]);
      setUsers(usersData);
      setBranches(branchesData);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Kullanıcının yönettiği şubeyi bul
  const getUserBranch = (userId: string) => {
    return branches.find((b) => b.managerId === userId);
  };

  // === CREATE ===
  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.fullName) return;
    if (createForm.role === "manager" && !createForm.branchId) return;
    setSaving(true);
    try {
      const result = await api.register({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        phone: createForm.phone || null,
      });

      // Müdür ise şubeyi ata
      if (createForm.role === "manager" && createForm.branchId) {
        await api.updateBranch(createForm.branchId, { managerId: result.user?.id || result.id });
      }

      setShowCreate(false);
      setCreateForm({ email: "", password: "", fullName: "", role: "inspector", phone: "", branchId: "" });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // === EDIT ===
  const openEdit = (user: User) => {
    const userBranch = getUserBranch(user.id);
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      phone: user.phone || "",
      isActive: user.isActive,
      branchId: userBranch?.id || "",
    });
    setEditUser(user);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (editForm.role === "manager" && !editForm.branchId) return;
    setSaving(true);
    try {
      await api.updateUser(editUser.id, {
        fullName: editForm.fullName,
        role: editForm.role,
        phone: editForm.phone || null,
        isActive: editForm.isActive,
      });

      // Müdür ise şube atamasını güncelle
      if (editForm.role === "manager" && editForm.branchId) {
        // Önce eski şubedeki atamayı kaldır
        const oldBranch = getUserBranch(editUser.id);
        if (oldBranch && oldBranch.id !== editForm.branchId) {
          await api.updateBranch(oldBranch.id, { managerId: null });
        }
        // Yeni şubeye ata
        await api.updateBranch(editForm.branchId, { managerId: editUser.id });
      } else if (editForm.role !== "manager") {
        // Müdür olmaktan çıkarıldıysa şube atamasını kaldır
        const oldBranch = getUserBranch(editUser.id);
        if (oldBranch) {
          await api.updateBranch(oldBranch.id, { managerId: null });
        }
      }

      setEditUser(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // === TOGGLE ACTIVE ===
  const toggleActive = async (user: User) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // === RESET PASSWORD ===
  const openResetPassword = (user: User) => {
    setResetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword.length < 6) { setPasswordError("Şifre en az 6 karakter olmalıdır"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Şifreler eşleşmiyor"); return; }
    setSaving(true);
    try {
      await api.changePassword(resetUser.id, { newPassword });
      setPasswordSuccess("Şifre başarıyla güncellendi");
      setTimeout(() => setResetUser(null), 1500);
    } catch (err: any) {
      setPasswordError(err.message || "Şifre güncellenemedi");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-800" />
      </div>
    );
  }

  // Şube seçim component'i (aranabilir, alfabetik)
  const BranchSelect = ({ value, onChange, excludeManagerId }: { value: string; onChange: (v: string) => void; excludeManagerId?: string }) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      if (open) document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const sorted = [...branches]
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

    const selected = branches.find((b) => b.id === value);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sorumlu Olduğu Şube <span className="text-red-500">*</span>
        </label>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`w-full px-3 py-2 border rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios ${
              !value ? "border-red-300 bg-red-50/30" : "border-gray-300"
            }`}
          >
            <span className={selected ? "text-gray-900" : "text-gray-400"}>
              {selected ? selected.name : "Şube seçin..."}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Şube ara..."
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-44">
                {sorted.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">Sonuç bulunamadı</p>
                )}
                {sorted.map((b) => {
                  const assigned = b.managerId && b.managerId !== (excludeManagerId || "");
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { onChange(b.id); setOpen(false); setSearch(""); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between transition-colors ${
                        value === b.id ? "bg-primary-50 text-primary-800 font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>{b.name}</span>
                      {assigned && <span className="text-xs text-gray-400">(atanmış)</span>}
                      {value === b.id && (
                        <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!value && (
          <p className="text-xs text-red-500 mt-1">Müdür için şube seçimi zorunludur</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{users.length} kullanıcı</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-primary-900 transition-all duration-300 ease-ios hover:shadow-soft-lg"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Yeni Kullanıcı</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Ad Soyad</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Rol</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Email</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Şube</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Durum</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const userBranch = getUserBranch(user.id);
              return (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 text-xs font-bold flex-shrink-0">
                        {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {user.role === "manager" && userBranch ? (
                      <span className="text-primary-700 font-medium">{userBranch.name}</span>
                    ) : user.role === "manager" ? (
                      <span className="text-red-500 text-xs">Şube atanmamış</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button onClick={() => toggleActive(user)}>
                      <Badge variant={user.isActive ? "success" : "neutral"}>
                        {user.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </button>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-gray-400 hover:text-primary-800 hover:bg-primary-50 rounded-xl transition-all duration-300 ease-ios"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => openResetPassword(user)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300 ease-ios"
                        title="Şifre Sıfırla"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        className={`p-1.5 rounded-xl transition-all duration-300 ease-ios ${user.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                        title={user.isActive ? "Pasif Yap" : "Aktif Yap"}
                      >
                        {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* === CREATE MODAL === */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Yeni Kullanıcı Oluştur">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input type="text" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              placeholder="örn. Ahmet Yılmaz"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="ornek@ertansa.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="En az 6 karakter"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value, branchId: "" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="05xx xxx xx xx"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
            </div>
          </div>

          {/* Müdür seçildiğinde şube seçimi */}
          {createForm.role === "manager" && (
            <BranchSelect value={createForm.branchId} onChange={(v) => setCreateForm({ ...createForm, branchId: v })} />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 ease-ios">İptal</button>
            <button onClick={handleCreate}
              disabled={saving || !createForm.email || !createForm.password || !createForm.fullName || (createForm.role === "manager" && !createForm.branchId)}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-xl hover:bg-primary-900 disabled:opacity-50 transition-all duration-300 ease-ios">
              {saving ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      </Modal>

      {/* === EDIT MODAL === */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Kullanıcıyı Düzenle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value, branchId: "" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
            </div>
          </div>

          {/* Müdür seçildiğinde şube seçimi */}
          {editForm.role === "manager" && (
            <BranchSelect value={editForm.branchId} onChange={(v) => setEditForm({ ...editForm, branchId: v })} excludeManagerId={editUser?.id} />
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="editActive" checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-800 focus:ring-primary-500" />
            <label htmlFor="editActive" className="text-sm text-gray-700">Aktif</label>
          </div>
          <p className="text-xs text-gray-400">Email: {editUser?.email}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 ease-ios">İptal</button>
            <button onClick={handleEdit}
              disabled={saving || !editForm.fullName || (editForm.role === "manager" && !editForm.branchId)}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-xl hover:bg-primary-900 disabled:opacity-50 transition-all duration-300 ease-ios">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* === PASSWORD RESET MODAL === */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title="Şifre Sıfırla">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{resetUser?.fullName}</strong> kullanıcısının şifresini sıfırlıyorsunuz.
          </p>

          {passwordError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl border border-green-100">{passwordSuccess}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-ios" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setResetUser(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 ease-ios">İptal</button>
            <button onClick={handleResetPassword}
              disabled={saving || !newPassword || !confirmPassword}
              className="px-4 py-2 text-sm text-white bg-orange-600 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all duration-300 ease-ios">
              {saving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
