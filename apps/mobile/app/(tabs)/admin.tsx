import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Modal as RNModal, ActivityIndicator, Switch, Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ROLES = [
  { value: 'admin', label: 'Yönetici', color: '#C62828', bg: '#FFEBEE' },
  { value: 'manager', label: 'Müdür', color: '#1565C0', bg: '#E3F2FD' },
  { value: 'inspector', label: 'Denetçi', color: '#2E7D32', bg: '#E8F5E9' },
];

const FACILITY_TYPES = [
  { value: 'magaza', label: 'Mağaza' },
  { value: 'kesimhane', label: 'Kesimhane' },
  { value: 'ahir', label: 'Ahır' },
  { value: 'yufka', label: 'Yufka' },
  { value: 'depo', label: 'Depo' },
];

type Tab = 'users' | 'templates' | 'branches' | 'schedules' | 'types';

export default function AdminScreen() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('users');

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <View style={S.center}>
        <MaterialIcons name="lock" size={48} color="#BDBDBD" />
        <Text style={{ fontSize: 16, color: '#999', marginTop: 12 }}>Yetkiniz yok</Text>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'users', label: 'Kullanıcılar', icon: 'people' },
    { key: 'templates', label: 'Şablonlar', icon: 'checklist' },
    { key: 'branches', label: 'Şubeler', icon: 'store' },
    { key: 'schedules', label: 'Takvim', icon: 'event' },
    { key: 'types', label: 'Tesis Tipleri', icon: 'category' },
  ];

  return (
    <View style={S.container}>
      {/* Bekleyen Denetimler - Müdür için */}
      {(user?.role === 'manager' || user?.role === 'admin') && <PendingInspectionsSection />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={S.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[S.tabBtn, tab === t.key && S.tabActive]} onPress={() => setTab(t.key)}>
            <MaterialIcons name={t.icon as any} size={18} color={tab === t.key ? '#FFF' : '#666'} />
            <Text style={[S.tabText, tab === t.key && S.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'users' && <UsersTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'branches' && <BranchesTab />}
      {tab === 'schedules' && <SchedulesTab />}
      {tab === 'types' && <FacilityTypesTab />}
    </View>
  );
}

// ===================== BEKLEYEN DENETIMLER =====================
function PendingInspectionsSection() {
  const router = useRouter();
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [completed, pendingAction] = await Promise.all([
        api.getInspections({ status: 'completed' }).catch(() => ({ data: [] })),
        api.getInspections({ status: 'pending_action' }).catch(() => ({ data: [] })),
      ]);
      const all = [...(completed.data || []), ...(pendingAction.data || [])];
      setInspections(all);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading || inspections.length === 0) return null;

  return (
    <View style={S.pendingSection}>
      <TouchableOpacity style={S.pendingHeader} onPress={() => setExpanded(!expanded)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <MaterialIcons name="assignment-late" size={22} color="#E65100" />
          <Text style={S.pendingTitle}>Bekleyen Denetimler</Text>
          <View style={S.pendingCountBadge}>
            <Text style={S.pendingCountText}>{inspections.length}</Text>
          </View>
        </View>
        <MaterialIcons name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#E65100" />
      </TouchableOpacity>

      {expanded && inspections.map((insp: any) => {
        const criticalCount = insp.responses?.filter((r: any) => {
          const item = insp.template?.categories
            ?.flatMap((c: any) => c.items || [])
            ?.find((i: any) => i.id === r.checklistItemId);
          return item?.isCritical && r.passed === false;
        }).length || 0;

        const statusColor = insp.status === 'pending_action' ? '#E65100' : '#1565C0';
        const statusText = insp.status === 'pending_action' ? 'İşlem Bekliyor' : 'Gönderildi';

        return (
          <TouchableOpacity
            key={insp.id}
            style={S.pendingCard}
            onPress={() => router.push(`/inspection/corrective-actions?inspectionId=${insp.id}`)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={S.pendingCardTitle}>{insp.branch?.name || 'Şube'}</Text>
              <Text style={S.pendingCardSub}>
                {new Date(insp.completedAt || insp.createdAt).toLocaleDateString('tr-TR')}
                {' · '}Puan: {Math.round(Number(insp.scorePercentage || 0))}%
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <View style={[S.tag, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[S.tagText, { color: statusColor }]}>{statusText}</Text>
                </View>
                {criticalCount > 0 && (
                  <View style={[S.tag, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[S.tagText, { color: '#C62828' }]}>{criticalCount} kritik</Text>
                  </View>
                )}
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#999" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ===================== KULLANICILAR =====================
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'inspector', phone: '' });
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [u, b] = await Promise.all([api.getUsers(), api.getBranches()]);
      setUsers(u);
      setBranches(Array.isArray(b) ? b : []);
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const toggleBranch = (id: string) => {
    setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openAdd = () => {
    setForm({ fullName: '', email: '', password: '', role: 'inspector', phone: '' });
    setSelectedBranchIds([]);
    setModal('add');
  };

  const openEdit = (item: any) => {
    setForm({ fullName: item.fullName, email: item.email, password: '', role: item.role, phone: item.phone || '' });
    setEditTarget(item);
    setSelectedBranchIds((item.managedBranches || []).map((b: any) => b.id));
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        if (!form.fullName || !form.email || !form.password) { Alert.alert('Hata', 'Tüm alanları doldurun'); setSaving(false); return; }
        if (form.role === 'manager' && selectedBranchIds.length === 0) { Alert.alert('Hata', 'Müdür için en az bir şube seçin'); setSaving(false); return; }
        await api.register({ ...form, branchIds: form.role === 'manager' ? selectedBranchIds : undefined });
      } else {
        const payload: any = { fullName: form.fullName, role: form.role, phone: form.phone || null, isActive: editTarget.isActive };
        if (form.role === 'manager') {
          payload.branchIds = selectedBranchIds;
        } else {
          payload.branchIds = []; // Müdür değilse atamaları kaldır
        }
        await api.updateUser(editTarget.id, payload);
      }
      setModal(null); await fetch();
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSaving(false);
  };

  const toggleActive = async (u: any) => { try { await api.updateUser(u.id, { isActive: !u.isActive }); await fetch(); } catch (e: any) { Alert.alert('Hata', e.message); } };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={users} keyExtractor={u => u.id} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const role = ROLES.find(r => r.value === item.role);
          const managedNames = (item.managedBranches || []).map((b: any) => b.name).join(', ');
          return (
            <View style={S.card}>
              <View style={[S.avatar, { backgroundColor: role?.bg }]}><Text style={[S.avatarText, { color: role?.color }]}>{item.fullName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>{item.fullName}</Text>
                <Text style={S.cardSub}>{item.email}</Text>
                {item.role === 'manager' && managedNames ? (
                  <Text style={[S.cardSub, { color: '#1565C0' }]}>Şubeler: {managedNames}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <View style={[S.tag, { backgroundColor: role?.bg }]}><Text style={[S.tagText, { color: role?.color }]}>{role?.label}</Text></View>
                  <View style={[S.tag, { backgroundColor: item.isActive ? '#E8F5E9' : '#F5F5F5' }]}><Text style={[S.tagText, { color: item.isActive ? '#2E7D32' : '#999' }]}>{item.isActive ? 'Aktif' : 'Pasif'}</Text></View>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity onPress={() => openEdit(item)} style={S.iconBtn}><MaterialIcons name="edit" size={18} color="#2E7D32" /></TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(item)} style={S.iconBtn}><MaterialIcons name={item.isActive ? 'person-off' : 'person'} size={18} color={item.isActive ? '#F44336' : '#4CAF50'} /></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <TouchableOpacity style={S.fab} onPress={openAdd}>
        <MaterialIcons name="person-add" size={22} color="#FFF" /><Text style={S.fabText}>Kullanıcı Ekle</Text>
      </TouchableOpacity>

      <RNModal visible={!!modal} animationType="slide" transparent>
        <View style={S.modalBg}><ScrollView style={{ maxHeight: '80%' }}><View style={S.modalCard}>
          <Text style={S.modalTitle}>{modal === 'add' ? 'Yeni Kullanıcı' : 'Kullanıcıyı Düzenle'}</Text>
          <TextInput style={S.input} placeholder="Ad Soyad" value={form.fullName} onChangeText={t => setForm({ ...form, fullName: t })} />
          {modal === 'add' && <TextInput style={S.input} placeholder="E-posta" value={form.email} onChangeText={t => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" />}
          {modal === 'add' && <TextInput style={S.input} placeholder="Şifre" value={form.password} onChangeText={t => setForm({ ...form, password: t })} secureTextEntry />}
          <TextInput style={S.input} placeholder="Telefon" value={form.phone} onChangeText={t => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
          <Text style={S.labelText}>Rol</Text>
          <View style={S.chipRow}>{ROLES.map(r => (
            <TouchableOpacity key={r.value} style={[S.chip, form.role === r.value && S.chipOn]} onPress={() => setForm({ ...form, role: r.value })}>
              <Text style={[S.chipText, form.role === r.value && { color: '#FFF' }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}</View>

          {/* Müdür için sube secimi */}
          {form.role === 'manager' && (
            <>
              <Text style={S.labelText}>Yonettigi Şubeler *</Text>
              {selectedBranchIds.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {selectedBranchIds.map(id => {
                    const b = branches.find((x: any) => x.id === id);
                    return b ? (
                      <View key={id} style={S.selectedTag}>
                        <Text style={S.selectedTagText}>{b.name}</Text>
                        <TouchableOpacity onPress={() => setSelectedBranchIds(selectedBranchIds.filter(x => x !== id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialIcons name="close" size={14} color="#1565C0" />
                        </TouchableOpacity>
                      </View>
                    ) : null;
                  })}
                </View>
              )}
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, maxHeight: 180, marginBottom: 10 }}>
                <ScrollView nestedScrollEnabled>
                  {branches.map((b: any) => {
                    const selected = selectedBranchIds.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: selected ? '#E8F5E9' : '#FFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}
                        onPress={() => toggleBranch(b.id)}
                      >
                        <MaterialIcons name={selected ? 'check-box' : 'check-box-outline-blank'} size={20} color={selected ? '#2E7D32' : '#BDBDBD'} />
                        <Text style={{ fontSize: 14, color: '#333', marginLeft: 8, flex: 1 }}>{b.name}</Text>
                        <Text style={{ fontSize: 11, color: '#999' }}>{FACILITY_TYPES.find((f: any) => f.value === b.facilityType)?.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              {selectedBranchIds.length === 0 && (
                <Text style={{ fontSize: 12, color: '#F44336', marginBottom: 8 }}>En az bir sube secmelisiniz</Text>
              )}
            </>
          )}

          <View style={S.modalBtns}>
            <TouchableOpacity onPress={() => setModal(null)} style={S.cancelBtn}><Text style={S.cancelText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity onPress={save} style={S.saveBtn} disabled={saving}><Text style={S.saveText}>{saving ? '...' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </RNModal>
    </View>
  );
}

// ===================== SABLONLAR =====================
function TemplatesTab() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: '', facilityType: 'magaza' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.log('Templates fetch error:', e.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.createTemplate({ name: form.name, facilityType: form.facilityType });
      } else {
        await api.updateTemplate(editTarget.id, { name: form.name, facilityType: form.facilityType });
      }
      setModal(null); await fetch();
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSaving(false);
  };

  const toggleActive = async (t: any) => {
    const newState = !t.isActive;
    Alert.alert(
      newState ? 'Şablonu Aktif Et' : 'Şablonu Pasif Yap',
      newState
        ? `"${t.name}" şablonunu tekrar aktif etmek istiyor musunuz?`
        : `"${t.name}" şablonunu pasif yapmak istiyor musunuz? Pasif sablonlar denetimlerde kullanilmaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: newState ? 'Aktif Et' : 'Pasif Yap',
          onPress: async () => {
            try { await api.updateTemplate(t.id, { isActive: newState }); await fetch(); }
            catch (e: any) { Alert.alert('Hata', e.message); }
          },
        },
      ]
    );
  };

  const del = (t: any) => {
    Alert.alert('Şablonu Sil', `"${t.name}" şablonunu silmek istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await api.deleteTemplate(t.id); await fetch(); } catch (e: any) { Alert.alert('Hata', e.message); } } },
    ]);
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={templates} keyExtractor={t => t.id} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const itemCount = item.categories?.reduce((s: number, c: any) => s + (c.items?.length || 0), 0) || 0;
          return (
            <View style={[S.card, !item.isActive && { opacity: 0.55, backgroundColor: '#FAFAFA' }]}>
              <View style={[S.avatar, { backgroundColor: item.isActive ? '#E8F5E9' : '#F5F5F5' }]}><MaterialIcons name="checklist" size={22} color={item.isActive ? '#2E7D32' : '#999'} /></View>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/template/${item.id}`)}>
                <Text style={S.cardTitle}>{item.name}</Text>
                <Text style={S.cardSub}>{FACILITY_TYPES.find(f => f.value === item.facilityType)?.label} · {item.categories?.length || 0} kategori · {itemCount} madde</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <View style={[S.tag, { backgroundColor: item.isActive ? '#E8F5E9' : '#F5F5F5' }]}>
                    <Text style={[S.tagText, { color: item.isActive ? '#2E7D32' : '#999' }]}>{item.isActive ? 'Aktif' : 'Pasif'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={{ gap: 6 }}>
                <TouchableOpacity onPress={() => { setForm({ name: item.name, facilityType: item.facilityType }); setEditTarget(item); setModal('edit'); }} style={S.iconBtn}>
                  <MaterialIcons name="edit" size={18} color="#2E7D32" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(item)} style={S.iconBtn}>
                  <MaterialIcons name={item.isActive ? 'visibility-off' : 'visibility'} size={18} color={item.isActive ? '#FF9800' : '#4CAF50'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => del(item)} style={S.iconBtn}>
                  <MaterialIcons name="delete" size={18} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={S.emptyBox}><MaterialIcons name="checklist" size={40} color="#E0E0E0" /><Text style={S.emptyText}>Şablon yok</Text></View>}
      />
      <TouchableOpacity style={S.fab} onPress={() => { setForm({ name: '', facilityType: 'magaza' }); setModal('add'); }}>
        <MaterialIcons name="add" size={22} color="#FFF" /><Text style={S.fabText}>Yeni Şablon</Text>
      </TouchableOpacity>

      <RNModal visible={!!modal} animationType="slide" transparent>
        <View style={S.modalBg}><View style={S.modalCard}>
          <Text style={S.modalTitle}>{modal === 'add' ? 'Yeni Denetim Şablonu' : 'Şablonu Düzenle'}</Text>
          <TextInput style={S.input} placeholder="Şablon adı (örn. Mağaza Genel Denetim)" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
          <Text style={S.labelText}>Tesis Tipi</Text>
          <View style={S.chipRow}>{FACILITY_TYPES.map(f => (
            <TouchableOpacity key={f.value} style={[S.chip, form.facilityType === f.value && S.chipOn]} onPress={() => setForm({ ...form, facilityType: f.value })}>
              <Text style={[S.chipText, form.facilityType === f.value && { color: '#FFF' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}</View>
          <View style={S.modalBtns}>
            <TouchableOpacity onPress={() => setModal(null)} style={S.cancelBtn}><Text style={S.cancelText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity onPress={save} style={S.saveBtn} disabled={saving}><Text style={S.saveText}>{saving ? '...' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </RNModal>
    </View>
  );
}

// ===================== SUBELER =====================
function BranchesTab() {
  const [branches, setBranches] = useState<any[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: '', facilityType: 'magaza', address: '', city: 'Erzurum', latitude: 39.9043, longitude: 41.2679 });
  const [saving, setSaving] = useState(false);
  const webViewRef = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [b, ft] = await Promise.all([api.getBranches(), api.getFacilityTypes()]);
      setBranches(b);
      setFacilityTypes(ft.filter((t: any) => t.is_active));
    } catch {} setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = async () => {
    let lat = 39.9043, lon = 41.2679;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch {}
    setForm({ name: '', facilityType: facilityTypes[0]?.key || 'magaza', address: '', city: 'Erzurum', latitude: lat, longitude: lon });
    setModal('add');
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, facilityType: item.facilityType, address: item.address || '', city: item.city || 'Erzurum', latitude: item.latitude || 39.9043, longitude: item.longitude || 41.2679 });
    setEditTarget(item);
    setModal('edit');
  };

  const webViewRef2 = useState<any>(null);

  // Adres yazilinca haritada ara
  const searchAddress = async () => {
    const query = [form.address, form.city].filter(Boolean).join(', ');
    if (!query.trim()) return;
    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=1', {
        headers: { 'User-Agent': 'ErtansaAudit/1.0' },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setForm(f => ({ ...f, latitude: lat, longitude: lon }));
        // WebView'a yeni konum gonder
        if (webViewRef2[0]) {
          webViewRef2[0].injectJavaScript('moveMarker(' + lat + ',' + lon + ');true;');
        }
      } else {
        Alert.alert('Bulunamadı', 'Bu adres haritada bulunamadı. Haritaya tıklayarak konum secebilirsiniz.');
      }
    } catch {
      Alert.alert('Hata', 'Adres aranamadi.');
    }
  };

  const getMapHtml = (lat: number, lon: number) => '<!DOCTYPE html><html><head>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">' +
    '<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>' +
    '</head><body><div id="map"></div>' +
    '<script>var marker,map;' +
    'function initMap(){' +
    '  var pos={lat:' + lat + ',lng:' + lon + '};' +
    '  map=new google.maps.Map(document.getElementById("map"),{zoom:15,center:pos,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});' +
    '  marker=new google.maps.Marker({position:pos,map:map,draggable:true,animation:google.maps.Animation.DROP});' +
    '  map.addListener("click",function(e){' +
    '    marker.setPosition(e.latLng);' +
    '    window.ReactNativeWebView.postMessage(JSON.stringify({lat:e.latLng.lat(),lng:e.latLng.lng()}));' +
    '  });' +
    '  marker.addListener("dragend",function(){' +
    '    var p=marker.getPosition();' +
    '    window.ReactNativeWebView.postMessage(JSON.stringify({lat:p.lat(),lng:p.lng()}));' +
    '  });' +
    '}' +
    'function moveMarker(lat,lng){' +
    '  var pos={lat:lat,lng:lng};' +
    '  marker.setPosition(pos);' +
    '  map.setCenter(pos);' +
    '  map.setZoom(16);' +
    '  window.ReactNativeWebView.postMessage(JSON.stringify({lat:lat,lng:lng}));' +
    '}' +
    '</script>' +
    '<script src="https://maps.googleapis.com/maps/api/js?callback=initMap" async defer></script>' +
    '</body></html>';

  const deleteBranch = (item: any) => {
    Alert.alert('Subeyi Sil', `"${item.name}" subesini silmek istiyor musunuz?`, [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await api.deleteBranch(item.id); await fetchData(); }
        catch (e: any) { Alert.alert('Hata', e.message); }
      }},
    ]);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = { name: form.name, facilityType: form.facilityType, address: form.address, city: form.city, latitude: form.latitude, longitude: form.longitude };
      if (modal === 'add') {
        await api.createBranch(data);
      } else {
        await api.updateBranch(editTarget.id, data);
      }
      setModal(null); await fetchData();
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSaving(false);
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={branches} keyExtractor={b => b.id} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={[S.avatar, { backgroundColor: '#E3F2FD' }]}><MaterialIcons name="store" size={22} color="#1565C0" /></View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>{item.name}</Text>
              <Text style={S.cardSub}>{item.address || item.city} · {facilityTypes.find((f: any) => f.key === item.facilityType)?.label || item.facilityType}</Text>
              {item.latitude && <Text style={S.cardSub}><MaterialIcons name="location-on" size={12} color="#999" /> {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>}
              <View style={[S.tag, { backgroundColor: item.isActive ? '#E8F5E9' : '#F5F5F5', marginTop: 4 }]}>
                <Text style={[S.tagText, { color: item.isActive ? '#2E7D32' : '#999' }]}>{item.isActive ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => openEdit(item)} style={S.iconBtn}>
                <MaterialIcons name="edit" size={18} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteBranch(item)} style={S.iconBtn}>
                <MaterialIcons name="delete" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={S.emptyBox}><MaterialIcons name="store" size={40} color="#E0E0E0" /><Text style={S.emptyText}>Şube yok</Text></View>}
      />
      <TouchableOpacity style={S.fab} onPress={openAdd}>
        <MaterialIcons name="add-business" size={22} color="#FFF" /><Text style={S.fabText}>Yeni Şube</Text>
      </TouchableOpacity>

      {/* Şube Modal - Tam ekran harita ile */}
      <RNModal visible={!!modal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
            <TouchableOpacity onPress={() => setModal(null)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#212121', marginLeft: 12 }}>{modal === 'add' ? 'Yeni Şube' : 'Şubeyi Düzenle'}</Text>
            <TouchableOpacity onPress={save} disabled={saving} style={{ backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>{saving ? '...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <TextInput style={S.input} placeholder="Şube adı" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />

            {/* Adres + Arama */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TextInput style={[S.input, { flex: 1, marginBottom: 0 }]} placeholder="Adres (cadde, sokak)" value={form.address} onChangeText={t => setForm({ ...form, address: t })} />
              <TextInput style={[S.input, { width: 100, marginBottom: 0 }]} placeholder="Sehir" value={form.city} onChangeText={t => setForm({ ...form, city: t })} />
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E3F2FD', borderRadius: 10, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: '#90CAF9' }}
              onPress={searchAddress}
            >
              <MaterialIcons name="search" size={20} color="#1565C0" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1565C0' }}>Adresi Haritada Bul</Text>
            </TouchableOpacity>

            <Text style={S.labelText}>Tesis Tipi</Text>
            <View style={S.chipRow}>
              {facilityTypes.map((f: any) => (
                <TouchableOpacity key={f.key} style={[S.chip, form.facilityType === f.key && S.chipOn]} onPress={() => setForm({ ...form, facilityType: f.key })}>
                  <Text style={[S.chipText, form.facilityType === f.key && { color: '#FFF' }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Harita ile konum secimi */}
            <Text style={S.labelText}>Konum (haritaya tıklayarak veya pin sürükleyerek secin)</Text>
            <View style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
              <WebView
                ref={(r: any) => { webViewRef2[0] = r; }}
                style={{ width: '100%', height: 300 }}
                originWhitelist={['*']}
                source={{ html: getMapHtml(form.latitude, form.longitude) }}
                onMessage={(event) => {
                  try {
                    const { lat, lng } = JSON.parse(event.nativeEvent.data);
                    setForm(f => ({ ...f, latitude: lat, longitude: lng }));
                  } catch {}
                }}
                scrollEnabled={false}
                nestedScrollEnabled
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 12 }}>
              <MaterialIcons name="location-on" size={18} color="#2E7D32" />
              <Text style={{ fontSize: 13, color: '#333' }}>{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</Text>
            </View>
          </ScrollView>
        </View>
      </RNModal>
    </View>
  );
}

// ===================== TAKVIM / PLANLAR =====================
function SchedulesTab() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ branchId: '', templateId: '', inspectorId: '', frequencyDays: '30', nextDueDate: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [s, b, t, u] = await Promise.all([api.getSchedules(), api.getBranches(), api.getTemplates(), api.getUsers()]);
      setSchedules(s); setBranches(b); setTemplates(t); setUsers(u.filter((x: any) => x.role === 'inspector'));
    } catch {} setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const save = async () => {
    if (!form.branchId || !form.templateId || !form.nextDueDate) { Alert.alert('Hata', 'Sube, sablon ve tarih secin'); return; }
    setSaving(true);
    try {
      await api.createSchedule({
        branchId: form.branchId,
        templateId: form.templateId,
        inspectorId: form.inspectorId || null,
        frequencyDays: parseInt(form.frequencyDays) || 30,
        nextDueDate: form.nextDueDate,
      });
      setShowAdd(false); await fetch();
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSaving(false);
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={schedules} keyExtractor={s => s.id} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const today = new Date().toISOString().split('T')[0];
          const due = (item.nextDueDate || '').split('T')[0];
          const daysLeft = Math.ceil((new Date(due).getTime() - new Date(today).getTime()) / 86400000);
          return (
            <View style={S.card}>
              <View style={[S.avatar, { backgroundColor: daysLeft < 0 ? '#FFEBEE' : '#E3F2FD' }]}>
                <MaterialIcons name={daysLeft < 0 ? 'warning' : 'event'} size={22} color={daysLeft < 0 ? '#C62828' : '#1565C0'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>{item.branch?.name || 'Şube'}</Text>
                <Text style={S.cardSub}>{item.template?.name || 'Şablon'}</Text>
                <Text style={S.cardSub}>Her {item.frequencyDays} gunde · {item.inspector?.fullName || 'Atanmamış'}</Text>
              </View>
              <View style={[S.tag, { backgroundColor: daysLeft < 0 ? '#FFEBEE' : daysLeft <= 3 ? '#FFF3E0' : '#E3F2FD' }]}>
                <Text style={[S.tagText, { color: daysLeft < 0 ? '#C62828' : daysLeft <= 3 ? '#E65100' : '#1565C0' }]}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}g gecikti` : daysLeft === 0 ? 'Bugun' : `${daysLeft}g kaldi`}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={S.emptyBox}><MaterialIcons name="event" size={40} color="#E0E0E0" /><Text style={S.emptyText}>Denetim plani yok</Text></View>}
      />
      <TouchableOpacity style={S.fab} onPress={() => { setForm({ branchId: '', templateId: '', inspectorId: '', frequencyDays: '30', nextDueDate: '' }); setShowAdd(true); }}>
        <MaterialIcons name="add" size={22} color="#FFF" /><Text style={S.fabText}>Yeni Plan</Text>
      </TouchableOpacity>

      <RNModal visible={showAdd} animationType="slide" transparent>
        <View style={S.modalBg}><ScrollView style={{ maxHeight: '80%' }}><View style={S.modalCard}>
          <Text style={S.modalTitle}>Yeni Denetim Planı</Text>

          <Text style={S.labelText}>Sube</Text>
          <View style={S.chipRow}>{branches.slice(0, 10).map(b => (
            <TouchableOpacity key={b.id} style={[S.chip, form.branchId === b.id && S.chipOn]} onPress={() => setForm({ ...form, branchId: b.id })}>
              <Text style={[S.chipText, form.branchId === b.id && { color: '#FFF' }]}>{b.name}</Text>
            </TouchableOpacity>
          ))}</View>

          <Text style={S.labelText}>Sablon</Text>
          <View style={S.chipRow}>{templates.map(t => (
            <TouchableOpacity key={t.id} style={[S.chip, form.templateId === t.id && S.chipOn]} onPress={() => setForm({ ...form, templateId: t.id })}>
              <Text style={[S.chipText, form.templateId === t.id && { color: '#FFF' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}</View>

          <Text style={S.labelText}>Denetçi (opsiyonel)</Text>
          <View style={S.chipRow}>{users.map(u => (
            <TouchableOpacity key={u.id} style={[S.chip, form.inspectorId === u.id && S.chipOn]} onPress={() => setForm({ ...form, inspectorId: form.inspectorId === u.id ? '' : u.id })}>
              <Text style={[S.chipText, form.inspectorId === u.id && { color: '#FFF' }]}>{u.fullName}</Text>
            </TouchableOpacity>
          ))}</View>

          <Text style={S.labelText}>Periyot (gun)</Text>
          <TextInput style={S.input} placeholder="30" value={form.frequencyDays} onChangeText={t => setForm({ ...form, frequencyDays: t })} keyboardType="number-pad" />

          <Text style={S.labelText}>Ilk Denetim Tarihi (YYYY-MM-DD)</Text>
          <TextInput style={S.input} placeholder="2026-04-01" value={form.nextDueDate} onChangeText={t => setForm({ ...form, nextDueDate: t })} />

          <View style={S.modalBtns}>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={S.cancelBtn}><Text style={S.cancelText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity onPress={save} style={S.saveBtn} disabled={saving}><Text style={S.saveText}>{saving ? '...' : 'Oluştur'}</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </RNModal>
    </View>
  );
}

// ===================== TESIS TIPLERI =====================
function FacilityTypesTab() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ key: '', label: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try { setTypes(await api.getFacilityTypes()); } catch {} setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!form.key.trim() || !form.label.trim()) { Alert.alert('Hata', 'Kod ve etiket gerekli'); return; }
    const cleanKey = form.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setSaving(true);
    try {
      await api.createFacilityType({ key: cleanKey, label: form.label.trim() });
      setShowAdd(false); setForm({ key: '', label: '' }); await fetch();
      Alert.alert('Başarılı', `"${form.label.trim()}" tesis tipi eklendi`);
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSaving(false);
  };

  const toggleActive = async (t: any) => {
    try { await api.updateFacilityType(t.key, { is_active: !t.is_active }); await fetch(); }
    catch (e: any) { Alert.alert('Hata', e.message); }
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={types} keyExtractor={t => t.key} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[S.card, !item.is_active && { opacity: 0.5 }]}>
            <View style={[S.avatar, { backgroundColor: item.is_active ? '#E8F5E9' : '#F5F5F5' }]}>
              <MaterialIcons name="category" size={22} color={item.is_active ? '#2E7D32' : '#999'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>{item.label}</Text>
              <Text style={S.cardSub}>Kod: {item.key}</Text>
              <View style={[S.tag, { backgroundColor: item.is_active ? '#E8F5E9' : '#F5F5F5', marginTop: 4 }]}>
                <Text style={[S.tagText, { color: item.is_active ? '#2E7D32' : '#999' }]}>{item.is_active ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggleActive(item)} style={S.iconBtn}>
              <MaterialIcons name={item.is_active ? 'visibility-off' : 'visibility'} size={18} color={item.is_active ? '#FF9800' : '#4CAF50'} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<View style={S.emptyBox}><MaterialIcons name="category" size={40} color="#E0E0E0" /><Text style={S.emptyText}>Tesis tipi yok</Text></View>}
      />
      <TouchableOpacity style={S.fab} onPress={() => { setForm({ key: '', label: '' }); setShowAdd(true); }}>
        <MaterialIcons name="add" size={22} color="#FFF" /><Text style={S.fabText}>Yeni Tip Ekle</Text>
      </TouchableOpacity>

      <RNModal visible={showAdd} animationType="slide" transparent>
        <View style={S.modalBg}><View style={S.modalCard}>
          <Text style={S.modalTitle}>Yeni Tesis Tipi</Text>
          <Text style={S.labelText}>Tip Kodu (ingilizce, bosluksuz)</Text>
          <TextInput style={S.input} placeholder="örn. fabrika" value={form.key} onChangeText={t => setForm({ ...form, key: t })} autoCapitalize="none" autoCorrect={false} />
          <Text style={S.labelText}>Gorunen Adi</Text>
          <TextInput style={S.input} placeholder="örn. Fabrika" value={form.label} onChangeText={t => setForm({ ...form, label: t })} />
          <View style={S.modalBtns}>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={S.cancelBtn}><Text style={S.cancelText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={S.saveBtn} disabled={saving}><Text style={S.saveText}>{saving ? '...' : 'Ekle'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </RNModal>
    </View>
  );
}

// ===================== STILLER =====================
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabScroll: { maxHeight: 72 },
  tabRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', minHeight: 48 },
  tabActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#212121' },
  cardSub: { fontSize: 12, color: '#999', marginTop: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '600' },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F5F5F5' },
  fab: { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#BDBDBD', marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#212121', marginBottom: 10 },
  labelText: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F5F5F5' },
  chipOn: { backgroundColor: '#2E7D32' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F5F5' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2E7D32' },
  saveText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  selectBoxText: { flex: 1, fontSize: 14, color: '#333' },
  selectedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  selectedTagText: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  // Pending inspections
  pendingSection: { backgroundColor: '#FFF3E0', borderBottomWidth: 1, borderBottomColor: '#FFE0B2' },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#E65100' },
  pendingCountBadge: { backgroundColor: '#E65100', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  pendingCountText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  pendingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 12, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  pendingCardTitle: { fontSize: 14, fontWeight: '600', color: '#212121' },
  pendingCardSub: { fontSize: 12, color: '#999', marginTop: 2 },
});
