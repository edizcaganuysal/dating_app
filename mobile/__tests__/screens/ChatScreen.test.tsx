import React from 'react';
import { render } from '@testing-library/react-native';
import ChatScreen from '../../src/screens/ChatScreen';

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test' },
    token: 'test-token',
  }),
}));

jest.mock('../../src/hooks/useChat', () => {
  return jest.fn(() => ({
    messages: [
      {
        id: 'msg-1',
        sender_id: 'user-2',
        sender_name: 'Alice',
        content: 'Hello!',
        created_at: '2026-03-21T10:00:00Z',
      },
    ],
    isConnected: true,
    sendMessage: jest.fn(),
    sendTyping: jest.fn(),
    loadHistory: jest.fn(),
    typingUser: null,
  }));
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { roomId: 'room-123' } }),
}));

describe('ChatScreen', () => {
  it('renders message list and input field', () => {
    const { getByTestId } = render(<ChatScreen />);
    expect(getByTestId('message-list')).toBeTruthy();
    expect(getByTestId('message-input')).toBeTruthy();
  });

  it('renders send button', () => {
    const { getByTestId } = render(<ChatScreen />);
    expect(getByTestId('send-button')).toBeTruthy();
  });

  it('renders messages from other users', () => {
    const { getByTestId } = render(<ChatScreen />);
    expect(getByTestId('message-msg-1')).toBeTruthy();
  });
});
