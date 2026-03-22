import apiClient from './client';

export interface Friend {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  program?: string;
  photo_urls: string[];
}

export interface PendingRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend_name: string;
}

export interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  program?: string;
}

export const getFriends = async (): Promise<Friend[]> => {
  const res = await apiClient.get('/api/friends');
  return res.data;
};

export const sendFriendRequest = async (friendId: string) => {
  const res = await apiClient.post('/api/friends/request', { friend_id: friendId });
  return res.data;
};

export const acceptFriendRequest = async (friendshipId: string) => {
  const res = await apiClient.post(`/api/friends/accept/${friendshipId}`);
  return res.data;
};

export const rejectFriendRequest = async (friendshipId: string) => {
  const res = await apiClient.post(`/api/friends/reject/${friendshipId}`);
  return res.data;
};

export const getPendingRequests = async (): Promise<PendingRequest[]> => {
  const res = await apiClient.get('/api/friends/pending');
  return res.data;
};

export const addFriendByCode = async (code: string) => {
  const res = await apiClient.post('/api/friends/code', { code });
  return res.data;
};

export const getMyFriendCode = async (): Promise<{ code: string }> => {
  const res = await apiClient.get('/api/friends/my-code');
  return res.data;
};

export const removeFriend = async (friendshipId: string) => {
  const res = await apiClient.delete(`/api/friends/${friendshipId}`);
  return res.data;
};

export const searchUsers = async (query: string): Promise<SearchResult[]> => {
  const res = await apiClient.get(`/api/friends/search?q=${encodeURIComponent(query)}`);
  return res.data;
};
