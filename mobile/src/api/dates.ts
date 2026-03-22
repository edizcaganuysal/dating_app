import apiClient from './client';
import { DateRequest, DateRequestCreateData, DateGroup, Match } from '../types';

export interface DateTemplate {
  id: string;
  name: string;
  activities: string[];
  group_size: number;
  friend_ids: string[];
  created_at: string;
}

export const createDateRequest = async (data: DateRequestCreateData): Promise<DateRequest> => {
  const response = await apiClient.post('/api/date-requests', data);
  return response.data;
};

export const getMyDateRequests = async (): Promise<DateRequest[]> => {
  const response = await apiClient.get('/api/date-requests');
  return response.data;
};

export const cancelDateRequest = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/date-requests/${id}`);
};

export const getMyGroups = async (): Promise<DateGroup[]> => {
  const response = await apiClient.get('/api/matching/my-groups');
  return response.data;
};

export const getMyMatches = async (): Promise<Match[]> => {
  const response = await apiClient.get('/api/matches');
  return response.data;
};

// Templates
export const getTemplates = async (): Promise<DateTemplate[]> => {
  const response = await apiClient.get('/api/date-requests/templates/list');
  return response.data;
};

export const saveTemplate = async (data: {
  name: string;
  activities: string[];
  group_size: number;
  friend_ids?: string[];
}): Promise<{ id: string; name: string }> => {
  const response = await apiClient.post('/api/date-requests/templates', data);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/date-requests/templates/${id}`);
};
