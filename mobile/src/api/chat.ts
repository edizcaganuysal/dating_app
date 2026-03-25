import apiClient from './client';
import { ChatRoom, ChatMessage, GroupDetail, IcebreakersResponse, VenuesResponse } from '../types';

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await apiClient.get('/api/chat/rooms');
  return response.data;
};

export const getChatMessages = async (
  roomId: string,
  limit?: number,
  before?: string,
): Promise<ChatMessage[]> => {
  const params: Record<string, string | number> = {};
  if (limit) params.limit = limit;
  if (before) params.before = before;
  const response = await apiClient.get(`/api/chat/rooms/${roomId}/messages`, { params });
  return response.data;
};

export const getGroupDetail = async (groupId: string): Promise<GroupDetail> => {
  const response = await apiClient.get(`/api/groups/${groupId}`);
  return response.data;
};

export const getIcebreakers = async (groupId: string): Promise<IcebreakersResponse> => {
  const response = await apiClient.get(`/api/groups/${groupId}/icebreakers`);
  return response.data;
};

export const getVenueSuggestions = async (groupId: string): Promise<VenuesResponse> => {
  const response = await apiClient.get(`/api/groups/${groupId}/venues`);
  return response.data;
};

export const askYuniAi = async (roomId: string, question: string): Promise<ChatMessage> => {
  const response = await apiClient.post(`/api/chat/rooms/${roomId}/ask-yuni`, { question });
  return response.data;
};
