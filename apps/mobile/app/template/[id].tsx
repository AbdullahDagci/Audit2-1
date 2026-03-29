import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal as RNModal, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';

const ITEM_TYPES = [
  { value: 'boolean', label: 'Evet/Hayir' },
  { value: 'score', label: 'Puan (0-10)' },
  { value: 'text', label: 'Metin' },
  { value: 'photo_required', label: 'Foto Zorunlu' },
];

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Category modal
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: '', weight: '1.0' });
  const [saving, setSaving] = useState(false);

  // Item modal
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemCatId, setItemCatId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    questionText: '', itemType: 'boolean', maxScore: '10',
    isCritical: false, photoRequired: false, helpText: '',
  });

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTemplate(id!);
      setTemplate(data);
      if (data.categories?.length > 0 && !expandedCat) {
        setExpandedCat(data.categories[0].id);
      }
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Sablon yuklenemedi');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchTemplate();
  }, [id]);

  // ===== CATEGORY =====
  const openAddCat = () => {
    setCatForm({ name: '', weight: '1.0' });
    setEditingCat(null);
    setCatModal(true);
  };

  const openEditCat = (cat: any) => {
    setCatForm({ name: cat.name, weight: String(cat.weight) });
    setEditingCat(cat);
    setCatModal(true);
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, {
          name: catForm.name.trim(),
          weight: parseFloat(catForm.weight) || 1.0,
        });
      } else {
        await api.addCategory(id!, {
          name: catForm.name.trim(),
          weight: parseFloat(catForm.weight) || 1.0,
        });
      }
      setCatModal(false);
      await fetchTemplate();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
    setSaving(false);
  };

  const deleteCat = (cat: any) => {
    Alert.alert('Kategori Sil', `"${cat.name}" kategorisi ve icindeki tum maddeler silinecek. Emin misiniz?`, [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try { await api.deleteCategory(cat.id); await fetchTemplate(); }
          catch (err: any) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  };

  // ===== ITEM =====
  const openAddItem = (categoryId: string) => {
    setItemForm({ questionText: '', itemType: 'boolean', maxScore: '10', isCritical: false, photoRequired: false, helpText: '' });
    setEditingItem(null);
    setItemCatId(categoryId);
    setItemModal(true);
  };

  const openEditItem = (item: any) => {
    setItemForm({
      questionText: item.questionText,
      itemType: item.itemType,
      maxScore: String(item.maxScore),
      isCritical: item.isCritical,
      photoRequired: item.photoRequired,
      helpText: item.helpText || '',
    });
    setEditingItem(item);
    setItemCatId(null);
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!itemForm.questionText.trim()) return;
    setSaving(true);
    try {
      const data = {
        questionText: itemForm.questionText.trim(),
        itemType: itemForm.itemType,
        maxScore: parseInt(itemForm.maxScore) || 10,
        isCritical: itemForm.isCritical,
        photoRequired: itemForm.photoRequired,
        helpText: itemForm.helpText || null,
      };
      if (editingItem) {
        await api.updateItem(editingItem.id, data);
      } else {
        await api.addItem(itemCatId!, data);
      }
      setItemModal(false);
      await fetchTemplate();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
    setSaving(false);
  };

  const deleteItem = (item: any) => {
    Alert.alert('Madde Sil', `"${item.questionText}" maddesini silmek istiyor musunuz?`, [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try { await api.deleteItem(item.id); await fetchTemplate(); }
          catch (err: any) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  };

  // ===== RENDER =====
  if (loading) {
    return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  if (!template) {
    return (
      <View style={S.center}>
        <MaterialIcons name="error-outline" size={48} color="#E0E0E0" />
        <Text style={{ color: '#999', marginTop: 12 }}>Sablon bulunamadi</Text>
      </View>
    );
  }

  const totalItems = (template.categories || []).reduce(
    (s: number, c: any) => s + (c.items?.length || 0), 0
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Header Card */}
        <View style={S.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={S.templateName}>{template.name}</Text>
            <Text style={S.templateSub}>
              {template.categories?.length || 0} kategori · {totalItems} madde
            </Text>
          </View>
          <TouchableOpacity onPress={() => setExpandedCat(expandedCat ? null : template.categories?.[0]?.id)}>
            <MaterialIcons
              name={expandedCat ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={28} color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        {(template.categories || [])
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((cat: any) => {
            const isExpanded = expandedCat === cat.id;
            const items = (cat.items || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
            return (
              <View key={cat.id} style={S.catCard}>
                {/* Category Header */}
                <View style={S.catHeader}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => setExpandedCat(isExpanded ? null : cat.id)}
                  >
                    <MaterialIcons
                      name={isExpanded ? 'expand-more' : 'chevron-right'}
                      size={22} color="#666"
                    />
                    <Text style={S.catName}>{cat.name}</Text>
                    <Text style={S.catCount}>({items.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEditCat(cat)} style={{ padding: 4 }}>
                    <MaterialIcons name="edit" size={18} color="#2E7D32" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCat(cat)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>

                {/* Items */}
                {isExpanded && (
                  <View style={S.itemsContainer}>
                    {items.map((item: any, idx: number) => (
                      <View key={item.id} style={S.itemRow}>
                        <Text style={S.itemNum}>{idx + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={S.itemText}>{item.questionText}</Text>
                          <View style={S.badgeRow}>
                            {item.isCritical && (
                              <View style={[S.badge, { backgroundColor: '#FFF3E0' }]}>
                                <Text style={[S.badgeText, { color: '#E65100' }]}>Kritik</Text>
                              </View>
                            )}
                            {item.photoRequired && (
                              <View style={[S.badge, { backgroundColor: '#E3F2FD' }]}>
                                <Text style={[S.badgeText, { color: '#1565C0' }]}>Foto</Text>
                              </View>
                            )}
                            <Text style={S.itemScore}>{item.maxScore}p</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => openEditItem(item)} style={{ padding: 6 }}>
                          <MaterialIcons name="edit" size={18} color="#2E7D32" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteItem(item)} style={{ padding: 6 }}>
                          <MaterialIcons name="close" size={18} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add Item */}
                    <TouchableOpacity style={S.addItemBtn} onPress={() => openAddItem(cat.id)}>
                      <MaterialIcons name="add" size={18} color="#2E7D32" />
                      <Text style={S.addItemText}>Madde Ekle</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

        {/* Add Category */}
        <TouchableOpacity style={S.addCatBtn} onPress={openAddCat}>
          <MaterialIcons name="add-circle-outline" size={22} color="#2E7D32" />
          <Text style={S.addCatText}>Kategori Ekle</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== CATEGORY MODAL ===== */}
      <RNModal visible={catModal} animationType="slide" transparent>
        <View style={S.modalBg}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>{editingCat ? 'Kategori Duzenle' : 'Yeni Kategori'}</Text>
            <TextInput
              style={S.input}
              placeholder="Kategori adi (orn. Temizlik ve Hijyen)"
              value={catForm.name}
              onChangeText={t => setCatForm({ ...catForm, name: t })}
            />
            <TextInput
              style={S.input}
              placeholder="Agirlik (orn. 1.0)"
              value={catForm.weight}
              onChangeText={t => setCatForm({ ...catForm, weight: t })}
              keyboardType="decimal-pad"
            />
            <Text style={S.helpText}>Yuksek agirlik = puanlamada daha etkili</Text>
            <View style={S.modalBtns}>
              <TouchableOpacity onPress={() => setCatModal(false)} style={S.cancelBtn}>
                <Text style={S.cancelText}>Iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveCat} style={S.saveBtn} disabled={saving}>
                <Text style={S.saveText}>{saving ? '...' : 'Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>

      {/* ===== ITEM MODAL ===== */}
      <RNModal visible={itemModal} animationType="slide" transparent>
        <View style={S.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>{editingItem ? 'Madde Duzenle' : 'Yeni Madde'}</Text>
              <TextInput
                style={[S.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Soru metni (orn. Zemin temiz mi?)"
                value={itemForm.questionText}
                onChangeText={t => setItemForm({ ...itemForm, questionText: t })}
                multiline
              />

              <Text style={S.label}>Yanit Tipi</Text>
              <View style={S.chipRow}>
                {ITEM_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[S.chip, itemForm.itemType === t.value && S.chipOn]}
                    onPress={() => setItemForm({ ...itemForm, itemType: t.value })}
                  >
                    <Text style={[S.chipText, itemForm.itemType === t.value && { color: '#FFF' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={S.input}
                placeholder="Maks puan (orn. 10)"
                value={itemForm.maxScore}
                onChangeText={t => setItemForm({ ...itemForm, maxScore: t })}
                keyboardType="number-pad"
              />

              <View style={S.switchRow}>
                <Text style={S.switchLabel}>Kritik Madde</Text>
                <Switch
                  value={itemForm.isCritical}
                  onValueChange={v => setItemForm({ ...itemForm, isCritical: v })}
                  trackColor={{ true: '#FF9800' }}
                />
              </View>

              <View style={S.switchRow}>
                <Text style={S.switchLabel}>Fotograf Zorunlu</Text>
                <Switch
                  value={itemForm.photoRequired}
                  onValueChange={v => setItemForm({ ...itemForm, photoRequired: v })}
                  trackColor={{ true: '#1565C0' }}
                />
              </View>

              <TextInput
                style={S.input}
                placeholder="Yardim metni (opsiyonel)"
                value={itemForm.helpText}
                onChangeText={t => setItemForm({ ...itemForm, helpText: t })}
              />

              <View style={S.modalBtns}>
                <TouchableOpacity onPress={() => setItemModal(false)} style={S.cancelBtn}>
                  <Text style={S.cancelText}>Iptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveItem} style={S.saveBtn} disabled={saving}>
                  <Text style={S.saveText}>{saving ? '...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </RNModal>
    </View>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  headerCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  templateName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  templateSub: { fontSize: 13, color: '#999', marginTop: 4 },
  catCard: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0',
  },
  catName: { fontSize: 15, fontWeight: '600', color: '#333' },
  catCount: { fontSize: 13, color: '#999' },
  itemsContainer: { paddingHorizontal: 8, paddingBottom: 8 },
  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F5F5F5',
  },
  itemNum: { fontSize: 13, color: '#999', width: 24, marginTop: 2 },
  itemText: { fontSize: 14, color: '#333', lineHeight: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  itemScore: { fontSize: 12, color: '#999' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  addItemText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 4,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, borderStyle: 'dashed',
  },
  addCatText: { fontSize: 15, fontWeight: '600', color: '#2E7D32' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#FAFAFA',
  },
  helpText: { fontSize: 12, color: '#999', marginBottom: 12, marginTop: -6 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  chipOn: { backgroundColor: '#2E7D32' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  switchLabel: { fontSize: 14, color: '#333' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2E7D32', alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
