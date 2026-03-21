import { renderHook, act } from '@testing-library/react-native';
import useChat from '../../src/hooks/useChat';

jest.mock('../../src/api/chat', () => ({
  getChatMessages: jest.fn().mockResolvedValue([]),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  static OPEN = 1;
  static CLOSED = 3;
}

(global as any).WebSocket = MockWebSocket;

beforeEach(() => {
  MockWebSocket.instances = [];
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useChat', () => {
  it('connects to WebSocket with room ID and token in URL', () => {
    renderHook(() => useChat('room-123', 'test-token'));
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain('/api/ws/chat/room-123');
    expect(MockWebSocket.instances[0].url).toContain('token=test-token');
  });

  it('sends message with correct JSON format', () => {
    const { result } = renderHook(() => useChat('room-123', 'test-token'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      result.current.sendMessage('Hello!');
    });

    expect(ws.sentMessages.length).toBe(1);
    const sent = JSON.parse(ws.sentMessages[0]);
    expect(sent).toEqual({ type: 'message', content: 'Hello!' });
  });

  it('adds received message to messages state', () => {
    const { result } = renderHook(() => useChat('room-123', 'test-token'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: 'message',
        id: 'msg-1',
        sender_id: 'user-1',
        sender_name: 'Alice',
        content: 'Hi there',
        created_at: '2026-03-21T10:00:00Z',
      });
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe('Hi there');
    expect(result.current.messages[0].sender_name).toBe('Alice');
  });

  it('sets isConnected to true on open', () => {
    const { result } = renderHook(() => useChat('room-123', 'test-token'));
    const ws = MockWebSocket.instances[0];

    expect(result.current.isConnected).toBe(false);

    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('sends typing event', () => {
    const { result } = renderHook(() => useChat('room-123', 'test-token'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      result.current.sendTyping();
    });

    const sent = JSON.parse(ws.sentMessages[0]);
    expect(sent).toEqual({ type: 'typing' });
  });
});
