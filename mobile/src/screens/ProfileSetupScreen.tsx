import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, ActionSheetIOS, Platform, Dimensions, TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { createProfile, uploadPhoto, selfieVerify, verifyPhotosBatch } from '../api/profiles';
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

const ACTIVITIES = [
  'Escape Room', 'Cooking Class', 'Trivia', 'Hiking', 'Karaoke',
  'Bowling', 'Board Games', 'Mini Golf', 'Dinner', 'Bar',
];

const DEALBREAKERS = [
  'Smoking', 'Heavy drinking', 'Different religion', 'Long distance', 'Rude to others',
];

const VALUES_CARDS = [
  { left: 'Ambition', right: 'Work-life balance' },
  { left: 'Tradition', right: 'Open-mindedness' },
  { left: 'Independence', right: 'Togetherness' },
  { left: 'Adventure', right: 'Stability' },
  { left: 'Spontaneity', right: 'Planning' },
  { left: 'Brutal honesty', right: 'Kind diplomacy' },
];

const GROUP_ROLES = ['Catalyst', 'Entertainer', 'Listener', 'Planner', 'Flexible'];

const STEP_LABELS = ['Photos', 'Basics', 'Looking For', 'Values', 'Group Vibe', 'Activities', 'Prompts'];
const TOTAL_STEPS = 7;

// ── Interest System ──────────────────────────────────────────────────────

interface InterestCategory {
  name: string;
  emoji: string;
  interests: string[];
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: 'Sports & Fitness', emoji: '\u{1F4AA}',
    interests: ['Hiking', 'Running', 'Gym', 'Yoga', 'Swimming'],
  },
  {
    name: 'Music', emoji: '\u{1F3B5}',
    interests: ['Live Music', 'Concerts', 'K-Pop', 'Hip Hop', 'Indie'],
  },
  {
    name: 'Creative', emoji: '\u{1F3A8}',
    interests: ['Photography', 'Art', 'Writing', 'Filmmaking'],
  },
  {
    name: 'Food & Drink', emoji: '\u{1F355}',
    interests: ['Cooking', 'Baking', 'Coffee', 'Foodie'],
  },
  {
    name: 'Entertainment', emoji: '\u{1F3AC}',
    interests: ['Movies', 'TV Shows', 'Anime', 'Gaming', 'Board Games'],
  },
  {
    name: 'Outdoors & Travel', emoji: '\u{2708}\u{FE0F}',
    interests: ['Travel', 'Camping', 'Beach', 'Road Trips', 'Nature'],
  },
  {
    name: 'Social', emoji: '\u{1F389}',
    interests: ['Dancing', 'Volunteering', 'Festivals', 'House Parties'],
  },
  {
    name: 'Lifestyle', emoji: '\u{2728}',
    interests: ['Fashion', 'Thrifting', 'Meditation', 'Pets', 'Skincare'],
  },
  {
    name: 'Intellectual', emoji: '\u{1F9E0}',
    interests: ['Science', 'Philosophy', 'Languages', 'Technology', 'Psychology'],
  },
];

