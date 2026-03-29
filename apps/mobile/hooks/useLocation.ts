import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Config } from '@/constants/config';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  distance: number | null;
  isWithinGeofence: boolean | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
    distance: null,
    isWithinGeofence: null,
  });

  const getCurrentLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((prev) => ({ ...prev, loading: false, error: 'Konum izni verilmedi' }));
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setState((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        loading: false,
      }));

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
      return null;
    }
  }, []);

  const checkGeofence = useCallback(
    async (branchLat: number, branchLon: number, radius?: number) => {
      const location = await getCurrentLocation();
      if (!location) return false;

      const r = radius ?? Config.GEOFENCE_RADIUS_METERS;
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        branchLat,
        branchLon
      );
      const withinGeofence = distance <= r;

      setState((prev) => ({
        ...prev,
        distance,
        isWithinGeofence: withinGeofence,
      }));

      return withinGeofence;
    },
    [getCurrentLocation]
  );

  return { ...state, getCurrentLocation, checkGeofence };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
