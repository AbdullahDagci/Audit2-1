import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import ToastMessage from 'react-native-toast-message';
import { haptic } from '@/lib/haptics';

const LABEL_SUGGESTIONS = [
  'Konu',
  'Tespit Edilen Durum',
  'Alınan Önlem',
  'Sonuç',
  'Katılımcılar',
];

interface FormRow {
  id: string;
  label: string;
  value: string;
}

export default function TutanakScreen() {
  const router = useRouter();
  const { inspectionId, tutanakId } = useLocalSearchParams<{ inspectionId: string; tutanakId?: string }>();

  const [title, setTitle] = useState('Tutanak');
  const [rows, setRows] = useState<FormRow[]>([
    { id: '1', label: 'Konu', value: '' },
    { id: '2', label: 'Tespit Edilen Durum', value: '' },
    { id: '3', label: 'Alınan Önlem', value: '' },
    { id: '4', label: 'Sonuç', value: '' },
    { id: '5', label: 'Katılımcılar', value: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(tutanakId || null);
  const [isSent, setIsSent] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  // Mevcut tutanagi yukle
  const fetchExisting = useCallback(async () => {
    if (!tutanakId) return;
    setLoading(true);
    try {
      const tutanak = await api.getTutanaklar(inspectionId!);
      const found = tutanak.find((t: any) => t.id === tutanakId);
      if (found) {
        setTitle(found.title || 'Tutanak');
        setExistingId(found.id);
        setIsSent(found.status === 'sent');
        if (found.content && Array.isArray(found.content)) {
          setRows(found.content.map((item: any, idx: number) => ({
            id: String(idx + 1),
            label: item.label || '',
            value: item.value || '',
          })));
        }
      }
    } catch (err: any) {
      // Sessiz hata
    }
    setLoading(false);
  }, [tutanakId, inspectionId]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  const addRow = () => {
    const newId = String(Date.now());
    setRows([...rows, { id: newId, label: '', value: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      Alert.alert('Uyarı', 'En az bir alan olmalıdır.');
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: 'label' | 'value', text: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, [field]: text } : r));
  };

  const selectSuggestion = (rowId: string, suggestion: string) => {
    updateRow(rowId, 'label', suggestion);
    setShowSuggestions(null);
  };

  const buildContent = () => {
    return rows.map((r) => ({ label: r.label, value: r.value }));
  };

  const handleSave = async () => {
    const content = buildContent();
    const hasContent = content.some((c) => c.label.trim() || c.value.trim());
    if (!hasContent) {
      Alert.alert('Uyarı', 'En az bir alan doldurun.');
      return;
    }

    setSaving(true);
    try {
      if (existingId) {
        await api.updateTutanak(existingId, { title, content });
        haptic.success();
        ToastMessage.show({ type: 'success', text1: 'Kaydedildi', text2: 'Tutanak taslak olarak güncellendi.' });
      } else {
        const created = await api.createTutanak({
          inspectionId: inspectionId!,
          title,
          content,
        });
        setExistingId(created.id);
        haptic.success();
        ToastMessage.show({ type: 'success', text1: 'Kaydedildi', text2: 'Tutanak taslak olarak kaydedildi.' });
      }
    } catch (err: any) {
      haptic.error();
      ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Tutanak kaydedilemedi.' });
    }
    setSaving(false);
  };

  const handleSend = async () => {
    const content = buildContent();
    const hasContent = content.some((c) => c.label.trim() && c.value.trim());
    if (!hasContent) {
      Alert.alert('Uyarı', 'Göndermeden önce en az bir alanı doldurun.');
      return;
    }

    Alert.alert(
      'Tutanak Gönder',
      'Tutanağı göndermek istediğinize emin misiniz? Gönderdikten sonra değişiklik yapamazsınız.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setSending(true);
            try {
              // Oncelikle kaydet
              let id = existingId;
              if (!id) {
                const created = await api.createTutanak({
                  inspectionId: inspectionId!,
                  title,
                  content,
                });
                id = created.id;
                setExistingId(id);
              } else {
                await api.updateTutanak(id, { title, content });
              }

              // Sonra gonder
              await api.sendTutanak(id!);
              setIsSent(true);
              haptic.success();
              ToastMessage.show({ type: 'success', text1: 'Gonderildi', text2: 'Tutanak başarıyla gönderildi.' });
              setTimeout(() => router.back(), 1500);
            } catch (err: any) {
              haptic.error();
              ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Tutanak gönderilemedi.' });
            }
            setSending(false);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ color: '#999', marginTop: 12 }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Geri butonu */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#2E7D32" />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
        {isSent && (
          <View style={styles.sentBadge}>
            <MaterialIcons name="check-circle" size={16} color="#FFF" />
            <Text style={styles.sentBadgeText}>Gönderildi</Text>
          </View>
        )}
      </View>

      {/* Baslik */}
      <View style={styles.headerCard}>
        <MaterialIcons name="description" size={28} color="#2E7D32" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tutanak</Text>
          <Text style={styles.headerSub}>Denetim tutanağı oluşturun</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Baslik alani */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tutanak Başlığı</Text>
          <TextInput
            style={[styles.input, isSent && styles.inputDisabled]}
            value={title}
            onChangeText={setTitle}
            placeholder="Tutanak"
            editable={!isSent}
          />
        </View>

        {/* Dinamik form alanlari */}
        {rows.map((row, index) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowNumber}>{index + 1}</Text>
              {!isSent && (
                <TouchableOpacity onPress={() => removeRow(row.id)} style={styles.removeBtn}>
                  <MaterialIcons name="close" size={18} color="#F44336" />
                </TouchableOpacity>
              )}
            </View>

            {/* Etiket */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Etiket</Text>
              <TextInput
                style={[styles.input, isSent && styles.inputDisabled]}
                value={row.label}
                onChangeText={(t) => updateRow(row.id, 'label', t)}
                placeholder="Alan etiketi (örn. Konu)"
                editable={!isSent}
                onFocus={() => setShowSuggestions(row.id)}
                onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              />
              {showSuggestions === row.id && !isSent && (
                <View style={styles.suggestionsBox}>
                  {LABEL_SUGGESTIONS
                    .filter((s) => !rows.some((r) => r.label === s && r.id !== row.id))
                    .map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={styles.suggestionItem}
                        onPress={() => selectSuggestion(row.id, suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>

            {/* Deger */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Değer</Text>
              <TextInput
                style={[styles.textArea, isSent && styles.inputDisabled]}
                value={row.value}
                onChangeText={(t) => updateRow(row.id, 'value', t)}
                placeholder="Açıklama yazın..."
                multiline
                editable={!isSent}
              />
            </View>
          </View>
        ))}

        {/* Alan ekle butonu */}
        {!isSent && (
          <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
            <MaterialIcons name="add-circle-outline" size={22} color="#2E7D32" />
            <Text style={styles.addRowText}>Yeni Alan Ekle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Alt butonlar */}
      {!isSent && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.draftBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || sending}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color="#2E7D32" />
                <Text style={styles.draftBtnText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={saving || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color="#FFF" />
                <Text style={styles.sendBtnText}>Gönder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#2E7D32' },
  sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sentBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
  headerSub: { fontSize: 13, color: '#757575', marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 14, color: '#212121' },
  inputDisabled: { backgroundColor: '#F0F0F0', color: '#999' },
  textArea: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', color: '#212121' },
  rowCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowNumber: { fontSize: 14, fontWeight: '700', color: '#2E7D32', backgroundColor: '#E8F5E9', width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28 },
  removeBtn: { padding: 4 },
  suggestionsBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  suggestionText: { fontSize: 13, color: '#333' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: '#2E7D32', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addRowText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  bottomBar: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E0E0',
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  draftBtn: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#2E7D32' },
  draftBtnText: { fontSize: 15, fontWeight: '600', color: '#2E7D32' },
  sendBtn: { backgroundColor: '#2E7D32' },
  sendBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
