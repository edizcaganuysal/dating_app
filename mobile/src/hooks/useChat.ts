import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { getChatMessages } from '../api/chat';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://100.70.69.69:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export default function useChat(roomId: string, token: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!roomId || !token) return;

    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/chat/${roomId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        const msg: ChatMessage = {
          id: data.id,
          sender_id: data.sender_id,
          sender_name: data.sender_name,
          content: data.content,
          message_type: data.message_type || 'text',
          created_at: data.created_at,
        };
        setMessages((prev) => [...prev, msg]);
      } else if (data.type === 'typing') {
        setTypingUser(data.user_name);
        setTimeout(() => setTypingUser(null), 3000);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomId, token]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    }
  }, []);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const loadHistory = useCallback(async (before?: string) => {
    const older = await getChatMessages(roomId, 50, before);
    setMessages((prev) => [...older, ...prev]);
    return older;
  }, [roomId]);

  return { messages, isConnected, sendMessage, sendTyping, loadHistory, typingUser };
}
