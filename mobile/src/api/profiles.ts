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

export const uploadPhoto = async (uri: string): Promise<{ url: string }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await apiClient.post('/api/profiles/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const selfieVerify = async (uri: string): Promise<{ message: string; selfie_url: string }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'selfie.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await apiClient.post('/api/profiles/selfie-verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
