// Manual mock for react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');

  function mockLayoutAnim() {
    const obj = {};
    ['delay', 'duration', 'springify', 'damping', 'stiffness', 'mass',
     'withInitialValues', 'withCallback', 'randomDelay', 'build'].forEach(m => {
      obj[m] = () => mockLayoutAnim();
    });
    return obj;
  }

  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent: (comp) => comp,
      call: () => {},
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => ({}),
    useDerivedValue: (fn) => ({ value: 0 }),
    useAnimatedScrollHandler: () => ({}),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_d, v) => v,
    withSequence: (...args) => args[args.length - 1],
    withRepeat: (v) => v,
    interpolateColor: () => 'transparent',
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      quad: (t) => t * t,
      cubic: (t) => t * t * t,
      sin: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      inOut: (fn) => fn,
    },
    runOnJS: (fn) => fn,
    FadeInDown: mockLayoutAnim(),
    FadeInUp: mockLayoutAnim(),
    FadeIn: mockLayoutAnim(),
    FadeOut: mockLayoutAnim(),
    SlideInRight: mockLayoutAnim(),
    SlideOutLeft: mockLayoutAnim(),
    Layout: mockLayoutAnim(),
  };
});

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({}));

// Mock expo-blur
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

// Mock expo-av
jest.mock('expo-av', () => ({ Audio: { setAudioModeAsync: jest.fn() } }));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));

// Mock @expo-google-fonts
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true],
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
  Inter_800ExtraBold: 'Inter_800ExtraBold',
}));

jest.mock('@expo-google-fonts/playfair-display', () => ({
  PlayfairDisplay_400Regular: 'PlayfairDisplay_400Regular',
  PlayfairDisplay_500Medium: 'PlayfairDisplay_500Medium',
  PlayfairDisplay_600SemiBold: 'PlayfairDisplay_600SemiBold',
  PlayfairDisplay_700Bold: 'PlayfairDisplay_700Bold',
  PlayfairDisplay_400Regular_Italic: 'PlayfairDisplay_400Regular_Italic',
  PlayfairDisplay_700Bold_Italic: 'PlayfairDisplay_700Bold_Italic',
}));

// Mock lottie-react-native
jest.mock('lottie-react-native', () => 'LottieView');

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
  };
});
