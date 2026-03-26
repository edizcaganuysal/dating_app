import apiClient from './client';
import { FeedbackCreateData, FeedbackResponse, SoftMatch, SoftMatchRespondResult } from '../types';

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

export const getPendingSoftMatches = async (): Promise<SoftMatch[]> => {
  const response = await apiClient.get('/api/feedback/soft-matches/pending');
  return response.data;
};

export const respondToSoftMatch = async (
  softMatchId: string,
  accepted: boolean,
): Promise<SoftMatchRespondResult> => {
  const response = await apiClient.post(
    `/api/feedback/soft-matches/${softMatchId}/respond`,
    { accepted },
  );
  return response.data;
};
