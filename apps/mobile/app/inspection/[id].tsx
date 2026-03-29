import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { CategorySection } from '@/components/inspection/CategorySection';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { useInspectionStore } from '@/stores/inspection-store';
import { useAuthStore } from '@/stores/auth-store';
import { calculateCategoryScore, calculateOverallScore } from '@/lib/scoring';
import { api } from '@/lib/api';

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

  // Denetim ve sablon verilerini API'den cek
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await api.getInspection(id);
      setInspection(insp);

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
      Alert.alert('Hata', err.message || 'Denetim yuklenemedi.');
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

        // Fotograf zorunlu mu?
        if (item.photo_required) {
          const itemPhotos = photos.get(item.id) || [];
          if (itemPhotos.length === 0) {
            missingPhotoCount++;
          }
        }
      }
    }

    if (unansweredCount > 0) {
      errors.push(`${unansweredCount} soru cevaplanmamis.`);
    }
    if (missingPhotoCount > 0) {
      errors.push(`${missingPhotoCount} maddede zorunlu fotograf eksik.`);
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
      Alert.alert('Uyari', 'Henuz hicbir soru cevaplanmamis. En az bir soruyu cevaplayin.');
      return;
    }

    setSavingDraft(true);
    api.saveResponses(id!, payload)
      .then(() => {
        Alert.alert('Kaydedildi', 'Denetim taslak olarak kaydedildi. Daha sonra devam edebilirsiniz.', [
          { text: 'Devam Et' },
          { text: 'Çıkış', onPress: () => router.back() },
        ]);
      })
      .catch((err: any) => {
        Alert.alert('Hata', err.message || 'Taslak kaydedilemedi.');
      })
      .finally(() => {
        setSavingDraft(false);
      });
  };

  // Gönder
  const handleSubmit = () => {
    // Tarih kontrolu - suresi gecmis denetim gonderilemez
    if (inspection?.scheduledDate) {
      const scheduled = new Date(inspection.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > scheduled) {
        Alert.alert('Süresi Geçmiş', 'Bu denetimin tarihi gecmistir. Denetim tamamlanamaz.');
        return;
      }
    }

    const { valid, errors } = validate();

    if (!valid) {
      Alert.alert(
        'Eksik Maddeler',
        errors.join('\n') + '\n\nTum sorulari cevaplayin ve zorunlu fotograflari ekleyin.',
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
                // Fotoğraflari yukle
                for (const [, itemPhotos] of photos.entries()) {
                  for (const photo of itemPhotos) {
                    try {
                      await api.uploadPhoto(id!, photo.uri, undefined);
                    } catch {
                      // Foto yuklenemezse devam et
                    }
                  }
                }

                // Denetimi tamamla
                return api.completeInspection(id!);
              })
              .then(() => {
                resetInspection();
                Alert.alert(
                  'Denetim Gönderildi',
                  'Denetim başarıyla gönderildi. Şube sorumlusu bilgilendirildi.',
                  [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }],
                );
              })
              .catch((err: any) => {
                Alert.alert('Hata', err.message || 'Denetim gonderilemedi.');
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
        <Text style={{ color: '#999', marginTop: 12 }}>Denetim formu yukleniyor...</Text>
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
      <Text style={styles.progressText}>{totalAnswered}/{totalItems} madde tamamlandi</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
  bottomBar: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
