import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { CategorySection } from '@/components/inspection/CategorySection';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { useInspectionStore } from '@/stores/inspection-store';
import { useAuthStore } from '@/stores/auth-store';
import { calculateCategoryScore, calculateOverallScore } from '@/lib/scoring';
import { api } from '@/lib/api';
import ToastMessage from 'react-native-toast-message';
import { haptic } from '@/lib/haptics';

export default function InspectionFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { branchName, templateName, responses, photos, resetInspection } = useInspectionStore();

  const [inspection, setInspection] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [previousFindings, setPreviousFindings] = useState<any[]>([]);
  const [findingsExpanded, setFindingsExpanded] = useState(false);

  // Denetim ve sablon verilerini API'den cek
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await api.getInspection(id);
      setInspection(insp);

      // Önceki bulguları cek
      if (insp.branchId) {
        try {
          const findings = await api.getPreviousFindings(insp.branchId);
          setPreviousFindings(Array.isArray(findings) ? findings : []);
        } catch {
          setPreviousFindings([]);
        }
      }

      // Sablon kategorileri ve maddelerini ayarla
      if (insp.template?.categories) {
        const cats = insp.template.categories
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            weight: Number(cat.weight) || 1.0,
            items: (cat.items || [])
              .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
              .map((item: any) => ({
                id: item.id,
                question_text: item.questionText,
                item_type: item.itemType,
                max_score: item.maxScore,
                is_critical: item.isCritical,
                photo_required: item.photoRequired,
                help_text: item.helpText,
              })),
          }));
        setCategories(cats);

        // Eger onceden kaydedilmis yanitlar varsa store'a yukle
        if (insp.responses && insp.responses.length > 0) {
          const { updateResponse } = useInspectionStore.getState();
          insp.responses.forEach((r: any) => {
            updateResponse(r.checklistItemId, {
              passed: r.passed,
              score: r.score,
              notes: r.notes,
            });
          });
        }
      }
    } catch (err: any) {
      ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Denetim yüklenemedi.' });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Skor hesaplari
  const categoryScores = useMemo(() => {
    return categories.map((cat) => {
      const result = calculateCategoryScore(cat.id, cat.name, cat.weight, cat.items, responses);
      const answeredCount = cat.items.filter((item: any) => responses.has(item.id)).length;
      return { ...result, answeredCount };
    });
  }, [responses, categories]);

  const overallScore = useMemo(() => calculateOverallScore(categoryScores), [categoryScores]);
  const totalAnswered = categoryScores.reduce((sum, cs) => sum + cs.answeredCount, 0);
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  // Tum sorulari ve foto zorunluluklarini dogrula
  const validate = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    let unansweredCount = 0;
    let missingPhotoCount = 0;

    for (const cat of categories) {
      for (const item of cat.items) {
        const resp = responses.get(item.id);

        // Soru cevaplanmis mi?
        if (!resp) {
          unansweredCount++;
          continue;
        }

        if (item.item_type === 'boolean' && resp.passed === undefined) {
          unansweredCount++;
          continue;
        }

        if (item.item_type === 'score' && (resp.score === undefined || resp.score === null)) {
          unansweredCount++;
          continue;
        }

        // Fotoğraf zorunlu mu?
        if (item.photo_required) {
          const itemPhotos = photos.get(item.id) || [];
          if (itemPhotos.length === 0) {
            missingPhotoCount++;
          }
        }
      }
    }

    if (unansweredCount > 0) {
      errors.push(`${unansweredCount} soru cevaplanmamış.`);
    }
    if (missingPhotoCount > 0) {
      errors.push(`${missingPhotoCount} maddede zorunlu fotoğraf eksik.`);
    }

    return { valid: errors.length === 0, errors };
  };

  // Yanitlari backend formatina cevir
  const buildResponsePayload = () => {
    const payload: any[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const resp = responses.get(item.id);
        if (!resp) continue;
        payload.push({
          checklistItemId: item.id,
          passed: resp.passed ?? null,
          score: item.item_type === 'boolean'
            ? (resp.passed ? item.max_score : 0)
            : (resp.score ?? 0),
          notes: resp.notes || null,
          severity: resp.severity || null,
        });
      }
    }
    return payload;
  };

  // Taslak kaydet
  const handleSaveDraft = () => {
    const payload = buildResponsePayload();
    if (payload.length === 0) {
      ToastMessage.show({ type: 'info', text1: 'Uyari', text2: 'Henüz hiçbir soru cevaplanmamış. En az bir soruyu cevaplayın.' });
      return;
    }

    setSavingDraft(true);
    api.saveResponses(id!, payload)
      .then(() => {
        haptic.success();
        ToastMessage.show({ type: 'success', text1: 'Kaydedildi', text2: 'Denetim taslak olarak kaydedildi.' });
      })
      .catch((err: any) => {
        haptic.error();
        ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Taslak kaydedilemedi.' });
      })
      .finally(() => {
        setSavingDraft(false);
      });
  };

  // Gonder
  const handleSubmit = () => {
    // Tarih kontrolu - suresi gecmis denetim gonderilemez
    if (inspection?.scheduledDate) {
      const scheduled = new Date(inspection.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > scheduled) {
        Alert.alert('Süresi Geçmiş', 'Bu denetimin tarihi geçmiştir. Denetim tamamlanamaz.');
        return;
      }
    }

    const { valid, errors } = validate();

    if (!valid) {
      Alert.alert(
        'Eksik Maddeler',
        errors.join('\n') + '\n\nTüm soruları cevaplayın ve zorunlu fotoğrafları ekleyin.',
      );
      return;
    }

    Alert.alert(
      'Denetimi Gönder',
      'Denetimi tamamlayıp göndermek istediğinize emin misiniz? Gönderdikten sonra değişiklik yapamazsınız.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: () => {
            setSubmitting(true);
            const payload = buildResponsePayload();

            api.saveResponses(id!, payload)
              .then(async () => {
                // Fotoğrafları yükle
                let failedPhotoCount = 0;
                for (const [, itemPhotos] of photos.entries()) {
                  for (const photo of itemPhotos) {
                    try {
                      await api.uploadPhoto(id!, photo.uri, undefined);
                    } catch {
                      failedPhotoCount++;
                    }
                  }
                }

                // Yuklenemeyen foto varsa kullaniciyi bildir
                if (failedPhotoCount > 0) {
                  ToastMessage.show({ type: 'error', text1: 'Hata', text2: `${failedPhotoCount} fotoğraf yüklenemedi. Lütfen tekrar deneyin.` });
                }

                // Denetimi tamamla
                return api.completeInspection(id!);
              })
              .then(() => {
                resetInspection();
                haptic.success();
                ToastMessage.show({ type: 'success', text1: 'Denetim Gönderildi', text2: 'Denetim başarıyla gönderildi. Şube sorumlusu bilgilendirildi.' });
                setTimeout(() => router.replace('/(tabs)'), 1500);
              })
              .catch((err: any) => {
                haptic.error();
                ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Denetim gönderilemedi.' });
              })
              .finally(() => {
                setSubmitting(false);
              });
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ color: '#999', marginTop: 12 }}>Denetim formu yükleniyor...</Text>
      </View>
    );
  }

  if (!inspection || categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#999', fontSize: 16 }}>Denetim formu bulunamadı</Text>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.branchName}>{inspection.branch?.name || branchName}</Text>
          <Text style={styles.templateName}>{inspection.template?.name || templateName}</Text>
        </View>
        <ScoreIndicator percentage={overallScore} size="sm" showLabel={false} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0}%` }]} />
      </View>
      <Text style={styles.progressText}>{totalAnswered}/{totalItems} madde tamamlandı</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Önceki denetim bulgulari */}
        {previousFindings.length > 0 && (
          <View style={styles.findingsBanner}>
            <View style={styles.findingsHeader}>
              <MaterialIcons name="warning" size={20} color="#E65100" />
              <Text style={styles.findingsHeaderText}>
                Önceki denetimden {previousFindings.length} kritik bulgu var
              </Text>
            </View>
            <TouchableOpacity
              style={styles.findingsToggle}
              onPress={() => setFindingsExpanded(!findingsExpanded)}
            >
              <Text style={styles.findingsToggleText}>
                {findingsExpanded ? 'Gizle' : 'Bulguları Göster'}
              </Text>
              <MaterialIcons
                name={findingsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color="#E65100"
              />
            </TouchableOpacity>
            {findingsExpanded && previousFindings.map((finding: any, idx: number) => (
              <View key={idx} style={styles.findingItem}>
                <MaterialIcons name="error" size={16} color="#F44336" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.findingQuestion}>{finding.questionText}</Text>
                  {finding.notes && (
                    <Text style={styles.findingNotes}>Not: {finding.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {categories.map((category, idx) => (
          <CategorySection
            key={category.id}
            category={category}
            scorePercentage={categoryScores[idx]?.percentage || 0}
            answeredCount={categoryScores[idx]?.answeredCount || 0}
          />
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title={savingDraft ? 'Kaydediliyor...' : 'Taslak Kaydet'}
          variant="outline"
          onPress={handleSaveDraft}
          disabled={savingDraft || submitting}
          style={{ flex: 1 }}
        />
        <Button
          title={submitting ? 'Gönderiliyor...' : 'Gönder'}
          variant="primary"
          onPress={handleSubmit}
          disabled={savingDraft || submitting}
          style={{ flex: 1 }}
        />
      </View>
      <TouchableOpacity
        style={styles.tutanakBtn}
        onPress={() => router.push({ pathname: '/inspection/tutanak', params: { inspectionId: id } })}
      >
        <MaterialIcons name="description" size={18} color="#2E7D32" />
        <Text style={styles.tutanakBtnText}>Tutanak</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerInfo: { flex: 1 },
  branchName: { fontSize: 17, fontWeight: '600', color: Colors.text },
  templateName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  progressBar: {
    height: 4, backgroundColor: Colors.border, marginHorizontal: 16, marginTop: 8, borderRadius: 2,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  progressText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 100 },
  findingsBanner: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2', borderRadius: 12, padding: 14, marginBottom: 12 },
  findingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  findingsHeaderText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#E65100' },
  findingsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, paddingVertical: 6 },
  findingsToggleText: { fontSize: 13, fontWeight: '600', color: '#E65100' },
  findingItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FFE0B2' },
  findingQuestion: { fontSize: 13, color: '#333', fontWeight: '500', lineHeight: 18 },
  findingNotes: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 2 },
  bottomBar: {
    flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 8,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  tutanakBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, paddingVertical: 10, paddingBottom: 16,
    borderTopWidth: 0,
  },
  tutanakBtnText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
});
