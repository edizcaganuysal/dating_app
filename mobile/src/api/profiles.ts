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

export const selfieVerify = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/api/profiles/selfie-verify');
  return response.data;
};
