import apiClient from './client';
import { PrivateProfile, ProfileCreateData, ProfileUpdateData } from '../types';

export const createProfile = async (data: ProfileCreateData): Promise<PrivateProfile> => {
  const response = await apiClient.post('/api/profiles', data);
  return response.data;
};

export const getMyProfile = async (): Promise<PrivateProfile> => {
  const response = await apiClient.get('/api/profiles/me');
  return response.data;
};

export const updateProfile = async (data: ProfileUpdateData): Promise<PrivateProfile> => {
  const response = await apiClient.patch('/api/profiles/me', data);
  return response.data;
};

export const uploadPhoto = async (uri: string, existingUrls: string[] = []): Promise<{ url: string }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  // Pass existing photo URLs so backend can cross-check same person
  if (existingUrls.length > 0) {
    formData.append('existing_urls', existingUrls.join(','));
  }

  const response = await apiClient.post('/api/profiles/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // AI verification can take time
  });
  return response.data;
};

export const selfieVerify = async (
  uri: string,
  isVideo: boolean = false,
  photoUrls: string[] = [],
): Promise<{ message: string; selfie_url: string; status: string; verification?: any }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || (isVideo ? 'selfie.mp4' : 'selfie.jpg');
  const ext = filename.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');

  let mimeType: string;
  if (isVideo) {
    mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  } else {
    mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  }

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  if (photoUrls.length > 0) {
    formData.append('photo_urls', photoUrls.join(','));
  }

  const response = await apiClient.post('/api/profiles/selfie-verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60s timeout for video processing + AI verification
  });
  return response.data;
};
