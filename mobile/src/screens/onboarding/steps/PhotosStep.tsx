/**
 * PhotosStep — Photo upload + selfie verification in conversational style.
 * Preserves all existing upload/verify business logic from ProfileSetupScreen.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
  Alert, ActionSheetIOS, Platform, Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhoto, selfieVerify, verifyPhotosBatch } from '../../../api/profiles';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 80) / 3;

interface PhotoSlot { localUri: string; serverUrl: string; }

interface PhotosStepProps {
  photos: (PhotoSlot | null)[];
  setPhotos: (photos: (PhotoSlot | null)[]) => void;
  selfieUri: string | null;
  setSelfieUri: (uri: string | null) => void;
  selfieStatus: 'none' | 'verifying' | 'verified' | 'failed';
  setSelfieStatus: (status: 'none' | 'verifying' | 'verified' | 'failed') => void;
  selfieMessage: string;
  setSelfieMessage: (msg: string) => void;
  selfieServerUrl: string | null;
  setSelfieServerUrl: (url: string | null) => void;
  uploadingSlots: Record<number, boolean>;
  setUploadingSlots: (slots: Record<number, boolean>) => void;
  onPhotoAdded?: (count: number) => void;
  onSelfieVerified?: () => void;
}

export default function PhotosStep({
  photos, setPhotos,
  selfieUri, setSelfieUri,
  selfieStatus, setSelfieStatus,
  selfieMessage, setSelfieMessage,
  selfieServerUrl, setSelfieServerUrl,
  uploadingSlots, setUploadingSlots,
  onPhotoAdded, onSelfieVerified,
}: PhotosStepProps) {
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState('');
  const photoCount = photos.filter(p => p !== null).length;

  const pickImage = async (index: number, source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access needed.'); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access needed.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
      }
      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        setPhotos(photos.map((p, i) => i === index ? { localUri, serverUrl: '' } : p));
        setUploadingSlots({ ...uploadingSlots, [index]: true });
        sounds.pop();

        const existingUrls = photos
          .filter((p, idx) => p !== null && p.serverUrl !== '' && idx !== index)
          .map(p => p!.serverUrl);
        if (selfieServerUrl) existingUrls.push(selfieServerUrl);

        uploadPhoto(localUri, existingUrls)
          .then(response => {
            const updated = [...photos];
            updated[index] = { localUri, serverUrl: response.url };
            setPhotos(updated);
            const count = updated.filter(p => p !== null && p.serverUrl !== '').length;
            onPhotoAdded?.(count);
            sounds.chime();
          })
          .catch((e: any) => {
            const updated = [...photos];
            updated[index] = null;
            setPhotos(updated);
            let detail = e?.response?.data?.detail;
            if (typeof detail !== 'string') detail = `Upload failed: ${e?.message || 'Unknown error'}`;
            Alert.alert('Photo Rejected', detail);
            sounds.error();
          })
          .finally(() => {
            const s = { ...uploadingSlots };
            delete s[index];
            setUploadingSlots(s);
          });
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not access camera.');
    }
  };

  const showPhotoOptions = (index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Photos', 'Cancel'], cancelButtonIndex: 2 },
        (i) => { if (i === 0) pickImage(index, 'camera'); else if (i === 1) pickImage(index, 'gallery'); },
      );
    } else {
      Alert.alert('Add Photo', '', [
        { text: 'Take Photo', onPress: () => pickImage(index, 'camera') },
        { text: 'Choose from Photos', onPress: () => pickImage(index, 'gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSelfiePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera needed for selfie.'); return; }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], cameraType: ImagePicker.CameraType.front,
        allowsEditing: false, quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setSelfieUri(result.assets[0].uri);
        setSelfieStatus('verifying');
        setSelfieMessage('Verifying your identity...');
        try {
          const existingUrls = photos.filter(p => p !== null && p.serverUrl !== '').map(p => p!.serverUrl);
          const response = await selfieVerify(result.assets[0].uri, false, existingUrls);
          if (response.status === 'verified') {
            setSelfieStatus('verified');
            setSelfieMessage('Identity verified!');
            setSelfieServerUrl(response.selfie_url || null);
            onSelfieVerified?.();
            sounds.success();
          } else {
            setSelfieStatus('failed');
            setSelfieMessage(response.message || "Selfie doesn't match your photos.");
            sounds.error();
          }
        } catch (e: any) {
          setSelfieStatus('failed');
          setSelfieMessage(e?.response?.data?.detail || 'Verification failed. Try again.');
          sounds.error();
        }
      }
    } catch { setSelfieStatus('failed'); setSelfieMessage('Could not access camera.'); }
  };

  return (
    <View style={styles.container}>
      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {photos.map((p, i) => {
          const isUploading = uploadingSlots[i] || false;
          return (
            <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()}>
              <TouchableOpacity
                style={styles.photoSlot}
                onPress={() => {
                  if (isUploading) return;
                  if (p && p.serverUrl !== '') {
                    setPhotos(photos.map((ph, idx) => idx === i ? null : ph));
                  } else if (!p) showPhotoOptions(i);
                }}
                disabled={isUploading}
              >
                {p ? (
                  <View style={styles.photoFull}>
                    <Image source={{ uri: p.localUri }} style={styles.photoImg} />
                    {p.serverUrl === '' && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.uploadingText}>Scanning...</Text>
                      </View>
                    )}
                    {p.serverUrl !== '' && (
                      <TouchableOpacity style={styles.removeBtn}
                        onPress={() => setPhotos(photos.map((ph, idx) => idx === i ? null : ph))}>
                        <Text style={styles.removeTxt}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.plusIcon}>+</Text>
                    {i < 3 && <Text style={styles.reqLabel}>Required</Text>}
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Selfie section */}
      {photoCount >= 3 && (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.selfieSection}>
          {selfieStatus === 'none' && (
            <TouchableOpacity style={styles.selfieBtn} onPress={handleSelfiePhoto}>
              <Text style={styles.selfieBtnText}>📸 Take Selfie to Verify</Text>
            </TouchableOpacity>
          )}
          {selfieStatus === 'verifying' && (
            <View style={styles.verifyingRow}>
              {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumb} />}
              <View style={styles.verifyingContent}>
                <ActivityIndicator size="small" color={colors.yuniAiPrimary} />
                <Text style={styles.verifyingText}>{selfieMessage}</Text>
              </View>
            </View>
          )}
          {selfieStatus === 'verified' && (
            <View style={styles.verifiedRow}>
              {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumb} />}
              <View style={styles.verifiedContent}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>Identity verified!</Text>
              </View>
            </View>
          )}
          {selfieStatus === 'failed' && (
            <View style={styles.failedContainer}>
              <Text style={styles.failedText}>{selfieMessage}</Text>
              <TouchableOpacity style={styles.retryBtn}
                onPress={() => { setSelfieStatus('none'); setSelfieUri(null); }}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  photoSlot: {
    width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25,
    borderRadius: radii.md, overflow: 'hidden',
  },
  photoFull: { flex: 1 },
  photoImg: { width: '100%', height: '100%', borderRadius: radii.md },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36,28,26,0.5)',
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadingText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 11,
    color: '#fff', marginTop: 4,
  },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(36,28,26,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  removeTxt: { color: '#fff', fontSize: 12, fontFamily: fontFamilies.inter.bold },
  emptySlot: {
    flex: 1, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceSelected,
  },
  plusIcon: {
    fontSize: 28, color: colors.primary,
    fontFamily: fontFamilies.inter.regular,
  },
  reqLabel: {
    fontFamily: fontFamilies.inter.medium, fontSize: 10,
    color: colors.gray, marginTop: 2,
  },
  selfieSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.yuniAiBubble,
    borderRadius: radii.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.yuniAiBorder,
  },
  selfieBtn: {
    backgroundColor: colors.yuniAiPrimary,
    paddingVertical: 14, borderRadius: radii.md,
    alignItems: 'center',
  },
  selfieBtnText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 15,
    color: '#FFFFFF',
  },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selfieThumb: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.yuniAiBorder },
  verifyingContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verifyingText: { fontFamily: fontFamilies.inter.semiBold, fontSize: 14, color: colors.yuniAiPrimary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  verifiedContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verifiedIcon: { fontSize: 20, color: colors.success },
  verifiedText: { fontFamily: fontFamilies.inter.bold, fontSize: 15, color: colors.success },
  failedContainer: { alignItems: 'center', gap: spacing.md },
  failedText: { fontFamily: fontFamilies.inter.regular, fontSize: 14, color: colors.error, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.yuniAiPrimary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: radii.sm },
  retryBtnText: { fontFamily: fontFamilies.inter.semiBold, fontSize: 14, color: '#fff' },
});
