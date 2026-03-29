import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Storage } from 'expo-sqlite/kv-store';

const GREEN = '#2E7D32';
const LIGHT_GREEN = '#4CAF50';
const BG = '#F5F5F5';
const WHITE = '#FFFFFF';
const TEXT_COLOR = '#212121';
const TEXT2 = '#757575';
const BORDER = '#E0E0E0';

const STORAGE_KEY = 'settings_preferences';

interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  criticalAlerts: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  emailNotifications: true,
  pushNotifications: true,
  criticalAlerts: true,
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = Storage.getItemSync(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
    setLoading(false);
  };

  const updateSetting = useCallback(
    (key: keyof Settings, value: boolean) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      try {
        Storage.setItemSync(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Silently fail
      }
    },
    [settings],
  );

  const handleClearCache = () => {
    Alert.alert(
      'Cache Temizle',
      'Uygulama onbellegi temizlenecek. Devam etmek istiyor musunuz?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            try {
              Storage.clearSync();
              // Restore settings after clearing everything
              Storage.setItemSync(STORAGE_KEY, JSON.stringify(settings));
              Alert.alert('Başarılı', 'Önbellek temizlendi.');
            } catch {
              Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bildirim Tercihleri */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bildirim Tercihleri</Text>

        <View style={styles.row}>
          <MaterialIcons name="email" size={22} color={TEXT2} />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>E-posta bildirimleri</Text>
            <Text style={styles.rowSubtext}>Denetim sonuclarini e-posta ile alin</Text>
          </View>
          <Switch
            value={settings.emailNotifications}
            onValueChange={(v) => updateSetting('emailNotifications', v)}
            trackColor={{ false: BORDER, true: LIGHT_GREEN }}
            thumbColor={settings.emailNotifications ? GREEN : '#F4F4F4'}
          />
        </View>

        <View style={styles.row}>
          <MaterialIcons name="notifications-active" size={22} color={TEXT2} />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>Push bildirimleri</Text>
            <Text style={styles.rowSubtext}>Anlik bildirimler alin</Text>
          </View>
          <Switch
            value={settings.pushNotifications}
            onValueChange={(v) => updateSetting('pushNotifications', v)}
            trackColor={{ false: BORDER, true: LIGHT_GREEN }}
            thumbColor={settings.pushNotifications ? GREEN : '#F4F4F4'}
          />
        </View>

        <View style={styles.row}>
          <MaterialIcons name="warning" size={22} color={TEXT2} />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>Kritik bulgu uyarilari</Text>
            <Text style={styles.rowSubtext}>Kritik bulgular icin aninda uyari alin</Text>
          </View>
          <Switch
            value={settings.criticalAlerts}
            onValueChange={(v) => updateSetting('criticalAlerts', v)}
            trackColor={{ false: BORDER, true: LIGHT_GREEN }}
            thumbColor={settings.criticalAlerts ? GREEN : '#F4F4F4'}
          />
        </View>
      </View>

      {/* Uygulama Ayarlari */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Uygulama Ayarlari</Text>

        <View style={styles.row}>
          <MaterialIcons name="info-outline" size={22} color={TEXT2} />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>Uygulama versiyonu</Text>
            <Text style={styles.rowSubtext}>1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.row} onPress={handleClearCache}>
          <MaterialIcons name="delete-outline" size={22} color={TEXT2} />
          <View style={styles.rowContent}>
            <Text style={styles.rowText}>Cache temizle</Text>
            <Text style={styles.rowSubtext}>Uygulama onbellegini temizleyin</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={BORDER} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowText: {
    fontSize: 15,
    color: TEXT_COLOR,
  },
  rowSubtext: {
    fontSize: 12,
    color: TEXT2,
    marginTop: 2,
  },
});