const RECOMMENDATIONS: Record<string, string[]> = {
  'Hiking': ['Camping', 'Nature', 'Travel', 'Photography'],
  'Running': ['Gym', 'Yoga', 'Swimming'],
  'Gym': ['Running', 'Yoga', 'Swimming'],
  'Yoga': ['Meditation', 'Gym', 'Hiking'],
  'Swimming': ['Beach', 'Running', 'Gym'],
  'Live Music': ['Concerts', 'Festivals', 'Dancing'],
  'Concerts': ['Live Music', 'Festivals', 'Dancing'],
  'K-Pop': ['Dancing', 'Anime', 'Fashion'],
  'Hip Hop': ['Dancing', 'Concerts', 'Fashion'],
  'Indie': ['Live Music', 'Concerts', 'Photography'],
  'Photography': ['Art', 'Travel', 'Nature', 'Filmmaking'],
  'Art': ['Photography', 'Writing', 'Filmmaking'],
  'Writing': ['Philosophy', 'Psychology'],
  'Filmmaking': ['Photography', 'Art', 'Movies'],
  'Cooking': ['Baking', 'Foodie', 'Coffee'],
  'Baking': ['Cooking', 'Coffee', 'Foodie'],
  'Coffee': ['Baking', 'Cooking', 'Foodie'],
  'Foodie': ['Cooking', 'Travel', 'Coffee'],
  'Movies': ['TV Shows', 'Anime', 'Filmmaking'],
  'TV Shows': ['Movies', 'Anime', 'Gaming'],
  'Anime': ['Gaming', 'K-Pop', 'Movies'],
  'Gaming': ['Anime', 'Board Games', 'Technology'],
  'Board Games': ['Gaming', 'House Parties'],
  'Travel': ['Camping', 'Beach', 'Road Trips', 'Photography'],
  'Camping': ['Hiking', 'Nature', 'Travel'],
  'Beach': ['Swimming', 'Travel', 'Road Trips'],
  'Road Trips': ['Travel', 'Camping', 'Beach'],
  'Nature': ['Hiking', 'Camping', 'Photography'],
  'Dancing': ['Live Music', 'Festivals', 'K-Pop', 'Hip Hop'],
  'Volunteering': ['Psychology', 'Science'],
  'Festivals': ['Live Music', 'Concerts', 'Dancing', 'Travel'],
  'House Parties': ['Board Games', 'Dancing'],
  'Fashion': ['Thrifting', 'Photography'],
  'Thrifting': ['Fashion'],
  'Meditation': ['Yoga', 'Psychology'],
  'Pets': ['Nature', 'Hiking'],
  'Skincare': ['Fashion', 'Meditation'],
  'Science': ['Technology', 'Philosophy', 'Psychology'],
  'Philosophy': ['Psychology', 'Writing', 'Science'],
  'Languages': ['Travel', 'Technology'],
  'Technology': ['Science', 'Gaming'],
  'Psychology': ['Philosophy', 'Science', 'Writing'],
};

// ── Prompts ──────────────────────────────────────────────────────────────

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

interface PhotoSlot { localUri: string; serverUrl: string; }

// ── Helper Components ──────────────────────────────────────────────────────

