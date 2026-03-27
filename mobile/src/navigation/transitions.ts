import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Screen transition configurations for different screen types

export const defaultScreenOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  animationDuration: 250,
};

export const revealScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'fullScreenModal',
  animation: 'fade',
  animationDuration: 300,
};

export const modalScreenOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: 250,
};

export const fadeScreenOptions: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 200,
};
