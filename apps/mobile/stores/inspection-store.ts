import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';

const PERSISTENCE_FILENAME = 'inspection-store.json';

interface ResponseData {
  score?: number;
  passed?: boolean;
  notes?: string;
  severity?: string;
}

interface PhotoData {
  id: string;
  uri: string;
  latitude?: number;
  longitude?: number;
}

interface SerializedState {
  inspectionId: string | null;
  branchId: string | null;
  templateId: string | null;
  branchName: string;
  templateName: string;
  responses: [string, ResponseData][];
  photos: [string, PhotoData[]][];
  latitude: number | null;
  longitude: number | null;
  locationVerified: boolean;
  startedAt: string | null;
}

interface InspectionState {
  inspectionId: string | null;
  branchId: string | null;
  templateId: string | null;
  branchName: string;
  templateName: string;
  responses: Map<string, ResponseData>;
  photos: Map<string, PhotoData[]>;
  latitude: number | null;
  longitude: number | null;
  locationVerified: boolean;
  startedAt: string | null;

  startInspection: (params: {
    inspectionId: string;
    branchId: string;
    templateId: string;
    branchName: string;
    templateName: string;
    latitude?: number;
    longitude?: number;
    locationVerified?: boolean;
  }) => void;
  updateResponse: (itemId: string, data: ResponseData) => void;
  addPhoto: (itemId: string, photo: PhotoData) => void;
  removePhoto: (itemId: string, photoId: string) => void;
  getResponse: (itemId: string) => ResponseData | undefined;
  getPhotos: (itemId: string) => PhotoData[];
  resetInspection: () => void;
  loadFromStorage: () => Promise<void>;
}

function getStorageFile(): File {
  return new File(Paths.document, PERSISTENCE_FILENAME);
}

// Persist helpers
function saveToStorage(state: InspectionState) {
  try {
    const serialized: SerializedState = {
      inspectionId: state.inspectionId,
      branchId: state.branchId,
      templateId: state.templateId,
      branchName: state.branchName,
      templateName: state.templateName,
      responses: Array.from(state.responses.entries()),
      photos: Array.from(state.photos.entries()),
      latitude: state.latitude,
      longitude: state.longitude,
      locationVerified: state.locationVerified,
      startedAt: state.startedAt,
    };
    const file = getStorageFile();
    file.write(JSON.stringify(serialized));
  } catch {
    // Storage yazma hatasi -- sessizce devam et
  }
}

function clearStorage() {
  try {
    const file = getStorageFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Dosya silme hatasi -- sessizce devam et
  }
}

async function loadFromStorageFile(): Promise<Partial<InspectionState> | null> {
  try {
    const file = getStorageFile();
    if (!file.exists) return null;

    const raw = await file.text();
    const data: SerializedState = JSON.parse(raw);

    // Aktif bir inspection yoksa yukleme
    if (!data.inspectionId) return null;

    return {
      inspectionId: data.inspectionId,
      branchId: data.branchId,
      templateId: data.templateId,
      branchName: data.branchName,
      templateName: data.templateName,
      responses: new Map(data.responses || []),
      photos: new Map(data.photos || []),
      latitude: data.latitude,
      longitude: data.longitude,
      locationVerified: data.locationVerified,
      startedAt: data.startedAt,
    };
  } catch {
    return null;
  }
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  inspectionId: null,
  branchId: null,
  templateId: null,
  branchName: '',
  templateName: '',
  responses: new Map(),
  photos: new Map(),
  latitude: null,
  longitude: null,
  locationVerified: false,
  startedAt: null,

  startInspection: (params) => {
    const newState = {
      inspectionId: params.inspectionId,
      branchId: params.branchId,
      templateId: params.templateId,
      branchName: params.branchName,
      templateName: params.templateName,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      locationVerified: params.locationVerified ?? false,
      responses: new Map(),
      photos: new Map(),
      startedAt: new Date().toISOString(),
    };
    set(newState);
    saveToStorage({ ...get(), ...newState } as InspectionState);
  },

  updateResponse: (itemId, data) => {
    const responses = new Map(get().responses);
    const existing = responses.get(itemId) || {};
    responses.set(itemId, { ...existing, ...data });
    set({ responses });
    saveToStorage(get());
  },

  addPhoto: (itemId, photo) => {
    const photos = new Map(get().photos);
    const existing = photos.get(itemId) || [];
    photos.set(itemId, [...existing, photo]);
    set({ photos });
    saveToStorage(get());
  },

  removePhoto: (itemId, photoId) => {
    const photos = new Map(get().photos);
    const existing = photos.get(itemId) || [];
    photos.set(itemId, existing.filter((p) => p.id !== photoId));
    set({ photos });
    saveToStorage(get());
  },

  getResponse: (itemId) => get().responses.get(itemId),

  getPhotos: (itemId) => get().photos.get(itemId) || [],

  resetInspection: () => {
    set({
      inspectionId: null,
      branchId: null,
      templateId: null,
      branchName: '',
      templateName: '',
      responses: new Map(),
      photos: new Map(),
      latitude: null,
      longitude: null,
      locationVerified: false,
      startedAt: null,
    });
    clearStorage();
  },

  loadFromStorage: async () => {
    const saved = await loadFromStorageFile();
    if (saved) {
      set(saved);
    }
  },
}));

// Uygulama basladiginda storage'dan yukle
useInspectionStore.getState().loadFromStorage();
