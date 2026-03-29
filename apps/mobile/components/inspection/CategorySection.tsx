import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { ChecklistItem } from './ChecklistItem';
import { getScoreColor, formatScore } from '@/lib/scoring';

interface CategorySectionProps {
  category: {
    id: string;
    name: string;
    items: Array<{
      id: string;
      question_text: string;
      item_type: string;
      max_score: number;
      is_critical: boolean;
      photo_required: boolean;
      help_text?: string;
    }>;
  };
  scorePercentage: number;
  answeredCount: number;
}

export function CategorySection({ category, scorePercentage, answeredCount }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const totalItems = category.items.length;
  const scoreColor = getScoreColor(scorePercentage);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
            size={24}
            color={Colors.text}
          />
          <View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.progress}>
              {answeredCount}/{totalItems} tamamlandi
            </Text>
          </View>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            %{formatScore(scorePercentage)}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.items}>
          {category.items.map((item) => (
            <ChecklistItem key={item.id} item={item} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  categoryName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  progress: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  scoreText: { fontSize: 14, fontWeight: '700' },
  items: { borderTopWidth: 1, borderTopColor: Colors.border },
});