function ChipSelect({ options, selected, onToggle, multi = false, max }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean; max?: number;
}) {
  return (
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
  const { logout } = useAuth();

  // Navigation
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Photos
  const [photos, setPhotos] = useState<(PhotoSlot | null)[]>([null, null, null, null, null, null]);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieStatus, setSelfieStatus] = useState<'none' | 'verifying' | 'verified' | 'failed'>('none');
  const [selfieMessage, setSelfieMessage] = useState('');
  const [selfieServerUrl, setSelfieServerUrl] = useState<string | null>(null);
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>({});
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState('');

  // Step 2 — Basics
  const [program, setProgram] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(2);

  // Step 3 — Looking For
  const [intent, setIntent] = useState('');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  // Step 4 — Values
  const [valuesVector, setValuesVector] = useState<(number | null)[]>([null, null, null, null, null, null]);

  // Step 5 — Group Vibe
  const [socialEnergy, setSocialEnergy] = useState(3);
  const [groupRole, setGroupRole] = useState('');

  // Step 6 — Activities & Interests
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');

  // Step 7 — Prompts
  const [selectedPrompts, setSelectedPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [customPromptTexts, setCustomPromptTexts] = useState<Record<string, string>>({});

  const photoCount = photos.filter(p => p !== null).length;

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
    return Array.from(recs).slice(0, 8);
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
        setPhotos(prev => { const u = [...prev]; u[index] = { localUri, serverUrl: '' }; return u; });
        setUploadingSlots(prev => ({ ...prev, [index]: true }));
        const existingUrls = photos
          .filter((p, idx) => p !== null && p.serverUrl !== '' && idx !== index)
          .map(p => p!.serverUrl);
        if (selfieServerUrl) {
          existingUrls.push(selfieServerUrl);
        }
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
            setSelfieMessage('Identity verified!');
            setSelfieServerUrl(response.selfie_url || null);
          } else {
            setSelfieStatus('failed');
            setSelfieMessage(response.message || "Your selfie doesn't match your profile photos. Make sure your face is clearly visible, well-lit, and without filters.");
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

  // ── Validation ──

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return photoCount >= 3 && selfieStatus === 'verified' && Object.keys(uploadingSlots).length === 0;
      case 1: return (program === 'Other' ? customProgram.trim() !== '' : program !== '');
      case 2: return intent !== '';
      case 3: return valuesVector.every(v => v !== null);
      case 4: return groupRole !== '';
      case 5: return selectedActivities.length >= 3 && selectedInterests.length >= 3;
      case 6: {
        if (selectedPrompts.length < 2) return false;
        return selectedPrompts.every(sp =>
          sp.answer !== '__custom__' || (customPromptTexts[sp.prompt] || '').trim().length > 0,
        );
      }
      default: return false;
    }
  };

  // ── Submit ──

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const photoUrls = photos.filter(p => p !== null && p.serverUrl !== '').map(p => p!.serverUrl);
      const finalProgram = program === 'Other' ? customProgram.trim() : program;

      const finalPrompts = selectedPrompts.map(sp => {
        if (sp.answer === '__custom__') {
          return { prompt: sp.prompt, answer: (customPromptTexts[sp.prompt] || '').trim() };
        }
        return sp;
      });

      // Combine activities and interests, deduplicate
      const allInterests = new Set([
        ...selectedActivities.map(a => a.toLowerCase()),
        ...selectedInterests.map(i => i.toLowerCase()),
      ]);

      await createProfile({
        program: finalProgram,
        year_of_study: yearOfStudy,
        relationship_intent: intent,
        photo_urls: photoUrls,
        interests: Array.from(allInterests),
        prompts: finalPrompts,
        vibe_answers: [],
        age_range_min: ageMin,
        age_range_max: ageMax,
        values_vector: valuesVector.map(v => v ?? 0),
        social_energy: socialEnergy,
        group_role: [groupRole.toLowerCase()],
        dealbreakers: dealbreakers.map(d => d.toLowerCase().replace(/ /g, '_')),
      });

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      let message = 'Failed to create profile.';
      if (e?.response?.data?.detail) {
        const detail = e.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
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
      Alert.alert('Leave Setup?', 'You will be logged out.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const handleNext = async () => {
    // Photo step special validation
    if (step === 0) {
      const completedPhotos = photos.filter(p => p !== null && p.serverUrl !== '');
      const anyUploading = Object.keys(uploadingSlots).length > 0;
      if (anyUploading) { Alert.alert('Please wait', 'Some photos are still being verified.'); return; }
      if (completedPhotos.length < 3) { Alert.alert('More photos needed', 'Please upload at least 3 photos of yourself.'); return; }
      if (selfieStatus !== 'verified') { Alert.alert('Selfie required', 'Please complete selfie verification before continuing.'); return; }

      // Batch verify all photos + selfie
      setAnalyzingPhotos(true);
      setAnalyzingMessage('Checking all photos match...');
      try {
        const photoUrls = completedPhotos.map(p => p!.serverUrl);
        if (selfieServerUrl) photoUrls.push(selfieServerUrl);
        await verifyPhotosBatch(photoUrls);
        setAnalyzingMessage('Photos verified!');
        await new Promise(r => setTimeout(r, 500));
        setAnalyzingPhotos(false);
      } catch (e: any) {
        setAnalyzingPhotos(false);
        const detail = e?.response?.data?.detail || 'Your photos could not be verified. Make sure all photos and your selfie show the same person.';
        Alert.alert('Photo Verification Failed', detail);
        return;
      }
    }

    if (step >= TOTAL_STEPS - 1) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  // ── Step Renderers ──────────────────────────────────────────────────────

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
                    <Text style={styles.analyzingText}>Scanning...</Text>
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

      {photoCount >= 3 && (
      <View style={styles.selfieSection}>
        <View style={styles.selfieHeader}>
          <Text style={styles.sectionTitle}>Selfie Verification</Text>
          {selfieStatus === 'verified' && <View style={styles.verifiedDot} />}
        </View>

        {selfieStatus === 'none' && (
          <>
            <Text style={styles.selfieDesc}>
              Take a quick selfie so we can confirm your photos are really you. No filters, no editing — just you!
            </Text>
            <TouchableOpacity style={styles.selfieBtn} onPress={handleSelfiePhoto}>
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
              <Text style={styles.verifiedIcon}>{'\u2713'}</Text>
              <Text style={styles.verifiedText}>Identity verified!</Text>
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
      )}

      {analyzingPhotos && (
        <View style={styles.analyzingFullOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzingFullText}>{analyzingMessage}</Text>
        </View>
      )}
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
    </View>
  );

  const renderLookingFor = () => (
    <View>
      <Text style={styles.stepTitle}>What Are You Looking For?</Text>

      <Text style={styles.label}>Relationship intent</Text>
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

      <Text style={styles.label}>Age range</Text>
      <Text style={styles.stepSub}>This is private — only used for matching.</Text>
      <Text style={styles.ageRangeDisplay}>{ageMin} — {ageMax}</Text>
      <Text style={styles.sliderRangeLabel}>Min: {ageMin}</Text>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={18}
        maximumValue={35}
        step={1}
        value={ageMin}
        onValueChange={(v: number) => { const val = Math.round(v); setAgeMin(Math.min(val, ageMax)); }}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
      <Text style={styles.sliderRangeLabel}>Max: {ageMax}</Text>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={18}
        maximumValue={35}
        step={1}
        value={ageMax}
        onValueChange={(v: number) => { const val = Math.round(v); setAgeMax(Math.max(val, ageMin)); }}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      <Text style={styles.label}>Dealbreakers</Text>
      <Text style={styles.stepSub}>Select up to 3 hard filters. These are private.</Text>
      <Text style={styles.countText}>{dealbreakers.length}/3 selected</Text>
      <ChipSelect
        options={DEALBREAKERS}
        selected={dealbreakers}
        multi
        max={3}
        onToggle={(d) => toggle(dealbreakers, d, setDealbreakers, 3)}
      />
      {dealbreakers.length === 0 && <Text style={styles.noneText}>None selected — that's fine too!</Text>}
    </View>
  );

  const renderValues = () => {
    const answeredCount = valuesVector.filter(v => v !== null).length;
    return (
      <View>
        <Text style={styles.stepTitle}>Your Values</Text>
        <Text style={styles.stepSub}>Tap the side that resonates more with you.</Text>
        <Text style={styles.countText}>{answeredCount}/6 answered</Text>

        {VALUES_CARDS.map((card, i) => (
          <View key={i} style={styles.valueCard}>
            <Text style={styles.valueCardNumber}>{i + 1}</Text>
            <View style={styles.valueOptions}>
              <TouchableOpacity
                style={[styles.valueOption, valuesVector[i] === 0 && styles.valueOptionActive]}
                onPress={() => { const v = [...valuesVector]; v[i] = 0; setValuesVector(v); }}>
                <Text style={[styles.valueOptionText, valuesVector[i] === 0 && styles.valueOptionTextActive]}>
                  {card.left}
                </Text>
              </TouchableOpacity>
              <Text style={styles.valueVs}>or</Text>
              <TouchableOpacity
                style={[styles.valueOption, valuesVector[i] === 1 && styles.valueOptionActive]}
                onPress={() => { const v = [...valuesVector]; v[i] = 1; setValuesVector(v); }}>
                <Text style={[styles.valueOptionText, valuesVector[i] === 1 && styles.valueOptionTextActive]}>
                  {card.right}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGroupVibe = () => (
    <View>
      <Text style={styles.stepTitle}>Group Vibe</Text>
      <Text style={styles.stepSub}>Help us find the right group energy for you.</Text>

      <Text style={styles.label}>Social energy</Text>
      <SliderSelect value={socialEnergy} onChange={setSocialEnergy} labels={['Quiet observer', 'Life of the party']} />

      <Text style={[styles.label, { marginTop: 24 }]}>Your role in a group</Text>
      {GROUP_ROLES.map(role => (
        <TouchableOpacity key={role}
          style={[styles.radioOption, groupRole === role && styles.radioOptionActive]}
          onPress={() => setGroupRole(role)}>
          <View style={[styles.radioCircle, groupRole === role && styles.radioCircleActive]}>
            {groupRole === role && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.radioText, groupRole === role && styles.radioTextActive]}>{role}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderActivitiesInterests = () => (
    <View>
      <Text style={styles.stepTitle}>Activities & Interests</Text>

      <Text style={styles.label}>Group date activities</Text>
      <Text style={styles.stepSub}>Pick 3+ activities you'd enjoy on a group date.</Text>
      <Text style={styles.countText}>{selectedActivities.length} selected (min 3)</Text>
      <ChipSelect
        options={ACTIVITIES}
        selected={selectedActivities}
        multi
        onToggle={(a) => toggle(selectedActivities, a, setSelectedActivities)}
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Your interests</Text>
      <Text style={styles.stepSub}>Pick 3-10 things you love.</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search interests..."
        value={interestSearch}
        onChangeText={setInterestSearch}
      />

      <Text style={styles.countText}>{selectedInterests.length}/10 selected</Text>

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

  // ── Render Step ──

  const renderStep = () => {
    switch (step) {
      case 0: return renderPhotos();
      case 1: return renderBasics();
      case 2: return renderLookingFor();
      case 3: return renderValues();
      case 4: return renderGroupVibe();
      case 5: return renderActivitiesInterests();
      case 6: return renderPrompts();
      default: return null;
    }
  };

  const isLastStep = step >= TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        <Text style={styles.stepIndicator}>
          Step {step + 1} of {TOTAL_STEPS} — {STEP_LABELS[step]}
        </Text>

        {renderStep()}

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
            <Text style={styles.secondaryBtnText}>{step === 0 ? 'Log Out' : 'Back'}</Text>
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
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
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

  // Slider (dot-based)
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  sliderDotActive: { backgroundColor: colors.primary },
  sliderDotText: { fontSize: 16, fontWeight: '600', color: colors.darkSecondary },
  sliderDotTextActive: { color: '#fff' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 12, color: colors.gray },

  // Intent cards
  intentCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  intentCardActive: { borderColor: colors.primary, backgroundColor: '#FFF5F7' },
  intentLabel: { fontSize: 16, fontWeight: '600', color: colors.dark },
  intentLabelActive: { color: colors.primary },
  intentDesc: { fontSize: 13, color: colors.gray, marginTop: 2 },

  // Age range
  ageRangeDisplay: { fontSize: 28, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: 8 },
  sliderRangeLabel: { fontSize: 13, color: colors.darkSecondary, fontWeight: '600', marginTop: 4 },

  // Values cards
  valueCard: { backgroundColor: colors.surfaceSelected, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  valueCardNumber: { fontSize: 12, fontWeight: '700', color: colors.gray, marginBottom: 10, textAlign: 'center' },
  valueOptions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueOption: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surfaceElevated },
  valueOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  valueOptionText: { fontSize: 14, fontWeight: '600', color: colors.dark, textAlign: 'center' },
  valueOptionTextActive: { color: '#fff' },
  valueVs: { fontSize: 12, color: colors.grayLight, fontWeight: '600' },

  // Radio buttons (group role)
  radioOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.surfaceElevated },
  radioOptionActive: { borderColor: colors.primary, backgroundColor: '#FFF5F7' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioCircleActive: { borderColor: colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  radioText: { fontSize: 16, fontWeight: '500', color: colors.dark },
  radioTextActive: { color: colors.primary, fontWeight: '600' },

  // Divider
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoSlot: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 12, overflow: 'hidden' },
  photoFull: { flex: 1 },
  photoImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  analyzingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  analyzingText: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
  analyzingFullOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', zIndex: 100, borderRadius: 12 },
  analyzingFullText: { fontSize: 16, fontWeight: '600', color: colors.dark, marginTop: 16, textAlign: 'center' },
  photoGuidelinesBox: { backgroundColor: colors.surfaceSelected, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.borderLight },
  photoGuidelinesTitle: { fontSize: 14, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  photoGuidelinesText: { fontSize: 13, color: colors.darkSecondary, lineHeight: 20 },
  emptySlot: { flex: 1, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  plusIcon: { fontSize: 32, color: colors.grayLight },
  reqLabel: { fontSize: 10, color: colors.gray, marginTop: 2 },

  // Selfie
  selfieSection: { backgroundColor: '#F9F5FC', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E8DEF8' },
  selfieHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#4A148C' },
  verifiedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  selfieDesc: { fontSize: 14, color: colors.darkSecondary, lineHeight: 20, marginBottom: 14 },
  selfieBtn: { backgroundColor: '#6A1B9A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  selfieBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  selfieThumbLarge: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#E8DEF8' },
  verifyingContainer: { alignItems: 'center', paddingVertical: 12 },
  verifyingContent: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  verifyingText: { fontSize: 15, color: '#6A1B9A', fontWeight: '600' },
  verifySteps: { marginTop: 12, gap: 6 },
  verifyStep: { fontSize: 13, color: '#9E9E9E' },
  verifiedContainer: { alignItems: 'center', paddingVertical: 8 },
  verifiedContent: { alignItems: 'center', marginTop: 10 },
  verifiedIcon: { fontSize: 28, color: colors.success, fontWeight: '700' },
  verifiedText: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginTop: 4 },
  verifiedSubtext: { fontSize: 13, color: colors.darkSecondary, marginTop: 2 },
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

  // Nav
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});
