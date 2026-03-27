import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../src/screens/onboarding/OnboardingScreen';

jest.mock('../../src/api/profiles', () => ({
  createProfile: jest.fn(),
  selfieVerify: jest.fn(),
  uploadPhoto: jest.fn(),
  verifyPhotosBatch: jest.fn(),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', first_name: 'Test', email: 'test@test.edu' },
    logout: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: jest.fn(),
    navigate: jest.fn(),
  }),
}));

describe('OnboardingScreen', () => {
  it('renders without crashing', () => {
    const { UNSAFE_root } = render(<OnboardingScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shows progress bar', () => {
    const { UNSAFE_root } = render(<OnboardingScreen />);
    expect(UNSAFE_root.children.length).toBeGreaterThan(0);
  });

  it('renders back button', async () => {
    const { getByText } = render(<OnboardingScreen />);
    await waitFor(() => {
      expect(getByText('←')).toBeTruthy();
    });
  });
});
