"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X, UserCheck, UserX } from "lucide-react";
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

const ROLES = [
  { value: "admin", label: "Yonetici" },
  { value: "manager", label: "Mudur" },
  { value: "inspector", label: "Denetci" },
];

function getRoleBadge(role: string) {
  switch (role) {
    case "admin": return <Badge variant="danger">Yonetici</Badge>;
    case "manager": return <Badge variant="info">Mudur</Badge>;
    case "inspector": return <Badge variant="success">Denetci</Badge>;
    default: return <Badge variant="neutral">{role}</Badge>;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "", password: "", fullName: "", role: "inspector", phone: "",
  });

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "", role: "inspector", phone: "", isActive: true,
  });

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // === CREATE ===
  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.fullName) return;
    setSaving(true);
    try {
      await api.register({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        phone: createForm.phone || null,
      });
      setShowCreate(false);
      setCreateForm({ email: "", password: "", fullName: "", role: "inspector", phone: "" });
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // === EDIT ===
  const openEdit = (user: User) => {
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      phone: user.phone || "",
      isActive: user.isActive,
    });
    setEditUser(user);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.updateUser(editUser.id, {
        fullName: editForm.fullName,
        role: editForm.role,
        phone: editForm.phone || null,
        isActive: editForm.isActive,
      });
      setEditUser(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  // === TOGGLE ACTIVE ===
  const toggleActive = async (user: User) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{users.length} kullanici</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Yeni Kullanici</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Ad Soyad</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Rol</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Email</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Telefon</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Durum</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4 whitespace-nowrap">Islemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
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
                <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{user.phone || "-"}</td>
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
                      className="p-1.5 text-gray-400 hover:text-primary-800 hover:bg-primary-50 rounded"
                      title="Duzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleActive(user)}
                      className={`p-1.5 rounded ${user.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                      title={user.isActive ? "Pasif Yap" : "Aktif Yap"}
                    >
                      {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === CREATE MODAL === */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Yeni Kullanici Olustur">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input type="text" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              placeholder="orn. Ahmet Yilmaz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="ornek@ertansa.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sifre</label>
            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="En az 6 karakter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="05xx xxx xx xx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Iptal</button>
            <button onClick={handleCreate} disabled={saving || !createForm.email || !createForm.password || !createForm.fullName}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-lg hover:bg-primary-900 disabled:opacity-50">
              {saving ? "Olusturuluyor..." : "Olustur"}
            </button>
          </div>
        </div>
      </Modal>

      {/* === EDIT MODAL === */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Kullaniciyi Duzenle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="editActive" checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-800 focus:ring-primary-500" />
            <label htmlFor="editActive" className="text-sm text-gray-700">Aktif</label>
          </div>
          <p className="text-xs text-gray-400">Email: {editUser?.email}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Iptal</button>
            <button onClick={handleEdit} disabled={saving || !editForm.fullName}
              className="px-4 py-2 text-sm text-white bg-primary-800 rounded-lg hover:bg-primary-900 disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
