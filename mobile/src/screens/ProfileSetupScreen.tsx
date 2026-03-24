import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, ActionSheetIOS, Platform, Dimensions, TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// MapView removed — requires dev build, not available in Expo Go
import { createProfile, uploadPhoto, selfieVerify, verifyPhotosBatch } from '../api/profiles';
import { VibeAnswer } from '../types';
import { colors } from '../theme';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

// ── Constants ──────────────────────────────────────────────────────────────

const PROGRAMS = [
  'Computer Science', 'Engineering', 'Business', 'Economics', 'Psychology',
  'Biology', 'Pre-Med', 'Math', 'Physics', 'Chemistry', 'English', 'History',
  'Political Science', 'Sociology', 'Art', 'Music', 'Philosophy', 'Nursing',
  'Law', 'Architecture', 'Environmental Science', 'Communications',
  'Kinesiology', 'Education', 'Data Science', 'Neuroscience',
  'International Relations', 'Film Studies', 'Linguistics', 'Anthropology',
  'Other',
];

// ── Interest System (Tinder-style with categories + recommendations) ──

interface InterestCategory {
  name: string;
  emoji: string;
  interests: string[];
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: 'Sports & Fitness', emoji: '💪',
    interests: [
      'Hiking', 'Running', 'Gym', 'Yoga', 'Swimming', 'Cycling',
      'Basketball', 'Soccer', 'Tennis', 'Rock Climbing', 'Surfing',
      'Martial Arts', 'Volleyball', 'Skiing', 'Skateboarding',
      'Dance Fitness', 'Golf', 'Boxing',
    ],
  },
  {
    name: 'Music', emoji: '🎵',
    interests: [
      'Live Music', 'Concerts', 'Singing', 'Guitar', 'Piano', 'DJing',
      'K-Pop', 'Hip Hop', 'R&B', 'Jazz', 'Indie', 'Classical Music',
      'Vinyl Records', 'Karaoke', 'Music Production',
    ],
  },
  {
    name: 'Creative', emoji: '🎨',
    interests: [
      'Photography', 'Art', 'Painting', 'Drawing', 'Writing', 'Poetry',
      'Graphic Design', 'Filmmaking', 'Crafts', 'Pottery', 'Tattoos',
      'Calligraphy', 'Interior Design', 'Fashion Design',
    ],
  },
  {
    name: 'Food & Drink', emoji: '🍕',
    interests: [
      'Cooking', 'Baking', 'Coffee', 'Wine', 'Craft Beer', 'Brunch',
      'Foodie', 'Trying New Restaurants', 'Mixology', 'Sushi',
      'BBQ', 'Vegan Food', 'Street Food', 'Tea',
    ],
  },
  {
    name: 'Entertainment', emoji: '🎬',
    interests: [
      'Movies', 'TV Shows', 'Anime', 'Gaming', 'Board Games',
      'Podcasts', 'Stand-up Comedy', 'Theatre', 'Reading', 'Trivia',
      'True Crime', 'Manga', 'Reality TV', 'Documentaries',
    ],
  },
  {
    name: 'Outdoors & Travel', emoji: '✈️',
    interests: [
      'Travel', 'Camping', 'Beach', 'Road Trips', 'Nature',
      'Gardening', 'Stargazing', 'Backpacking', 'Fishing',
      'Scuba Diving', 'Bird Watching', 'National Parks',
    ],
  },
  {
    name: 'Social', emoji: '🎉',
    interests: [
      'Dancing', 'House Parties', 'Volunteering', 'Networking',
      'Bar Hopping', 'Festivals', 'Clubbing', 'Brunching',
      'Game Nights', 'Wine Tasting Events',
    ],
  },
  {
    name: 'Lifestyle', emoji: '✨',
    interests: [
      'Fashion', 'Thrifting', 'Skincare', 'Meditation', 'Astrology',
      'Journaling', 'Self-Care', 'Pets', 'Dogs', 'Cats',
      'Plant Parent', 'Minimalism', 'Sustainability',
    ],
  },
  {
    name: 'Intellectual', emoji: '🧠',
    interests: [
      'Science', 'History', 'Philosophy', 'Politics', 'Languages',
      'Psychology', 'Space', 'Technology', 'Startups', 'Investing',
      'Economics', 'Debate', 'Current Events',
    ],
  },
];

const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(c => c.interests);

const RECOMMENDATIONS: Record<string, string[]> = {
  'Hiking': ['Camping', 'Rock Climbing', 'Nature', 'Travel', 'Photography', 'National Parks', 'Backpacking'],
  'Running': ['Gym', 'Cycling', 'Dance Fitness', 'Yoga', 'Swimming', 'Marathon'],
  'Gym': ['Running', 'Boxing', 'Yoga', 'Dance Fitness', 'Swimming', 'Cycling'],
  'Yoga': ['Meditation', 'Self-Care', 'Dance Fitness', 'Skincare', 'Hiking', 'Gym'],
  'Swimming': ['Surfing', 'Scuba Diving', 'Beach', 'Running', 'Gym'],
  'Cycling': ['Running', 'Hiking', 'Travel', 'Gym', 'Road Trips'],
  'Basketball': ['Soccer', 'Volleyball', 'Gym', 'Gaming', 'House Parties'],
  'Soccer': ['Basketball', 'Volleyball', 'Running', 'Gym'],
  'Tennis': ['Golf', 'Running', 'Gym', 'Cycling'],
  'Rock Climbing': ['Hiking', 'Camping', 'Gym', 'Surfing', 'Backpacking'],
  'Surfing': ['Beach', 'Swimming', 'Scuba Diving', 'Travel', 'Skateboarding'],
  'Skateboarding': ['Surfing', 'Hip Hop', 'Photography', 'Streetwear'],
  'Live Music': ['Concerts', 'Festivals', 'Indie', 'Bar Hopping', 'Dancing'],
  'Concerts': ['Live Music', 'Festivals', 'Dancing', 'Bar Hopping', 'Music Production'],
  'Singing': ['Karaoke', 'Guitar', 'Piano', 'Music Production'],
  'Guitar': ['Singing', 'Piano', 'Songwriting', 'Indie', 'Live Music'],
  'Piano': ['Guitar', 'Classical Music', 'Singing', 'Jazz'],
  'DJing': ['Music Production', 'Clubbing', 'House Parties', 'Hip Hop', 'Dancing'],
  'K-Pop': ['Dancing', 'Anime', 'Manga', 'Fashion', 'Karaoke'],
  'Hip Hop': ['Dancing', 'DJing', 'R&B', 'Concerts', 'Fashion'],
  'Photography': ['Art', 'Travel', 'Filmmaking', 'Nature', 'Hiking', 'Graphic Design'],
  'Art': ['Photography', 'Painting', 'Drawing', 'Museums', 'Pottery', 'Crafts'],
  'Painting': ['Drawing', 'Art', 'Pottery', 'Crafts', 'Photography'],
  'Drawing': ['Painting', 'Art', 'Graphic Design', 'Tattoos', 'Calligraphy'],
  'Writing': ['Poetry', 'Reading', 'Journaling', 'Podcasts', 'Philosophy'],
  'Poetry': ['Writing', 'Reading', 'Philosophy', 'Journaling'],
  'Filmmaking': ['Photography', 'Movies', 'Theatre', 'Graphic Design'],
  'Cooking': ['Baking', 'Foodie', 'Trying New Restaurants', 'Wine', 'BBQ'],
  'Baking': ['Cooking', 'Coffee', 'Foodie', 'Brunch'],
  'Coffee': ['Tea', 'Brunch', 'Reading', 'Cooking', 'Baking'],
  'Wine': ['Craft Beer', 'Cooking', 'Foodie', 'Wine Tasting Events', 'Brunch'],
  'Foodie': ['Cooking', 'Trying New Restaurants', 'Street Food', 'Brunch', 'Travel'],
  'Movies': ['TV Shows', 'Anime', 'Documentaries', 'Theatre', 'Stand-up Comedy'],
  'TV Shows': ['Movies', 'Reality TV', 'Anime', 'Documentaries', 'Podcasts'],
  'Anime': ['Manga', 'Gaming', 'K-Pop', 'Movies', 'Drawing'],
  'Gaming': ['Anime', 'Board Games', 'Trivia', 'Movies', 'Technology'],
  'Board Games': ['Gaming', 'Trivia', 'Game Nights', 'House Parties'],
  'Podcasts': ['Reading', 'True Crime', 'Psychology', 'Current Events'],
  'Reading': ['Writing', 'Podcasts', 'Philosophy', 'Coffee', 'History'],
  'Travel': ['Backpacking', 'Road Trips', 'Photography', 'Beach', 'Camping', 'Foodie'],
  'Camping': ['Hiking', 'Nature', 'Stargazing', 'Fishing', 'National Parks'],
  'Beach': ['Surfing', 'Swimming', 'Travel', 'Scuba Diving'],
  'Dancing': ['Live Music', 'Festivals', 'Clubbing', 'K-Pop', 'Hip Hop', 'Salsa'],
  'House Parties': ['Bar Hopping', 'Game Nights', 'Dancing', 'Mixology', 'Clubbing'],
  'Volunteering': ['Sustainability', 'Community', 'Networking'],
  'Festivals': ['Live Music', 'Concerts', 'Dancing', 'Travel', 'Camping'],
  'Fashion': ['Thrifting', 'Photography', 'Skincare', 'Interior Design', 'K-Pop'],
  'Thrifting': ['Fashion', 'Sustainability', 'Vintage', 'Shopping'],
  'Meditation': ['Yoga', 'Self-Care', 'Journaling', 'Mindfulness', 'Skincare'],
  'Astrology': ['Tarot', 'Meditation', 'Journaling', 'Self-Care'],
  'Dogs': ['Cats', 'Pets', 'Hiking', 'Nature', 'Parks'],
  'Cats': ['Dogs', 'Pets', 'Reading', 'Gaming'],
  'Technology': ['Startups', 'Investing', 'Gaming', 'Science', 'Space'],
  'Startups': ['Technology', 'Investing', 'Networking', 'Economics'],
  'Philosophy': ['Psychology', 'History', 'Reading', 'Writing', 'Debate'],
  'Psychology': ['Philosophy', 'Reading', 'Podcasts', 'Self-Care'],
  'True Crime': ['Podcasts', 'Documentaries', 'Psychology', 'Reading'],
};

