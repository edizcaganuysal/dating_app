import apiClient from './client';

export const updateLocation = async (latitude: number, longitude: number): Promise<void> => {
  await apiClient.patch('/api/profiles/me/location', { latitude, longitude });
};
