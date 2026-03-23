import { useState, useEffect, useCallback, useRef } from 'react';
import { getChatRooms } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_KEY = 'chat_last_seen';

/**
 * Returns the count of chat rooms with messages newer than last seen.
 * Polls every 30 seconds when user is authenticated.
 */
export default function useUnreadCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const lastSeenRef = useRef<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then(val => {
      if (val) lastSeenRef.current = JSON.parse(val);
    }).catch(() => {});
  }, []);

  const check = useCallback(async () => {
    if (!user) { setCount(0); return; }
    try {
      const rooms = await getChatRooms();
      let unread = 0;
      for (const room of rooms) {
        if (!room.last_message) continue;
        const lastSeen = lastSeenRef.current[room.id];
        if (!lastSeen || new Date(room.last_message.created_at) > new Date(lastSeen)) {
          unread++;
        }
      }
      setCount(unread);
    } catch {
      // Silent fail — badge just won't show
    }
  }, [user]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return count;
}

/** Call when user opens a chat room to mark it as read */
export async function markRoomRead(roomId: string) {
  try {
    const val = await AsyncStorage.getItem(LAST_SEEN_KEY);
    const data = val ? JSON.parse(val) : {};
    data[roomId] = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(data));
  } catch {}
}
