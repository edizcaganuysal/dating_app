import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PostDateScreen from '../../src/screens/PostDateScreen';

jest.mock('../../src/api/chat', () => ({
  getGroupDetail: jest.fn().mockResolvedValue({
    id: 'group-1',
    activity: 'dinner',
    scheduled_date: '2026-03-20',
    scheduled_time: '19:00',
    venue_name: 'Test Venue',
    venue_address: '123 Test St',
    status: 'completed',
    members: [
      {
        user_id: 'user-1',
        profile: {
          id: 'p1', first_name: 'Me', age: 21, gender: 'M', bio: 'bio',
          interests: [], photo_urls: [], program: 'CS', is_selfie_verified: true,
        },
      },
      {
        user_id: 'user-2',
        profile: {
          id: 'p2', first_name: 'Alice', age: 22, gender: 'F', bio: 'bio',
          interests: [], photo_urls: [], program: 'Math', is_selfie_verified: true,
        },
      },
      {
        user_id: 'user-3',
        profile: {
          id: 'p3', first_name: 'Bob', age: 23, gender: 'M', bio: 'bio',
          interests: [], photo_urls: [], program: 'Physics', is_selfie_verified: true,
        },
      },
    ],
    chat_room_id: 'room-1',
  }),
}));

jest.mock('../../src/api/feedback', () => ({
  submitFeedback: jest.fn().mockResolvedValue({ id: 'fb-1' }),
}));

jest.mock('../../src/api/dates', () => ({
  getMyMatches: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Me' },
    token: 'test-token',
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() }),
  useRoute: () => ({ params: { groupId: 'group-1' } }),
}));

describe('PostDateScreen', () => {
  it('renders star rating', async () => {
    const { getByTestId } = render(<PostDateScreen />);
    await waitFor(() => {
      expect(getByTestId('star-rating')).toBeTruthy();
    });
  });

  it('renders interest toggles for each other member', async () => {
    const { getByTestId } = render(<PostDateScreen />);
    await waitFor(() => {
      expect(getByTestId('heart-user-2')).toBeTruthy();
      expect(getByTestId('heart-user-3')).toBeTruthy();
    });
  });

  it('renders submit button', async () => {
    const { getByTestId } = render(<PostDateScreen />);
    await waitFor(() => {
      expect(getByTestId('submit-button')).toBeTruthy();
    });
  });

  it('renders report button', async () => {
    const { getByTestId } = render(<PostDateScreen />);
    await waitFor(() => {
      expect(getByTestId('report-button')).toBeTruthy();
    });
  });
});
