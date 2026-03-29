import { create } from 'zustand';

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
    set({
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
    });
  },

  updateResponse: (itemId, data) => {
    const responses = new Map(get().responses);
    const existing = responses.get(itemId) || {};
    responses.set(itemId, { ...existing, ...data });
    set({ responses });
  },

  addPhoto: (itemId, photo) => {
    const photos = new Map(get().photos);
    const existing = photos.get(itemId) || [];
    photos.set(itemId, [...existing, photo]);
    set({ photos });
  },

  removePhoto: (itemId, photoId) => {
    const photos = new Map(get().photos);
    const existing = photos.get(itemId) || [];
    photos.set(itemId, existing.filter((p) => p.id !== photoId));
    set({ photos });
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
  },
}));
