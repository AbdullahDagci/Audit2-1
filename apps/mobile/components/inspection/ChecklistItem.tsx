import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useInspectionStore } from '@/stores/inspection-store';
import { useCamera } from '@/hooks/useCamera';
import { haptic } from '@/lib/haptics';

interface ChecklistItemProps {
  item: {
    id: string;
    question_text: string;
    item_type: string;
    max_score: number;
    is_critical: boolean;
    photo_required: boolean;
    help_text?: string;
  };
}

export function ChecklistItem({ item }: ChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const { updateResponse, getResponse, addPhoto, getPhotos, removePhoto } = useInspectionStore();
  const { takePhoto, pickFromGallery } = useCamera();
  const response = getResponse(item.id);
  const photos = getPhotos(item.id);

  const handleBoolean = (passed: boolean) => {
    haptic.selection();
    if (item.is_critical) haptic.medium();
    updateResponse(item.id, { passed });
  };

  const handleScore = (score: number) => {
    haptic.light();
    if (item.is_critical) haptic.medium();
    updateResponse(item.id, { score: Math.min(score, item.max_score) });
  };

  const handleTakePhoto = async () => {
    const result = await takePhoto();
    if (result) {
      addPhoto(item.id, {
        id: Date.now().toString(),
        uri: result.uri,
      });
    }
  };

  const handlePickPhoto = async () => {
    const result = await pickFromGallery();
    if (result) {
      addPhoto(item.id, {
        id: Date.now().toString(),
        uri: result.uri,
      });
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Fotoğraf Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: handleTakePhoto },
      { text: 'Galeri', onPress: handlePickPhoto },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.questionRow}>
          {item.is_critical && (
            <MaterialIcons name="warning" size={18} color={Colors.secondary} style={styles.criticalIcon} />
          )}
          <Text style={styles.question}>{item.question_text}</Text>
          {item.photo_required && (
            <Text style={styles.required}>*</Text>
          )}
        </View>
      </View>

      {item.item_type === 'boolean' && (
        <View style={styles.booleanRow}>
          <TouchableOpacity
            style={[styles.booleanBtn, response?.passed === true && styles.booleanBtnYes]}
            onPress={() => handleBoolean(true)}
          >
            <MaterialIcons name="check" size={20} color={response?.passed === true ? Colors.white : Colors.success} />
            <Text style={[styles.booleanText, response?.passed === true && styles.booleanTextActive]}>Evet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.booleanBtn, response?.passed === false && styles.booleanBtnNo]}
            onPress={() => handleBoolean(false)}
          >
            <MaterialIcons name="close" size={20} color={response?.passed === false ? Colors.white : Colors.danger} />
            <Text style={[styles.booleanText, response?.passed === false && styles.booleanTextActive]}>Hayır</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.item_type === 'score' && (
        <View style={styles.scoreRow}>
          {Array.from({ length: item.max_score + 1 }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.scoreBtn, (response?.score ?? -1) >= i && styles.scoreBtnActive]}
              onPress={() => handleScore(i)}
            >
              <Text style={[styles.scoreBtnText, (response?.score ?? -1) >= i && styles.scoreBtnTextActive]}>
                {i}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNotes(!showNotes)}>
          <MaterialIcons name="note-add" size={20} color={Colors.textSecondary} />
          <Text style={styles.actionText}>Not</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, item.photo_required && styles.actionBtnRequired]}
          onPress={handleAddPhoto}
        >
          <MaterialIcons
            name="camera-alt"
            size={20}
            color={item.photo_required ? Colors.danger : Colors.textSecondary}
          />
          <Text style={[styles.actionText, item.photo_required && { color: Colors.danger, fontWeight: '600' }]}>
            {item.photo_required ? 'Fotoğraf (Zorunlu)' : 'Fotoğraf'}
          </Text>
          {item.photo_required && <Text style={styles.requiredStar}>*</Text>}
        </TouchableOpacity>
      </View>

      {showNotes && (
        <TextInput
          style={styles.notesInput}
          placeholder="Not ekleyin..."
          placeholderTextColor={Colors.textLight}
          multiline
          value={response?.notes || ''}
          onChangeText={(text) => updateResponse(item.id, { notes: text })}
        />
      )}

      {photos.length > 0 && (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoDelete}
                onPress={() => removePhoto(item.id, photo.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: { marginBottom: 8 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  criticalIcon: { marginRight: 6, marginTop: 2 },
  question: { fontSize: 15, color: Colors.text, flex: 1, lineHeight: 22 },
  required: { color: Colors.danger, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  booleanRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  booleanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, gap: 6,
  },
  booleanBtnYes: { backgroundColor: Colors.success, borderColor: Colors.success },
  booleanBtnNo: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  booleanText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  booleanTextActive: { color: Colors.white },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  scoreBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scoreBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  scoreBtnTextActive: { color: Colors.white },
  actions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionBtnRequired: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  actionText: { fontSize: 13, color: Colors.textSecondary },
  requiredStar: { color: Colors.danger, fontSize: 16, fontWeight: '800', marginLeft: 2 },
  notesInput: {
    marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 10, fontSize: 14, color: Colors.text, minHeight: 60, textAlignVertical: 'top',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoWrapper: { position: 'relative' },
  photoThumb: { width: 70, height: 70, borderRadius: 8 },
  photoDelete: {
    position: 'absolute', top: -8, right: -8, backgroundColor: Colors.danger,
    borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 4,
  },
});