const HUMOR_STYLES = ['Sarcastic', 'Goofy', 'Dry', 'Dark', 'Wholesome', 'Witty'];
const COMMUNICATION_PREFS = ['Texter', 'Caller', 'In-person', 'Voice notes'];
const CONFLICT_STYLES = ['Talk it out immediately', 'Need space first', 'Avoid confrontation', 'Write it out'];
const DRINKING_OPTIONS = ['Never', 'Socially', 'Regularly'];
const SMOKING_OPTIONS = ['Never', 'Socially', 'Regularly'];
const EXERCISE_OPTIONS = ['Never', 'Sometimes', 'Often', 'Daily'];
const DIET_OPTIONS = ['No restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Pescatarian'];
const SLEEP_OPTIONS = ['Early bird', 'Night owl', 'Depends on the day'];
const GROUP_ROLES = ['Starts conversations', 'Tells jokes', 'Listens quietly', 'Plans everything', 'Goes with the flow', 'Gets everyone hyped', 'The photographer', 'The DJ'];
const GROUP_SIZES = ['Intimate (3-4)', 'Medium (5-6)', 'The more the merrier'];
const DEALBREAKERS = [
  'Smoking', 'Heavy drinking', 'No sense of humor', 'Too quiet',
  'Too loud', 'Different religion', 'Different politics', 'Long distance',
  'No ambition', 'Bad hygiene', 'Rude to service staff', 'Always on phone',
];

// ── Prompts (fill-in-the-blank style with options + custom) ──

const PROMPTS = [
  "My ideal first date would be...",
  "The quickest way to my heart is...",
  "I'm looking for someone who...",
  "On a Sunday morning you'll find me...",
  "I geek out about...",
  "My friends would describe me as...",
  "A dealbreaker for me is...",
  "My love language is...",
  "The most spontaneous thing I've done is...",
  "I'll never shut up about...",
];

const PROMPT_OPTIONS: Record<string, string[]> = {
  "My ideal first date would be...": [
    "Dinner and deep conversation", "Something adventurous outdoors",
    "Cozy movie night at home", "Exploring a new neighborhood",
    "Cooking together", "A museum or gallery", "Live music and drinks",
    "Coffee and a long walk",
  ],
  "The quickest way to my heart is...": [
    "Making me laugh", "Thoughtful surprises", "Quality time together",
    "Good food", "Deep late-night conversations", "A handwritten note",
    "Planning something special", "Being genuinely curious about my life",
  ],
  "I'm looking for someone who...": [
    "Makes me laugh until I cry", "Is ambitious and driven",
    "Loves adventure as much as I do", "Can hold a deep conversation",
    "Is kind to everyone", "Doesn't take themselves too seriously",
    "Shares my values", "Challenges me to grow",
  ],
  "On a Sunday morning you'll find me...": [
    "At brunch with friends", "Sleeping in and reading",
    "At the gym or on a run", "At the farmers market",
    "Binge-watching something", "Cooking a big breakfast",
    "Hiking somewhere scenic", "Doing absolutely nothing",
  ],
  "I geek out about...": [
    "Music and concerts", "Sports stats", "True crime podcasts",
    "Tech and startups", "History and culture", "Space and astronomy",
    "Cooking techniques", "Film theory",
  ],
  "My friends would describe me as...": [
    "The planner of the group", "The life of the party",
    "The therapist friend", "Always down for anything",
    "Loyal to a fault", "The funny one",
    "The chill one", "The adventurous one",
  ],
  "A dealbreaker for me is...": [
    "Not having a sense of humor", "Being closed-minded",
    "Poor communication", "Not being ambitious",
    "Being rude to strangers", "Not liking animals",
    "No emotional intelligence", "Being too competitive",
  ],
  "My love language is...": [
    "Words of affirmation", "Quality time",
    "Physical touch", "Acts of service",
    "Gift giving", "Cooking for someone",
    "Planning thoughtful experiences", "Writing letters",
  ],
  "The most spontaneous thing I've done is...": [
    "Booked a last-minute trip", "Went skydiving",
    "Moved to a new city alone", "Said yes to a blind date",
    "Quit my job to follow a dream", "Road trip with no plan",
  ],
  "I'll never shut up about...": [
    "My latest Netflix obsession", "That one trip I took",
    "My pet", "This amazing restaurant I found",
    "The book I'm reading", "My side project",
    "A conspiracy theory", "My workout routine",
  ],
};

const VIBE_QUESTIONS: { question: string; optionA: string; optionB: string }[] = [
  { question: 'Friday night:', optionA: 'House party with friends', optionB: 'Cozy night in' },
  { question: 'On a first date:', optionA: 'Plan everything', optionB: 'Be spontaneous' },
  { question: 'Texting style:', optionA: 'Reply instantly', optionB: 'Reply when I can' },
  { question: 'When I disagree:', optionA: 'Debate it out', optionB: 'Keep the peace' },
  { question: 'Weekends are for:', optionA: 'Going out and socializing', optionB: 'Recharging alone or with close friends' },
];

interface PhotoSlot { localUri: string; serverUrl: string; }

// ── Helper Components ──────────────────────────────────────────────────────

