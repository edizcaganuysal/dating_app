import apiClient from './client';
import { FeedbackCreateData, FeedbackResponse } from '../types';

export const submitFeedback = async (
  groupId: string,
  data: FeedbackCreateData,
): Promise<FeedbackResponse> => {
  const response = await apiClient.post(`/api/groups/${groupId}/feedback`, data);
  return response.data;
};

export const getMyFeedback = async (groupId: string): Promise<FeedbackResponse> => {
  const response = await apiClient.get(`/api/groups/${groupId}/feedback/mine`);
  return response.data;
};
