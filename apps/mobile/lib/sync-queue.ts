import { supabase } from './supabase';
import { getPendingInspections, getPendingPhotos, markPhotoUploaded, deletePendingInspection } from './offline-db';
import * as FileSystem from 'expo-file-system';

export interface SyncStatus {
  issyncing: boolean;
  pendingInspections: number;
  pendingPhotos: number;
  lastSyncAt: string | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  issyncing: false,
  pendingInspections: 0,
  pendingPhotos: 0,
  lastSyncAt: null,
  error: null,
};

let listeners: Array<(status: SyncStatus) => void> = [];

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...syncStatus }));
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

export async function processQueue(): Promise<void> {
  if (syncStatus.issyncing) return;

  syncStatus.issyncing = true;
  syncStatus.error = null;
  notifyListeners();

  try {
    // 1. Sync inspections
    const pendingInspections = (await getPendingInspections()) as any[];
    syncStatus.pendingInspections = pendingInspections.length;
    notifyListeners();

    for (const inspection of pendingInspections) {
      try {
        const { error } = await supabase.from('inspections').upsert({
          id: inspection.id,
          branch_id: inspection.branch_id,
          template_id: inspection.template_id,
          inspector_id: inspection.inspector_id,
          status: inspection.status || 'completed',
          latitude: inspection.latitude,
          longitude: inspection.longitude,
          location_verified: !!inspection.location_verified,
          started_at: inspection.started_at,
          synced_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Sync responses for this inspection
        // (responses are embedded in inspection data in offline mode)
        if (inspection.data) {
          const data = JSON.parse(inspection.data);
          if (data.responses) {
            for (const response of data.responses) {
              await supabase.from('inspection_responses').upsert(response);
            }
          }
        }

        await deletePendingInspection(inspection.id);
        syncStatus.pendingInspections--;
        notifyListeners();
      } catch (err: any) {
        syncStatus.error = `Denetim senkronizasyon hatasi: ${err.message}`;
        notifyListeners();
      }
    }

    // 2. Sync photos
    const pendingPhotos = (await getPendingPhotos()) as any[];
    syncStatus.pendingPhotos = pendingPhotos.length;
    notifyListeners();

    for (const photo of pendingPhotos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.local_uri);
        if (!fileInfo.exists) {
          await markPhotoUploaded(photo.id);
          continue;
        }

        const fileName = `${photo.inspection_id}/${photo.id}.jpg`;
        const fileContent = await FileSystem.readAsStringAsync(photo.local_uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, decode(fileContent), {
            contentType: 'image/jpeg',
          });

        if (error && !error.message.includes('already exists')) throw error;

        // Save photo record
        await supabase.from('inspection_photos').upsert({
          id: photo.id,
          inspection_id: photo.inspection_id,
          response_id: photo.response_id,
          storage_path: fileName,
          latitude: photo.latitude,
          longitude: photo.longitude,
          caption: photo.caption,
        });

        await markPhotoUploaded(photo.id);
        syncStatus.pendingPhotos--;
        notifyListeners();
      } catch (err: any) {
        syncStatus.error = `Fotograf yukleme hatasi: ${err.message}`;
        notifyListeners();
      }
    }

    syncStatus.lastSyncAt = new Date().toISOString();
  } catch (err: any) {
    syncStatus.error = err.message;
  } finally {
    syncStatus.issyncing = false;
    notifyListeners();
  }
}

// Base64 decode helper
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