function ChipSelect({ options, selected, onToggle, multi = false, max, showOther, otherValue, onOtherChange }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean; max?: number;
  showOther?: boolean; otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const isOtherSelected = selected.includes('__other__');

  return (
    <View>
      <View style={styles.chipRow}>
        {options.map(opt => {
          const isSelected = selected.includes(opt);
          const disabled = multi && max !== undefined && selected.length >= max && !isSelected;
          return (
            <TouchableOpacity key={opt} disabled={disabled}
              style={[styles.chip, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}
              onPress={() => onToggle(opt)}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
        {showOther && (
          <TouchableOpacity
            style={[styles.chip, styles.chipOther, isOtherSelected && styles.chipSelected]}
            onPress={() => {
              setShowOtherInput(!showOtherInput);
              if (!isOtherSelected) onToggle('__other__');
            }}>
            <Text style={[styles.chipText, isOtherSelected && styles.chipTextSelected]}>+ Custom</Text>
          </TouchableOpacity>
        )}
      </View>
      {showOther && (showOtherInput || isOtherSelected) && (
        <TextInput
          style={styles.otherInput}
          placeholder="Type your answer..."
          value={otherValue || ''}
          onChangeText={onOtherChange}
          maxLength={50}
        />
      )}
    </View>
  );
}

function SliderSelect({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: [string, string]; }) {
  return (
    <View>
      <View style={styles.sliderRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}
            style={[styles.sliderDot, n === value && styles.sliderDotActive]}>
            <Text style={[styles.sliderDotText, n === value && styles.sliderDotTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{labels[0]}</Text>
        <Text style={styles.sliderLabel}>{labels[1]}</Text>
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const [path, setPath] = useState<'quick' | 'thorough' | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>({});

  // Shared state
  const [photos, setPhotos] = useState<(PhotoSlot | null)[]>([null, null, null, null, null, null]);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieStatus, setSelfieStatus] = useState<'none' | 'verifying' | 'verified' | 'failed'>('none');
  const [selfieMessage, setSelfieMessage] = useState('');
  const [program, setProgram] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(2);
  const [intent, setIntent] = useState('open');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [customPromptTexts, setCustomPromptTexts] = useState<Record<string, string>>({});
  const [vibeAnswers, setVibeAnswers] = useState<(string | null)[]>([null, null, null, null, null]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);

  // Thorough-only state
  const [socialEnergy, setSocialEnergy] = useState(3);
  const [humorStyles, setHumorStyles] = useState<string[]>([]);
  const [customHumor, setCustomHumor] = useState('');
  const [commPref, setCommPref] = useState('');
  const [customCommPref, setCustomCommPref] = useState('');
  const [conflictStyle, setConflictStyle] = useState('');
  const [customConflictStyle, setCustomConflictStyle] = useState('');
  const [drinking, setDrinking] = useState('');
  const [smoking, setSmoking] = useState('');
  const [exercise, setExercise] = useState('');
  const [diet, setDiet] = useState('');
  const [customDiet, setCustomDiet] = useState('');
  const [sleepSchedule, setSleepSchedule] = useState('');
  const [groupRoles, setGroupRoles] = useState<string[]>([]);
  const [customGroupRole, setCustomGroupRole] = useState('');
  const [idealGroupSize, setIdealGroupSize] = useState('');
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);
  const [customDealbreaker, setCustomDealbreaker] = useState('');

  // Location state
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(25);

  // Self-description state (thorough)
  const [bodyType, setBodyType] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [styleTags, setStyleTags] = useState<string[]>([]);

  // Preference state (thorough)
  const [prefBodyType, setPrefBodyType] = useState<string[]>([]);
  const [prefSocialEnergyMin, setPrefSocialEnergyMin] = useState(1);
  const [prefSocialEnergyMax, setPrefSocialEnergyMax] = useState(5);
  const [prefSocialEnergyLevels, setPrefSocialEnergyLevels] = useState<number[]>([1, 2, 3, 4, 5]);

  // Location search state
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingAddr, setSearchingAddr] = useState(false);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const photoCount = photos.filter(p => p !== null).length;

  // ── Steps definition ──

  const quickSteps = ['photos', 'location', 'basics', 'interests', 'prompts', 'vibes', 'preferences'];
  const thoroughSteps = ['photos', 'location', 'basics', 'personality', 'lifestyle', 'social', 'about_you', 'your_prefs', 'interests', 'dealbreakers', 'prompts', 'vibes_prefs'];
  const steps = path === 'thorough' ? thoroughSteps : quickSteps;
  const totalSteps = steps.length;
  const currentStepName = steps[step] || '';

  // ── Interest recommendations ──

  const recommendedInterests = useMemo(() => {
    if (selectedInterests.length === 0) return [];
    const recs = new Set<string>();
    for (const interest of selectedInterests) {
      const related = RECOMMENDATIONS[interest] || [];
      for (const r of related) {
        if (!selectedInterests.includes(r)) recs.add(r);
      }
    }
    return Array.from(recs).slice(0, 12);
  }, [selectedInterests]);

  const filteredCategories = useMemo(() => {
    if (!interestSearch.trim()) return INTEREST_CATEGORIES;
    const q = interestSearch.toLowerCase();
    return INTEREST_CATEGORIES.map(cat => ({
      ...cat,
      interests: cat.interests.filter(i => i.toLowerCase().includes(q)),
    })).filter(cat => cat.interests.length > 0);
  }, [interestSearch]);

  // ── Photo handling ──

  const pickImage = async (index: number, source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access needed.'); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access needed.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8, orderedSelection: true, selectionLimit: 1 });
      }
      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        // Show photo immediately with analyzing overlay
        setPhotos(prev => { const u = [...prev]; u[index] = { localUri, serverUrl: '' }; return u; });
        setUploadingSlots(prev => ({ ...prev, [index]: true }));
        // Collect existing uploaded URLs for cross-checking
        const existingUrls = photos
          .filter((p, idx) => p !== null && p.serverUrl !== '' && idx !== index)
          .map(p => p!.serverUrl);
        // Upload + AI verify in background — doesn't block other slots
        uploadPhoto(localUri, existingUrls)
          .then(response => {
            setPhotos(prev => { const u = [...prev]; u[index] = { localUri, serverUrl: response.url }; return u; });
          })
          .catch((e: any) => {
            setPhotos(prev => { const u = [...prev]; u[index] = null; return u; });
            let detail: string;
            if (e?.response?.data?.detail) {
              detail = typeof e.response.data.detail === 'string'
                ? e.response.data.detail
                : JSON.stringify(e.response.data.detail);
            } else if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) {
              detail = 'Photo verification is taking too long. This can happen with large photos — try a smaller image or retake with your camera.';
            } else if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')) {
              detail = 'Cannot reach the server. Check your WiFi connection and try again.';
            } else if (e?.response?.status === 500) {
              detail = 'The verification service encountered an error. Please try again in a moment.';
            } else if (e?.response?.status === 413) {
              detail = 'This photo is too large. Please use a smaller image (under 10MB).';
            } else {
              detail = `Upload failed: ${e?.message || 'Unknown network issue'}. Check your connection and try again.`;
            }
            Alert.alert('Photo Rejected', detail);
          })
          .finally(() => {
            setUploadingSlots(prev => { const u = { ...prev }; delete u[index]; return u; });
          });
      }
    } catch (err: any) { Alert.alert('Camera Error', err?.message || 'Could not access your camera or photo library. Check your permissions in Settings.'); }
  };

  const showPhotoOptions = (index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Photos', 'Cancel'], cancelButtonIndex: 2, title: 'Add a photo of yourself' },
        (i) => { if (i === 0) pickImage(index, 'camera'); else if (i === 1) pickImage(index, 'gallery'); },
      );
    } else {
      Alert.alert('Add Photo', 'Use a clear photo of yourself', [
        { text: 'Take Photo (Recommended)', onPress: () => pickImage(index, 'camera') },
        { text: 'Choose from Photos', onPress: () => pickImage(index, 'gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSelfiePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed for selfie verification.'); return; }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setSelfieUri(result.assets[0].uri);
        setSelfieStatus('verifying');
        setSelfieMessage('Verifying your identity...');

        try {
          const existingPhotoUrls = photos
            .filter(p => p !== null && p.serverUrl !== '')
            .map(p => p!.serverUrl);
          const response = await selfieVerify(result.assets[0].uri, false, existingPhotoUrls);

          if (response.status === 'verified') {
            setSelfieStatus('verified');
            setSelfieMessage('Identity confirmed');
          } else {
            setSelfieStatus('failed');
            setSelfieMessage(response.message || 'Your selfie could not be verified. Make sure your face is clearly visible, well-lit, and without filters.');
          }
        } catch (e: any) {
          setSelfieStatus('failed');
          const selfieErr = e?.response?.data?.detail
            || (e?.code === 'ECONNABORTED' ? 'Selfie verification timed out. Try again with better lighting.'
            : e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check your connection.'
            : e?.response?.status === 500 ? 'Verification service error. Please try again in a moment.'
            : `Verification failed: ${e?.message || 'Unknown error'}. Try again.`);
          setSelfieMessage(selfieErr);
        }
      }
    } catch {
      setSelfieStatus('failed');
      setSelfieMessage('Could not access your camera. Check camera permissions in your phone Settings.');
    }
  };

  // ── Prompt handling ──

  const addPrompt = (prompt: string, answer: string) => {
    if (selectedPrompts.length >= 3) return;
    setSelectedPrompts([...selectedPrompts, { prompt, answer }]);
  };
  const removePrompt = (i: number) => setSelectedPrompts(selectedPrompts.filter((_, idx) => idx !== i));

  // ── Toggle helpers ──

  const toggle = (list: string[], item: string, setter: (v: string[]) => void, max?: number) => {
    if (list.includes(item)) setter(list.filter(i => i !== item));
    else if (!max || list.length < max) setter([...list, item]);
  };

  const resolveCustom = (value: string, customValue: string): string => {
    if (value === '__other__' && customValue.trim()) return customValue.trim();
    return value;
  };

  // ── Validation ──

  const canProceed = (): boolean => {
    switch (currentStepName) {
      case 'photos': return photoCount >= 3 && Object.keys(uploadingSlots).length === 0;
      case 'location': return true; // Location is optional, user can skip
      case 'about_you': return true; // Self-description is optional
      case 'your_prefs': return true; // Preferences about others are optional
      case 'basics': {
        const hasProgram = program === 'Other' ? customProgram.trim() !== '' : program !== '';
        return hasProgram && intent !== '';
      }
      case 'interests': return selectedInterests.length >= 3;
      case 'prompts': {
        if (selectedPrompts.length < 2) return false;
        // Make sure custom prompts have actual text
        return selectedPrompts.every(sp =>
          sp.answer !== '__custom__' || (customPromptTexts[sp.prompt] || '').trim().length > 0,
        );
      }
      case 'vibes': return vibeAnswers.every(a => a !== null);
      case 'preferences': return ageMin >= 18 && ageMax <= 99 && ageMin <= ageMax;
      case 'personality': return humorStyles.length >= 1 && commPref !== '' && conflictStyle !== '';
      case 'lifestyle': return drinking !== '' && smoking !== '' && exercise !== '';
      case 'social': return groupRoles.length >= 1 && idealGroupSize !== '';
      case 'dealbreakers': return true;
      case 'vibes_prefs': return vibeAnswers.every(a => a !== null) && ageMin >= 18 && ageMax <= 99;
      default: return false;
    }
  };

  // ── Submit ──

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const photoUrls = photos.filter(p => p !== null && p.serverUrl !== '').map(p => p!.serverUrl);
      const vibes: VibeAnswer[] = VIBE_QUESTIONS.map((q, i) => ({ question: q.question, answer: vibeAnswers[i]! }));
      const finalProgram = program === 'Other' ? customProgram.trim() : program;

      // Resolve custom prompt answers
      const finalPrompts = selectedPrompts.map(sp => {
        if (sp.answer === '__custom__') {
          return { prompt: sp.prompt, answer: (customPromptTexts[sp.prompt] || '').trim() };
        }
        return sp;
      });

      await createProfile({
        onboarding_path: path || 'quick',
        program: finalProgram,
        year_of_study: yearOfStudy,
        relationship_intent: intent,
        photo_urls: photoUrls,
        interests: selectedInterests.map(i => i.toLowerCase()),
        prompts: finalPrompts,
        vibe_answers: vibes,
        age_range_min: ageMin,
        age_range_max: ageMax,
        // Location (both paths)
        ...(locationLat && locationLng ? { latitude: locationLat, longitude: locationLng } : {}),
        preferred_max_distance_km: maxDistanceKm,
        ...(path === 'thorough' ? {
          // Self-description
          ...(bodyType ? { body_type: bodyType.toLowerCase() } : {}),
          ...(heightCm && !isNaN(parseInt(heightCm)) ? { height_cm: parseInt(heightCm) } : {}),
          ...(styleTags.length > 0 ? { style_tags: styleTags.map(s => s.toLowerCase()) } : {}),
          // Preferences about others
          ...(prefBodyType.length > 0 ? { pref_body_type: prefBodyType.map(b => b.toLowerCase()) } : {}),
          pref_social_energy_range: [Math.min(...prefSocialEnergyLevels), Math.max(...prefSocialEnergyLevels)],
          social_energy: socialEnergy,
          humor_styles: humorStyles.filter(h => h !== '__other__').map(h => h.toLowerCase()).concat(
            customHumor.trim() ? [customHumor.trim().toLowerCase()] : [],
          ),
          communication_pref: resolveCustom(commPref, customCommPref).toLowerCase().replace(/-/g, '_').replace(/ /g, '_'),
          conflict_style: (() => {
            const resolved = resolveCustom(conflictStyle, customConflictStyle);
            if (resolved === 'Talk it out immediately') return 'talk_immediately';
            if (resolved === 'Need space first') return 'need_space';
            if (resolved === 'Avoid confrontation') return 'avoid';
            if (resolved === 'Write it out') return 'write_it_out';
            return resolved.toLowerCase().replace(/ /g, '_');
          })(),
          drinking: drinking.toLowerCase(),
          smoking: smoking.toLowerCase(),
          exercise: exercise.toLowerCase(),
          diet: resolveCustom(diet, customDiet).toLowerCase().replace(/ /g, '_'),
          sleep_schedule: sleepSchedule === 'Early bird' ? 'early_bird' : sleepSchedule === 'Night owl' ? 'night_owl' : 'depends',
          group_role: groupRoles.filter(r => r !== '__other__').map(r => r.toLowerCase().replace(/ /g, '_')).concat(
            customGroupRole.trim() ? [customGroupRole.trim().toLowerCase().replace(/ /g, '_')] : [],
          ),
          ideal_group_size: idealGroupSize.includes('3-4') ? 'intimate' : idealGroupSize.includes('5-6') ? 'medium' : 'large',
          dealbreakers: dealbreakers.filter(d => d !== '__other__').map(d => d.toLowerCase().replace(/ /g, '_')).concat(
            customDealbreaker.trim() ? [customDealbreaker.trim().toLowerCase().replace(/ /g, '_')] : [],
          ),
        } : {}),
      });

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      let message = 'Failed to create profile.';
      if (e?.response?.data?.detail) {
        const detail = e.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors
          message = detail.map((err: any) => {
            const field = err.loc?.slice(1).join('.') || 'unknown field';
            return `${field}: ${err.msg}`;
          }).join('\n');
        }
      } else if (e?.code === 'ECONNABORTED') {
        message = 'Request timed out. Check your connection and try again.';
      } else if (e?.code === 'ERR_NETWORK') {
        message = 'Cannot reach the server. Check your connection.';
      } else if (e?.message) {
        message = e.message;
      }
      // Include status code for debugging
      const status = e?.response?.status ? ` (${e.response.status})` : '';
      console.error('Profile creation error:', JSON.stringify(e?.response?.data || e?.message));
      Alert.alert('Profile Creation Failed', message + status);
    } finally { setLoading(false); }
  };

  // ── Navigation ──

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      // Go back to path selection
      setPath(null);
    }
  };

  const handleNext = async () => {
    // When leaving photos step, do a final cross-check of ALL photos
    if (currentStepName === 'photos') {
      const completedPhotos = photos.filter(p => p !== null && p.serverUrl !== '');
      const anyUploading = Object.keys(uploadingSlots).length > 0;
      if (anyUploading) {
        Alert.alert('Please wait', 'Some photos are still being verified. Wait for all photos to finish before continuing.');
        return;
      }
      if (completedPhotos.length >= 2) {
        setLoading(true);
        try {
          await verifyPhotosBatch(completedPhotos.map(p => p!.serverUrl));
        } catch (e: any) {
          const detail = e?.response?.data?.detail || 'Could not verify your photos match. Please check that all photos are of you.';
          Alert.alert('Photo Verification Failed', detail);
          setLoading(false);
          return;
        }
        setLoading(false);
      }
    }

    if (step === totalSteps - 1) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  // ── Path Selection ──

  if (path === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pathContent}>
        <Text style={styles.header}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>How much time do you have?</Text>

        <TouchableOpacity style={styles.pathCard} onPress={() => { setPath('quick'); setStep(0); }}>
          <Text style={styles.pathTitle}>Quick Setup</Text>
          <Text style={styles.pathTime}>~2 minutes</Text>
          <Text style={styles.pathDesc}>Get started fast with the essentials. You can add more details later.</Text>
          <View style={styles.pathBadge}><Text style={styles.pathBadgeText}>7 steps</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.pathCard, styles.pathCardRecommended]} onPress={() => { setPath('thorough'); setStep(0); }}>
          <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>Recommended</Text></View>
          <Text style={styles.pathTitle}>Best Matches</Text>
          <Text style={styles.pathTime}>~4 minutes</Text>
          <Text style={styles.pathDesc}>More questions = better group chemistry. Tell us your personality, lifestyle, and what you're looking for.</Text>
          <View style={[styles.pathBadge, styles.pathBadgePurple]}><Text style={styles.pathBadgeText}>12 steps</Text></View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step Renderers ──

  const renderPhotos = () => (
    <View>
      <Text style={styles.stepTitle}>Add your photos</Text>
      <Text style={styles.stepSub}>{photoCount < 3 ? `Add at least ${3 - photoCount} more` : `${photoCount} photos added`}</Text>
      <View style={styles.photoGuidelinesBox}>
        <Text style={styles.photoGuidelinesTitle}>Photo guidelines</Text>
        <Text style={styles.photoGuidelinesText}>- Clear photos of your face (no heavy filters)</Text>
        <Text style={styles.photoGuidelinesText}>- All photos must be of you (same person)</Text>
        <Text style={styles.photoGuidelinesText}>- No group photos, screenshots, or AI images</Text>
        <Text style={styles.photoGuidelinesText}>- First photo is your main profile picture</Text>
      </View>
      <View style={styles.photoGrid}>
        {photos.map((p, i) => {
          const isSlotUploading = uploadingSlots[i] || false;
          return (
          <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => {
            if (isSlotUploading) return;
            if (p && p.serverUrl !== '') { setPhotos(prev => { const u = [...prev]; u[i] = null; return u; }); }
            else if (!p) { showPhotoOptions(i); }
          }} disabled={isSlotUploading}>
            {p ? (
              <View style={styles.photoFull}>
                <Image source={{ uri: p.localUri }} style={styles.photoImg} />
                {p.serverUrl === '' && (
                  <View style={styles.analyzingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.analyzingText}>Verifying...</Text>
                  </View>
                )}
                {p.serverUrl !== '' && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotos(prev => { const u = [...prev]; u[i] = null; return u; })}><Text style={styles.removeTxt}>X</Text></TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptySlot}><Text style={styles.plusIcon}>+</Text>{i < 3 && <Text style={styles.reqLabel}>Required</Text>}</View>
            )}
          </TouchableOpacity>
          );
        })}
      </View>

      {/* Video Selfie Verification */}
      <View style={styles.selfieSection}>
        <View style={styles.selfieHeader}>
          <Text style={styles.sectionTitle}>Selfie Verification</Text>
          {selfieStatus === 'verified' && <View style={styles.verifiedDot} />}
        </View>

        {selfieStatus === 'none' && (
          <>
            <Text style={styles.selfieDesc}>
              Take a quick selfie so we can confirm you're real. No filters, no editing — just you!
            </Text>
            <TouchableOpacity style={styles.selfieBtn} onPress={handleSelfiePhoto} disabled={uploading}>
              <Text style={styles.selfieBtnText}>Take Selfie</Text>
            </TouchableOpacity>
          </>
        )}

        {selfieStatus === 'verifying' && (
          <View style={styles.verifyingContainer}>
            {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumbLarge} />}
            <View style={styles.verifyingContent}>
              <ActivityIndicator size="small" color="#7B1FA2" />
              <Text style={styles.verifyingText}>{selfieMessage}</Text>
            </View>
            <View style={styles.verifySteps}>
              <Text style={styles.verifyStep}>Checking liveness...</Text>
              <Text style={styles.verifyStep}>Matching with your photos...</Text>
              <Text style={styles.verifyStep}>Confirming identity...</Text>
            </View>
          </View>
        )}

        {selfieStatus === 'verified' && (
          <View style={styles.verifiedContainer}>
            {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumbLarge} />}
            <View style={styles.verifiedContent}>
              <Text style={styles.verifiedIcon}>✓</Text>
              <Text style={styles.verifiedText}>Identity confirmed</Text>
              <Text style={styles.verifiedSubtext}>Your photos match your selfie</Text>
            </View>
          </View>
        )}

        {selfieStatus === 'failed' && (
          <View style={styles.failedContainer}>
            {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumbLarge} />}
            <Text style={styles.failedText}>{selfieMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setSelfieStatus('none'); setSelfieUri(null); }}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderBasics = () => (
    <View>
      <Text style={styles.stepTitle}>The Basics</Text>

      <Text style={styles.label}>Program / Major</Text>
      <ChipSelect
        options={PROGRAMS}
        selected={program ? [program] : []}
        onToggle={(p) => {
          setProgram(p);
          if (p !== 'Other') setCustomProgram('');
        }}
      />
      {program === 'Other' && (
        <TextInput
          style={styles.otherInput}
          placeholder="Type your program (e.g. Biomedical Engineering)"
          value={customProgram}
          onChangeText={setCustomProgram}
          maxLength={60}
          autoFocus
        />
      )}

      <Text style={styles.label}>Year of Study</Text>
      <ChipSelect options={['1', '2', '3', '4', '5', '6']} selected={[String(yearOfStudy)]} onToggle={(v) => setYearOfStudy(parseInt(v))} />

      <Text style={styles.label}>What are you looking for?</Text>
      {[
        { value: 'serious', label: 'Something serious', desc: 'Looking for a real relationship' },
        { value: 'casual', label: 'Keeping it casual', desc: 'Fun dates, no pressure' },
        { value: 'open', label: 'Open to anything', desc: "Let's see where it goes" },
      ].map(opt => (
        <TouchableOpacity key={opt.value} style={[styles.intentCard, intent === opt.value && styles.intentCardActive]}
          onPress={() => setIntent(opt.value)}>
          <Text style={[styles.intentLabel, intent === opt.value && styles.intentLabelActive]}>{opt.label}</Text>
          <Text style={styles.intentDesc}>{opt.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderInterests = () => (
    <View>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepSub}>Pick 3-10 things you love. We'll suggest more based on your picks!</Text>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search interests..."
        value={interestSearch}
        onChangeText={setInterestSearch}
      />

      <Text style={styles.countText}>{selectedInterests.length}/10 selected</Text>

      {/* Recommended section */}
      {recommendedInterests.length > 0 && !interestSearch && (
        <View style={styles.recSection}>
          <Text style={styles.recTitle}>Recommended for you</Text>
          <View style={styles.chipRow}>
            {recommendedInterests.map(interest => {
              const isSelected = selectedInterests.includes(interest);
              const disabled = selectedInterests.length >= 10 && !isSelected;
              return (
                <TouchableOpacity
                  key={interest}
                  disabled={disabled}
                  style={[styles.chip, styles.chipRec, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}
                  onPress={() => toggle(selectedInterests, interest, setSelectedInterests, 10)}
                >
                  <Text style={[styles.chipText, styles.chipRecText, isSelected && styles.chipTextSelected]}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Categories */}
      {filteredCategories.map(cat => (
        <View key={cat.name} style={styles.catSection}>
          <Text style={styles.catTitle}>{cat.emoji} {cat.name}</Text>
          <View style={styles.chipRow}>
            {cat.interests.map(interest => {
              const isSelected = selectedInterests.includes(interest);
              const disabled = selectedInterests.length >= 10 && !isSelected;
              return (
                <TouchableOpacity
                  key={interest}
                  disabled={disabled}
                  style={[styles.chip, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}
                  onPress={() => toggle(selectedInterests, interest, setSelectedInterests, 10)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );

  const renderPrompts = () => {
    const availablePrompts = PROMPTS.filter(p => !selectedPrompts.some(sp => sp.prompt === p));
    return (
      <View>
        <Text style={styles.stepTitle}>Show Your Personality</Text>
        <Text style={styles.stepSub}>Pick 2-3 prompts and choose an answer (or write your own)</Text>

        {/* Selected prompts */}
        {selectedPrompts.map((sp, i) => {
          const isCustomMode = sp.answer === '__custom__';
          return (
            <View key={i} style={styles.promptCard}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptQ}>{sp.prompt}</Text>
                <TouchableOpacity onPress={() => {
                  removePrompt(i);
                  const updated = { ...customPromptTexts };
                  delete updated[sp.prompt];
                  setCustomPromptTexts(updated);
                }}><Text style={styles.removePromptBtn}>X</Text></TouchableOpacity>
              </View>
              {isCustomMode ? (
                <TextInput
                  style={styles.promptCustomInput}
                  placeholder="Type your answer..."
                  value={customPromptTexts[sp.prompt] || ''}
                  onChangeText={(t) => setCustomPromptTexts({ ...customPromptTexts, [sp.prompt]: t.slice(0, 120) })}
                  maxLength={120}
                  autoFocus
                />
              ) : (
                <Text style={styles.promptA}>{sp.answer}</Text>
              )}
            </View>
          );
        })}

        {/* Available prompts */}
        {selectedPrompts.length < 3 && availablePrompts.length > 0 && (
          <View>
            <Text style={styles.label}>{selectedPrompts.length === 0 ? 'Choose a prompt:' : 'Add another:'}</Text>
            {availablePrompts.slice(0, 4).map(prompt => (
              <View key={prompt} style={styles.promptOptionGroup}>
                <Text style={styles.promptOptionTitle}>{prompt}</Text>
                <View style={styles.chipRow}>
                  {(PROMPT_OPTIONS[prompt] || []).map(ans => (
                    <TouchableOpacity key={ans} style={styles.chip} onPress={() => addPrompt(prompt, ans)}>
                      <Text style={styles.chipText}>{ans}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.chip, styles.chipOther]} onPress={() => {
                    addPrompt(prompt, '__custom__');
                  }}>
                    <Text style={styles.chipText}>Write my own...</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderVibes = () => (
    <View>
      <Text style={styles.stepTitle}>Quick Vibe Check</Text>
      {VIBE_QUESTIONS.map((q, i) => (
        <View key={i} style={styles.vibeQ}>
          <Text style={styles.vibeText}>{q.question}</Text>
          <View style={styles.vibeOpts}>
            {[q.optionA, q.optionB].map(opt => (
              <TouchableOpacity key={opt} style={[styles.vibeOpt, vibeAnswers[i] === opt && styles.vibeOptActive]}
                onPress={() => { const a = [...vibeAnswers]; a[i] = opt; setVibeAnswers(a); }}>
                <Text style={[styles.vibeOptText, vibeAnswers[i] === opt && styles.vibeOptTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderPreferences = () => (
    <View>
      <Text style={styles.stepTitle}>Preferences</Text>
      <Text style={styles.stepSub}>This is private -- only used for matching.</Text>
      <View style={styles.ageRow}>
        <View style={styles.ageInput}><Text style={styles.ageLabel}>Min Age: {ageMin}</Text>
          <TextInput style={styles.textInput} keyboardType="number-pad" value={String(ageMin)} onChangeText={t => { const v = parseInt(t); if (!isNaN(v)) setAgeMin(v); }} /></View>
        <View style={styles.ageInput}><Text style={styles.ageLabel}>Max Age: {ageMax}</Text>
          <TextInput style={styles.textInput} keyboardType="number-pad" value={String(ageMax)} onChangeText={t => { const v = parseInt(t); if (!isNaN(v)) setAgeMax(v); }} /></View>
      </View>
    </View>
  );

  // Thorough-only steps
  const renderPersonality = () => (
    <View>
      <Text style={styles.stepTitle}>Your Personality</Text>

      <Text style={styles.label}>Social energy</Text>
      <SliderSelect value={socialEnergy} onChange={setSocialEnergy} labels={['Introvert', 'Extrovert']} />

      <Text style={styles.label}>Humor style (pick up to 2)</Text>
      <ChipSelect
        options={HUMOR_STYLES}
        selected={humorStyles}
        multi max={2}
        onToggle={(h) => toggle(humorStyles, h, setHumorStyles, 2)}
        showOther otherValue={customHumor} onOtherChange={setCustomHumor}
      />

      <Text style={styles.label}>How do you prefer to communicate?</Text>
      <ChipSelect
        options={COMMUNICATION_PREFS}
        selected={commPref ? [commPref] : []}
        onToggle={setCommPref}
        showOther otherValue={customCommPref} onOtherChange={setCustomCommPref}
      />

      <Text style={styles.label}>When there's conflict...</Text>
      <ChipSelect
        options={CONFLICT_STYLES}
        selected={conflictStyle ? [conflictStyle] : []}
        onToggle={setConflictStyle}
        showOther otherValue={customConflictStyle} onOtherChange={setCustomConflictStyle}
      />
    </View>
  );

  const renderLifestyle = () => (
    <View>
      <Text style={styles.stepTitle}>Lifestyle</Text>
      <Text style={styles.label}>Drinking</Text>
      <ChipSelect options={DRINKING_OPTIONS} selected={drinking ? [drinking] : []} onToggle={setDrinking} />
      <Text style={styles.label}>Smoking</Text>
      <ChipSelect options={SMOKING_OPTIONS} selected={smoking ? [smoking] : []} onToggle={setSmoking} />
      <Text style={styles.label}>Exercise</Text>
      <ChipSelect options={EXERCISE_OPTIONS} selected={exercise ? [exercise] : []} onToggle={setExercise} />
      <Text style={styles.label}>Diet</Text>
      <ChipSelect
        options={DIET_OPTIONS}
        selected={diet ? [diet] : []}
        onToggle={setDiet}
        showOther otherValue={customDiet} onOtherChange={setCustomDiet}
      />
      <Text style={styles.label}>Sleep schedule</Text>
      <ChipSelect options={SLEEP_OPTIONS} selected={sleepSchedule ? [sleepSchedule] : []} onToggle={setSleepSchedule} />
    </View>
  );

  const renderSocial = () => (
    <View>
      <Text style={styles.stepTitle}>In a Group...</Text>
      <Text style={styles.label}>I'm usually the one who... (pick 2)</Text>
      <ChipSelect
        options={GROUP_ROLES}
        selected={groupRoles}
        multi max={2}
        onToggle={(r) => toggle(groupRoles, r, setGroupRoles, 2)}
        showOther otherValue={customGroupRole} onOtherChange={setCustomGroupRole}
      />
      <Text style={styles.label}>My ideal group size</Text>
      <ChipSelect options={GROUP_SIZES} selected={idealGroupSize ? [idealGroupSize] : []} onToggle={setIdealGroupSize} />
    </View>
  );

  const renderDealbreakers = () => (
    <View>
      <Text style={styles.stepTitle}>Dealbreakers</Text>
      <Text style={styles.stepSub}>Select any that would be a hard no for you. These are private and used as hard filters in matching.</Text>
      <ChipSelect
        options={DEALBREAKERS}
        selected={dealbreakers}
        multi
        onToggle={(d) => toggle(dealbreakers, d, setDealbreakers)}
        showOther otherValue={customDealbreaker} onOtherChange={setCustomDealbreaker}
      />
      {dealbreakers.length === 0 && <Text style={styles.noneText}>None selected -- that's fine too!</Text>}
    </View>
  );

  const renderLocation = () => {

    const handleGetLocation = async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location access is needed to find groups near you.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocationLat(loc.coords.latitude);
        setLocationLng(loc.coords.longitude);
        // Reverse geocode to get address
        try {
          const addrs = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (addrs.length > 0) {
            const a = addrs[0];
            setLocationAddress([a.name, a.street, a.city, a.region].filter(Boolean).join(', '));
          }
        } catch {}
      } catch {
        Alert.alert('Location Error', 'Could not determine your location. Make sure GPS is enabled, or type your address manually below.');
      } finally {
        setLocationLoading(false);
      }
    };

    const handleAddressSearch = (text: string) => {
      setAddressQuery(text);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (text.trim().length < 3) { setSuggestions([]); return; }
      searchTimeout.current = setTimeout(async () => {
        setSearchingAddr(true);
        try {
          const results = await Location.geocodeAsync(text.trim());
          const mapped = await Promise.all(
            results.slice(0, 5).map(async (r) => {
              try {
                const addrs = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                const a = addrs[0];
                return { name: [a?.name, a?.street, a?.city, a?.region].filter(Boolean).join(', ') || text, lat: r.latitude, lng: r.longitude };
              } catch {
                return { name: `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`, lat: r.latitude, lng: r.longitude };
              }
            })
          );
          setSuggestions(mapped);
        } catch { setSuggestions([]); }
        finally { setSearchingAddr(false); }
      }, 500);
    };

    const selectSuggestion = (s: { name: string; lat: number; lng: number }) => {
      setLocationLat(s.lat);
      setLocationLng(s.lng);
      setLocationAddress(s.name);
      setAddressQuery('');
      setSuggestions([]);
    };

    return (
      <View>
        <Text style={styles.stepTitle}>Set Your Location</Text>
        <Text style={styles.stepSub}>
          We use your location to find groups near you. Your exact location is never shared with other users.
        </Text>

        {/* GPS button */}
        <TouchableOpacity style={styles.locationGpsBtn} onPress={handleGetLocation} disabled={locationLoading}>
          {locationLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.locationGpsBtnText}>📍 Use My Current Location</Text>
          )}
        </TouchableOpacity>

        {/* Address search with autocomplete */}
        <View style={styles.addressSearchContainer}>
          <TextInput
            style={styles.addressInput}
            placeholder="Search for an address..."
            placeholderTextColor={colors.grayLight}
            value={addressQuery}
            onChangeText={handleAddressSearch}
            returnKeyType="search"
          />
          {searchingAddr && <ActivityIndicator size="small" color={colors.primary} style={{ position: 'absolute', right: 12, top: 14 }} />}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSuggestion(s)}>
                <Text style={styles.suggestionIcon}>📍</Text>
                <Text style={styles.suggestionText} numberOfLines={1}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Location visual */}
        {locationLat && locationLng && !locationAddress && (
          <View style={styles.locationPinVisual}>
            <Text style={{ fontSize: 36 }}>📍</Text>
            <Text style={styles.locationPinCoords}>
              {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Location confirmation */}
        {locationLat && locationLng && locationAddress ? (
          <View style={styles.locationConfirmed}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationText}>Location set</Text>
              <Text style={{ fontSize: 12, color: colors.gray }}>{locationAddress}</Text>
            </View>
            <TouchableOpacity onPress={() => { setLocationLat(null); setLocationLng(null); setLocationAddress(''); }}>
              <Text style={styles.editText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Distance slider */}
        <Text style={[styles.label, { marginTop: 20 }]}>Maximum distance: {maxDistanceKm} km</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>5 km</Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${((maxDistanceKm - 5) / 195) * 100}%` }]} />
            <View
              style={[styles.sliderThumb, { left: `${((maxDistanceKm - 5) / 195) * 100}%` }]}
              {...(() => {
                // Use a simple touchable approach for the slider
                return {};
              })()}
            />
          </View>
          <Text style={styles.sliderLabel}>200 km</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {[5, 10, 15, 25, 50, 75, 100, 200].map(km => (
            <TouchableOpacity key={km}
              style={[styles.chip, { marginRight: 8 }, maxDistanceKm === km && styles.chipSelected]}
              onPress={() => setMaxDistanceKm(km)}>
              <Text style={[styles.chipText, maxDistanceKm === km && styles.chipTextSelected]}>{km} km</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular'];
  const STYLE_OPTIONS = ['Casual', 'Preppy', 'Streetwear', 'Artsy', 'Sporty', 'Minimal', 'Vintage', 'Elegant'];

  const renderAboutYou = () => (
    <View>
      <Text style={styles.stepTitle}>About You</Text>
      <Text style={styles.stepSub}>Optional — helps our AI find better matches for you.</Text>

      <Text style={styles.label}>Body type</Text>
      <ChipSelect options={BODY_TYPES} selected={bodyType ? [bodyType] : []} onToggle={setBodyType} />

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g. 175"
        keyboardType="number-pad"
        value={heightCm}
        onChangeText={setHeightCm}
        maxLength={3}
      />

      <Text style={styles.label}>Your style (pick up to 3)</Text>
      <ChipSelect options={STYLE_OPTIONS} selected={styleTags} multi max={3}
        onToggle={(s) => toggle(styleTags, s, setStyleTags, 3)} />
    </View>
  );

  const renderYourPrefs = () => (
    <View>
      <Text style={styles.stepTitle}>Your Preferences</Text>
      <Text style={styles.stepSub}>
        What are you looking for in others? 100% private — only used by our AI for matching.
      </Text>

      <Text style={styles.label}>Preferred body type (select all that apply)</Text>
      <ChipSelect options={[...BODY_TYPES, 'No preference']} selected={prefBodyType.length === 0 ? ['No preference'] : prefBodyType} multi
        onToggle={(b) => {
          if (b === 'No preference') { setPrefBodyType([]); return; }
          setPrefBodyType(prev => {
            const filtered = prev.filter(x => x !== 'No preference');
            return filtered.includes(b) ? filtered.filter(x => x !== b) : [...filtered, b];
          });
        }} />

      <Text style={styles.label}>Preferred social energy range</Text>
      <Text style={styles.stepSub}>Tap to select/deselect each level</Text>
      <View style={styles.distanceRow}>
        <Text style={{ color: colors.gray, fontSize: 12 }}>Introvert</Text>
        <View style={styles.sliderRow}>
          {[1, 2, 3, 4, 5].map(n => {
            const isSelected = prefSocialEnergyLevels.includes(n);
            return (
              <TouchableOpacity key={n} onPress={() => {
                setPrefSocialEnergyLevels(prev => {
                  if (prev.includes(n)) {
                    const next = prev.filter(x => x !== n);
                    return next.length === 0 ? [n] : next; // keep at least 1
                  }
                  return [...prev, n].sort();
                });
              }} style={[styles.sliderDot, isSelected && styles.sliderDotActive]}>
                <Text style={[styles.sliderDotText, isSelected && styles.sliderDotTextActive]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ color: colors.gray, fontSize: 12 }}>Extrovert</Text>
      </View>

      <Text style={styles.noneText}>All preferences are optional. Skip any you don't have.</Text>
    </View>
  );

  const renderVibesPrefs = () => (
    <View>
      {renderVibes()}
      <View style={{ marginTop: 24 }}>{renderPreferences()}</View>
    </View>
  );

  const renderStep = () => {
    switch (currentStepName) {
      case 'photos': return renderPhotos();
      case 'location': return renderLocation();
      case 'basics': return renderBasics();
      case 'interests': return renderInterests();
      case 'prompts': return renderPrompts();
      case 'vibes': return renderVibes();
      case 'preferences': return renderPreferences();
      case 'personality': return renderPersonality();
      case 'lifestyle': return renderLifestyle();
      case 'social': return renderSocial();
      case 'about_you': return renderAboutYou();
      case 'your_prefs': return renderYourPrefs();
      case 'dealbreakers': return renderDealbreakers();
      case 'vibes_prefs': return renderVibesPrefs();
      default: return null;
    }
  };

  const isLastStep = step === totalSteps - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Set Up Your Profile</Text>
        <View style={styles.progressRow}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.stepIndicator}>Step {step + 1} of {totalSteps}</Text>

        {renderStep()}

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
            <Text style={styles.secondaryBtnText}>{step === 0 ? 'Change Path' : 'Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.btnDisabled]}
            onPress={handleNext} disabled={!canProceed() || loading}>
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.primaryBtnText}>{isLastStep ? 'Complete Setup' : 'Next'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceElevated },
  content: { padding: 20, paddingBottom: 60 },
  pathContent: { paddingHorizontal: 24, paddingVertical: 40, flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: colors.surfaceElevated },
  header: { fontSize: 28, fontWeight: 'bold', color: colors.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.darkSecondary, marginBottom: 24 },
  stepIndicator: { fontSize: 13, color: colors.gray, marginBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.darkSecondary, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8, color: colors.dark },
  countText: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'right', marginBottom: 8 },
  noneText: { fontSize: 13, color: colors.gray, fontStyle: 'italic', marginTop: 8 },

  // Progress
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 4, marginTop: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },

  // Path selection
  pathCard: { backgroundColor: colors.surfaceElevated, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: colors.border },
  pathCardRecommended: { borderColor: colors.primary, backgroundColor: '#FFF5F7' },
  pathTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  pathTime: { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 8 },
  pathDesc: { fontSize: 14, color: colors.darkSecondary, lineHeight: 20 },
  pathBadge: { marginTop: 12, backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pathBadgePurple: { backgroundColor: '#F3E5F5' },
  pathBadgeText: { fontSize: 12, fontWeight: '600', color: colors.darkSecondary },
  recommendedBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  recommendedText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#f5f5f5' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.3 },
  chipText: { fontSize: 13, color: colors.dark },
  chipTextSelected: { color: '#fff' },
  chipOther: { borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF5F7' },
  chipRec: { borderColor: '#FFB74D', backgroundColor: '#FFF8E1' },
  chipRecText: { color: '#E65100' },

  // Other / Custom input
  otherInput: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#FFF5F7', marginTop: 8, marginBottom: 8 },

  // Search
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: colors.surfaceElevated, marginBottom: 12 },

  // Interest categories
  catSection: { marginBottom: 16 },
  catTitle: { fontSize: 15, fontWeight: '700', color: '#555', marginBottom: 8 },
  recSection: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFE082' },
  recTitle: { fontSize: 14, fontWeight: '700', color: '#E65100', marginBottom: 8 },

  // Slider
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  sliderDotActive: { backgroundColor: colors.primary },
  sliderDotText: { fontSize: 16, fontWeight: '600', color: colors.darkSecondary },
  sliderDotTextActive: { color: '#fff' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  // Intent
  intentCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  intentCardActive: { borderColor: colors.primary, backgroundColor: '#FFF5F7' },
  intentLabel: { fontSize: 16, fontWeight: '600', color: colors.dark },
  intentLabelActive: { color: colors.primary },
  intentDesc: { fontSize: 13, color: colors.gray, marginTop: 2 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoSlot: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 12, overflow: 'hidden' },
  photoFull: { flex: 1 },
  photoImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  analyzingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  analyzingText: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
  photoGuidelinesBox: { backgroundColor: colors.surfaceSelected, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.borderLight },
  photoGuidelinesTitle: { fontSize: 14, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  photoGuidelinesText: { fontSize: 13, color: colors.darkSecondary, lineHeight: 20 },
  emptySlot: { flex: 1, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  plusIcon: { fontSize: 32, color: colors.grayLight },
  reqLabel: { fontSize: 10, color: colors.gray, marginTop: 2 },
  uploadBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#FFF3E0', borderRadius: 8, marginBottom: 8 },
  uploadText: { fontSize: 13, color: '#E65100' },

  // Selfie
  selfieSection: { backgroundColor: '#F9F5FC', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E8DEF8' },
  selfieHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#4A148C' },
  verifiedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  selfieDesc: { fontSize: 14, color: colors.darkSecondary, lineHeight: 20, marginBottom: 14 },
  selfieBtn: { backgroundColor: '#6A1B9A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  selfieBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  selfieThumbLarge: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#E8DEF8' },
  // Verifying state
  verifyingContainer: { alignItems: 'center', paddingVertical: 12 },
  verifyingContent: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  verifyingText: { fontSize: 15, color: '#6A1B9A', fontWeight: '600' },
  verifySteps: { marginTop: 12, gap: 6 },
  verifyStep: { fontSize: 13, color: '#9E9E9E' },
  // Verified state
  verifiedContainer: { alignItems: 'center', paddingVertical: 8 },
  verifiedContent: { alignItems: 'center', marginTop: 10 },
  verifiedIcon: { fontSize: 28, color: colors.success, fontWeight: '700' },
  verifiedText: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginTop: 4 },
  verifiedSubtext: { fontSize: 13, color: colors.darkSecondary, marginTop: 2 },
  // Failed state
  failedContainer: { alignItems: 'center', paddingVertical: 8 },
  failedText: { fontSize: 14, color: '#C62828', textAlign: 'center', marginTop: 10, marginBottom: 12, lineHeight: 20 },
  retryBtn: { backgroundColor: '#6A1B9A', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Prompts
  promptCard: { backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promptQ: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4, flex: 1 },
  promptA: { fontSize: 15, color: colors.dark, marginBottom: 8 },
  removePromptBtn: { fontSize: 18, color: colors.gray, padding: 4 },
  promptOptionGroup: { marginBottom: 16 },
  promptOptionTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  promptCustomInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: colors.surfaceElevated, marginTop: 4 },
  textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: colors.surfaceElevated, marginBottom: 4 },
  charCount: { fontSize: 11, color: colors.gray, textAlign: 'right' },

  // Vibes
  vibeQ: { marginBottom: 18 },
  vibeText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  vibeOpts: { flexDirection: 'row', gap: 10 },
  vibeOpt: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  vibeOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vibeOptText: { fontSize: 13, color: colors.dark },
  vibeOptTextActive: { color: '#fff' },

  // Age
  ageRow: { flexDirection: 'row', gap: 16 },
  ageInput: { flex: 1 },
  ageLabel: { fontSize: 14, color: colors.darkSecondary, marginBottom: 4 },

  // Nav
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },

  // Location
  locationGpsBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  locationGpsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addressSearchContainer: { position: 'relative', marginBottom: 4 },
  addressInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', color: colors.dark },
  suggestionsContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  suggestionIcon: { fontSize: 16, marginRight: 10 },
  suggestionText: { fontSize: 14, color: colors.dark, flex: 1 },
  locationPinVisual: { alignItems: 'center', paddingVertical: 16, backgroundColor: colors.surfaceSelected, borderRadius: 12, marginVertical: 12 },
  locationPinCoords: { fontSize: 12, color: colors.gray, marginTop: 4 },
  locationConfirmed: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, marginBottom: 12 },
  locationIcon: { fontSize: 24 },
  locationText: { fontSize: 16, fontWeight: '600', color: '#2E7D32', flex: 1 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  sliderLabel: { fontSize: 12, color: colors.gray, width: 40 },
  sliderTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, position: 'relative' },
  sliderFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sliderThumb: { position: 'absolute', top: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff', marginLeft: -11, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  editText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  distanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
});
