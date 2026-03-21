import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileSetupScreen from '../../src/screens/ProfileSetupScreen';

jest.mock('../../src/api/profiles', () => ({
  createProfile: jest.fn(),
  selfieVerify: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: jest.fn(),
    navigate: jest.fn(),
  }),
}));

describe('ProfileSetupScreen', () => {
  it('renders step 1 with photo inputs', () => {
    const { getByTestId, getByText } = render(<ProfileSetupScreen />);

    expect(getByText('Add at least 3 photos')).toBeTruthy();
    expect(getByTestId('photo-input-0')).toBeTruthy();
    expect(getByTestId('photo-input-1')).toBeTruthy();
    expect(getByTestId('photo-input-2')).toBeTruthy();
    expect(getByText('Step 1 of 5')).toBeTruthy();
  });

  it('can navigate to step 2 after filling 3 photos', () => {
    const { getByTestId, getByText } = render(<ProfileSetupScreen />);

    fireEvent.changeText(getByTestId('photo-input-0'), 'https://example.com/1.jpg');
    fireEvent.changeText(getByTestId('photo-input-1'), 'https://example.com/2.jpg');
    fireEvent.changeText(getByTestId('photo-input-2'), 'https://example.com/3.jpg');

    fireEvent.press(getByTestId('next-button'));

    expect(getByText('Step 2 of 5')).toBeTruthy();
    expect(getByText('About You')).toBeTruthy();
  });

  it('can navigate back from step 2 to step 1', () => {
    const { getByTestId, getByText } = render(<ProfileSetupScreen />);

    // Go to step 2
    fireEvent.changeText(getByTestId('photo-input-0'), 'https://example.com/1.jpg');
    fireEvent.changeText(getByTestId('photo-input-1'), 'https://example.com/2.jpg');
    fireEvent.changeText(getByTestId('photo-input-2'), 'https://example.com/3.jpg');
    fireEvent.press(getByTestId('next-button'));

    expect(getByText('Step 2 of 5')).toBeTruthy();

    // Go back
    fireEvent.press(getByTestId('back-button'));
    expect(getByText('Step 1 of 5')).toBeTruthy();
  });

  it('disables next button when requirements not met', () => {
    const { getByTestId } = render(<ProfileSetupScreen />);

    const nextButton = getByTestId('next-button');
    // Only 0 photos filled — button should be disabled
    expect(nextButton.props.accessibilityState?.disabled).toBeTruthy();
  });
});
