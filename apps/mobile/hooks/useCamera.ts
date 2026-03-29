import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Config } from '@/constants/config';

export function useCamera() {
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: Config.PHOTO_QUALITY,
      allowsEditing: false,
      exif: true,
    });

    if (result.canceled || !result.assets[0]) return null;

    return {
      uri: result.assets[0].uri,
      width: result.assets[0].width,
      height: result.assets[0].height,
      exif: result.assets[0].exif,
    };
  }, []);

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: Config.PHOTO_QUALITY,
      allowsEditing: false,
      exif: true,
    });

    if (result.canceled || !result.assets[0]) return null;

    return {
      uri: result.assets[0].uri,
      width: result.assets[0].width,
      height: result.assets[0].height,
      exif: result.assets[0].exif,
    };
  }, []);

  return { takePhoto, pickFromGallery };
}
