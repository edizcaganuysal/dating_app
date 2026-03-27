import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Sound effects manager for Yuni
// All sounds are optional and respect device mute settings

let isInitialized = false;

async function ensureAudioMode() {
  if (isInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // Respect mute switch
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
  } catch {
    // Audio not available — silently continue
  }
}

// Programmatic sound generation using oscillator-style approach
// Since we don't have audio files, we use haptics as the primary feedback
// and this module provides the architecture for when sound files are added
import * as Haptics from 'expo-haptics';

export const sounds = {
  /** Subtle pop — chip selection, toggle */
  pop: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  /** Warm chime — milestone completion */
  chime: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Transition whoosh — phase transitions */
  whoosh: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /** Success bell — verification success, match reveal */
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Error feedback */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },

  /** Selection feedback — tab switch, minor interactions */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
  },

  /** Heavy feedback — match reveal, profile complete */
  celebration: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Double tap for emphasis
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }, 100);
    } catch {}
  },
};

export default sounds;
