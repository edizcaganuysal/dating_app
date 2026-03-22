import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, Image, ActionSheetIOS, Platform, Dimensions, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createProfile, uploadPhoto, selfieVerify } from '../api/profiles';
import { VibeAnswer } from '../types';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

// ── Constants ──────────────────────────────────────────────────────────────

const PROGRAMS = [
  'Computer Science', 'Engineering', 'Business', 'Economics', 'Psychology',
  'Biology', 'Pre-Med', 'Math', 'Physics', 'Chemistry', 'English', 'History',
  'Political Science', 'Sociology', 'Art', 'Music', 'Philosophy', 'Nursing',
  'Law', 'Architecture', 'Environmental Science', 'Other',
];

const INTERESTS = [
  'hiking', 'cooking', 'reading', 'gaming', 'photography', 'music',
  'travel', 'fitness', 'art', 'movies', 'dancing', 'coffee',
  'food', 'sports', 'yoga', 'volunteering', 'concerts', 'board games',
  'thrifting', 'podcasts', 'writing', 'fashion',
];

const HUMOR_STYLES = ['Sarcastic', 'Goofy', 'Dry', 'Dark', 'Wholesome', 'Witty'];
const COMMUNICATION_PREFS = ['Texter', 'Caller', 'In-person'];
const CONFLICT_STYLES = ['Talk it out immediately', 'Need space first', 'Avoid confrontation'];
const DRINKING_OPTIONS = ['Never', 'Socially', 'Regularly'];
const SMOKING_OPTIONS = ['Never', 'Socially', 'Regularly'];
const EXERCISE_OPTIONS = ['Never', 'Sometimes', 'Often', 'Daily'];
const DIET_OPTIONS = ['No restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Other'];
const SLEEP_OPTIONS = ['Early bird', 'Night owl', 'Depends on the day'];
const GROUP_ROLES = ['Starts conversations', 'Tells jokes', 'Listens quietly', 'Plans everything', 'Goes with the flow', 'Gets everyone hyped'];
const GROUP_SIZES = ['Intimate (3-4)', 'Medium (5-6)', 'The more the merrier'];
const DEALBREAKERS = ['Smoking', 'Heavy drinking', 'No sense of humor', 'Too quiet', 'Too loud', 'Different religion', 'Different politics', 'Long distance'];

const PROMPTS = [
  "I'm the friend who...",
  "My ideal date is...",
  "A perfect Sunday looks like...",
  "The way to my heart is...",
  "I geek out about...",
  "My most unpopular opinion is...",
  "I'll know it's real when...",
  "Two truths and a lie:",
];

const PROMPT_OPTIONS: Record<string, string[]> = {
  "I'm the friend who...": ["Always has a plan", "Makes everyone laugh", "Gives the best advice", "Is always down for anything", "Brings the snacks"],
  "My ideal date is...": ["Dinner and deep conversation", "Something adventurous outdoors", "Cozy movie night", "Exploring a new neighborhood", "Cooking together at home"],
  "A perfect Sunday looks like...": ["Brunch with friends", "Sleeping in and reading", "Hiking or sports", "Farmers market and coffee", "Binge-watching a series"],
  "The way to my heart is...": ["Making me laugh", "Thoughtful surprises", "Quality time together", "Good food", "Deep conversations"],
  "I geek out about...": ["Music and concerts", "Sports stats", "True crime podcasts", "Tech and startups", "History and culture"],
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
  const [path, setPath] = useState<'quick' | 'thorough' | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Shared state
  const [photos, setPhotos] = useState<(PhotoSlot | null)[]>([null, null, null, null, null, null]);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [program, setProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(2);
  const [intent, setIntent] = useState('open');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [customPromptText, setCustomPromptText] = useState('');
  const [vibeAnswers, setVibeAnswers] = useState<(string | null)[]>([null, null, null, null, null]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);

  // Thorough-only state
  const [socialEnergy, setSocialEnergy] = useState(3);
  const [humorStyles, setHumorStyles] = useState<string[]>([]);
  const [commPref, setCommPref] = useState('');
  const [conflictStyle, setConflictStyle] = useState('');
  const [drinking, setDrinking] = useState('');
  const [smoking, setSmoking] = useState('');
  const [exercise, setExercise] = useState('');
  const [diet, setDiet] = useState('');
  const [sleepSchedule, setSleepSchedule] = useState('');
  const [groupRoles, setGroupRoles] = useState<string[]>([]);
  const [idealGroupSize, setIdealGroupSize] = useState('');
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  const photoCount = photos.filter(p => p !== null).length;

  // ── Steps definition ──

  const quickSteps = ['photos', 'basics', 'interests', 'prompts', 'vibes', 'preferences'];
  const thoroughSteps = ['photos', 'basics', 'personality', 'lifestyle', 'social', 'interests', 'dealbreakers', 'prompts', 'vibes_prefs'];
  const steps = path === 'thorough' ? thoroughSteps : quickSteps;
  const totalSteps = steps.length;
  const currentStepName = steps[step] || '';

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
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
      }
      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          const { url } = await uploadPhoto(result.assets[0].uri);
          const updated = [...photos];
          updated[index] = { localUri: result.assets[0].uri, serverUrl: url };
          setPhotos(updated);
        } catch (e: any) { Alert.alert('Upload Failed', e?.response?.data?.detail || 'Could not upload.'); }
        finally { setUploading(false); }
      }
    } catch { Alert.alert('Error', 'Could not access photos.'); }
  };

  const showPhotoOptions = (index: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Gallery', 'Cancel'], cancelButtonIndex: 2 },
        (i) => { if (i === 0) pickImage(index, 'camera'); else if (i === 1) pickImage(index, 'gallery'); },
      );
    } else {
      Alert.alert('Add Photo', '', [
        { text: 'Take Photo', onPress: () => pickImage(index, 'camera') },
        { text: 'Choose from Gallery', onPress: () => pickImage(index, 'gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, cameraType: ImagePicker.CameraType.front, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        await selfieVerify(result.assets[0].uri);
        setSelfieVerified(true);
        setSelfieUri(result.assets[0].uri);
        Alert.alert('Submitted!', 'Your selfie is pending admin verification.');
      } catch (e: any) { Alert.alert('Failed', e?.response?.data?.detail || 'Could not verify.'); }
      finally { setUploading(false); }
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
    switch (currentStepName) {
      case 'photos': return photoCount >= 3;
      case 'basics': return program !== '' && intent !== '';
      case 'interests': return selectedInterests.length >= 1;
      case 'prompts': return selectedPrompts.length >= 2;
      case 'vibes': return vibeAnswers.every(a => a !== null);
      case 'preferences': return ageMin >= 18 && ageMax <= 99 && ageMin <= ageMax;
      case 'personality': return humorStyles.length >= 1 && commPref !== '' && conflictStyle !== '';
      case 'lifestyle': return drinking !== '' && smoking !== '' && exercise !== '';
      case 'social': return groupRoles.length >= 1 && idealGroupSize !== '';
      case 'dealbreakers': return true; // Optional
      case 'vibes_prefs': return vibeAnswers.every(a => a !== null) && ageMin >= 18 && ageMax <= 99;
      default: return false;
    }
  };

  // ── Submit ──

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const photoUrls = photos.filter(p => p !== null).map(p => p!.serverUrl);
      const vibes: VibeAnswer[] = VIBE_QUESTIONS.map((q, i) => ({ question: q.question, answer: vibeAnswers[i]! }));

      await createProfile({
        onboarding_path: path || 'quick',
        program,
        year_of_study: yearOfStudy,
        relationship_intent: intent,
        photo_urls: photoUrls,
        interests: selectedInterests,
        prompts: selectedPrompts,
        vibe_answers: vibes,
        age_range_min: ageMin,
        age_range_max: ageMax,
        ...(path === 'thorough' ? {
          social_energy: socialEnergy,
          humor_styles: humorStyles.map(h => h.toLowerCase()),
          communication_pref: commPref.toLowerCase().replace(/-/g, '_'),
          conflict_style: conflictStyle === 'Talk it out immediately' ? 'talk_immediately' : conflictStyle === 'Need space first' ? 'need_space' : 'avoid',
          drinking: drinking.toLowerCase(),
          smoking: smoking.toLowerCase(),
          exercise: exercise.toLowerCase(),
          diet: diet.toLowerCase().replace(/ /g, '_'),
          sleep_schedule: sleepSchedule === 'Early bird' ? 'early_bird' : sleepSchedule === 'Night owl' ? 'night_owl' : 'depends',
          group_role: groupRoles.map(r => r.toLowerCase().replace(/ /g, '_')),
          ideal_group_size: idealGroupSize.includes('3-4') ? 'intimate' : idealGroupSize.includes('5-6') ? 'medium' : 'large',
          dealbreakers: dealbreakers.map(d => d.toLowerCase().replace(/ /g, '_')),
        } : {}),
      });

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create profile');
    } finally { setLoading(false); }
  };

  // ── Path Selection ──

  if (path === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>How much time do you have?</Text>

        <TouchableOpacity style={styles.pathCard} onPress={() => { setPath('quick'); setStep(0); }}>
          <Text style={styles.pathTitle}>Quick Setup</Text>
          <Text style={styles.pathTime}>~2 minutes</Text>
          <Text style={styles.pathDesc}>Get started fast with the essentials. You can add more details later.</Text>
          <View style={styles.pathBadge}><Text style={styles.pathBadgeText}>6 steps</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.pathCard, styles.pathCardRecommended]} onPress={() => { setPath('thorough'); setStep(0); }}>
          <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>Recommended</Text></View>
          <Text style={styles.pathTitle}>Best Matches</Text>
          <Text style={styles.pathTime}>~4 minutes</Text>
          <Text style={styles.pathDesc}>More questions = better group chemistry. Tell us your personality, lifestyle, and what you're looking for.</Text>
          <View style={[styles.pathBadge, styles.pathBadgePurple]}><Text style={styles.pathBadgeText}>9 steps</Text></View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step Renderers ──

  const renderPhotos = () => (
    <View>
      <Text style={styles.stepTitle}>Add your photos</Text>
      <Text style={styles.stepSub}>{photoCount < 3 ? `Add at least ${3 - photoCount} more` : `${photoCount} photos added`}</Text>
      {uploading && <View style={styles.uploadBar}><ActivityIndicator size="small" color="#E91E63" /><Text style={styles.uploadText}>Uploading...</Text></View>}
      <View style={styles.photoGrid}>
        {photos.map((p, i) => (
          <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => p ? setPhotos(photos.map((ph, j) => j === i ? null : ph)) : showPhotoOptions(i)} disabled={uploading}>
            {p ? (
              <View style={styles.photoFull}>
                <Image source={{ uri: p.localUri }} style={styles.photoImg} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotos(photos.map((ph, j) => j === i ? null : ph))}><Text style={styles.removeTxt}>✕</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptySlot}><Text style={styles.plusIcon}>+</Text>{i < 3 && <Text style={styles.reqLabel}>Required</Text>}</View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.selfieSection}>
        <Text style={styles.sectionTitle}>Selfie Verification</Text>
        <Text style={styles.stepSub}>Prove your photos are really you. Reviewed by our team.</Text>
        {selfieVerified ? (
          <View style={styles.selfieRow}>
            {selfieUri && <Image source={{ uri: selfieUri }} style={styles.selfieThumb} />}
            <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending review</Text></View>
          </View>
        ) : (
          <TouchableOpacity style={styles.selfieBtn} onPress={handleSelfie} disabled={uploading}>
            <Text style={styles.selfieBtnText}>Take Selfie</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderBasics = () => (
    <View>
      <Text style={styles.stepTitle}>The Basics</Text>
      <Text style={styles.label}>Program</Text>
      <ChipSelect options={PROGRAMS} selected={program ? [program] : []} onToggle={setProgram} />
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
      <Text style={styles.stepSub}>Pick 3-8 things you're into</Text>
      <ChipSelect options={INTERESTS} selected={selectedInterests} multi max={8}
        onToggle={(i) => toggle(selectedInterests, i, setSelectedInterests, 8)} />
      <Text style={styles.countText}>{selectedInterests.length}/8 selected</Text>
    </View>
  );

  const renderPrompts = () => {
    const availablePrompts = PROMPTS.filter(p => !selectedPrompts.some(sp => sp.prompt === p));
    return (
      <View>
        <Text style={styles.stepTitle}>Show Your Personality</Text>
        <Text style={styles.stepSub}>Pick 2 prompts + write 1 of your own</Text>

        {selectedPrompts.map((sp, i) => (
          <View key={i} style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptQ}>{sp.prompt}</Text>
              <TouchableOpacity onPress={() => removePrompt(i)}><Text style={styles.removePromptBtn}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.promptA}>{sp.answer}</Text>
          </View>
        ))}

        {selectedPrompts.length < 2 && availablePrompts.length > 0 && (
          <View>
            <Text style={styles.label}>Choose a prompt:</Text>
            {availablePrompts.slice(0, 4).map(prompt => (
              <View key={prompt} style={styles.promptOptionGroup}>
                <Text style={styles.promptOptionTitle}>{prompt}</Text>
                {PROMPT_OPTIONS[prompt] ? (
                  <View style={styles.chipRow}>
                    {PROMPT_OPTIONS[prompt].map(ans => (
                      <TouchableOpacity key={ans} style={styles.chip} onPress={() => addPrompt(prompt, ans)}>
                        <Text style={styles.chipText}>{ans}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity style={styles.chip} onPress={() => addPrompt(prompt, '(tap to customize)')}>
                    <Text style={styles.chipText}>Select</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {selectedPrompts.length >= 2 && (
          <View style={styles.customPromptSection}>
            <Text style={styles.label}>Write your own (optional):</Text>
            <Text style={styles.promptQ}>Something people don't expect about me...</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Type something fun (max 100 chars)"
              value={customPromptText}
              onChangeText={t => setCustomPromptText(t.slice(0, 100))}
              maxLength={100}
            />
            <Text style={styles.charCount}>{customPromptText.length}/100</Text>
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
      <Text style={styles.stepSub}>This is private — only used for matching.</Text>
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
      <ChipSelect options={HUMOR_STYLES} selected={humorStyles} multi max={2} onToggle={(h) => toggle(humorStyles, h, setHumorStyles, 2)} />
      <Text style={styles.label}>How do you prefer to communicate?</Text>
      <ChipSelect options={COMMUNICATION_PREFS} selected={commPref ? [commPref] : []} onToggle={setCommPref} />
      <Text style={styles.label}>When there's conflict...</Text>
      <ChipSelect options={CONFLICT_STYLES} selected={conflictStyle ? [conflictStyle] : []} onToggle={setConflictStyle} />
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
      <ChipSelect options={DIET_OPTIONS} selected={diet ? [diet] : []} onToggle={setDiet} />
      <Text style={styles.label}>Sleep schedule</Text>
      <ChipSelect options={SLEEP_OPTIONS} selected={sleepSchedule ? [sleepSchedule] : []} onToggle={setSleepSchedule} />
    </View>
  );

  const renderSocial = () => (
    <View>
      <Text style={styles.stepTitle}>In a Group...</Text>
      <Text style={styles.label}>I'm usually the one who... (pick 2)</Text>
      <ChipSelect options={GROUP_ROLES} selected={groupRoles} multi max={2} onToggle={(r) => toggle(groupRoles, r, setGroupRoles, 2)} />
      <Text style={styles.label}>My ideal group size</Text>
      <ChipSelect options={GROUP_SIZES} selected={idealGroupSize ? [idealGroupSize] : []} onToggle={setIdealGroupSize} />
    </View>
  );

  const renderDealbreakers = () => (
    <View>
      <Text style={styles.stepTitle}>Dealbreakers</Text>
      <Text style={styles.stepSub}>Select any that would be a hard no for you. These are private and used as hard filters in matching.</Text>
      <ChipSelect options={DEALBREAKERS} selected={dealbreakers} multi onToggle={(d) => toggle(dealbreakers, d, setDealbreakers)} />
      {dealbreakers.length === 0 && <Text style={styles.noneText}>None selected — that's fine too!</Text>}
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
      case 'basics': return renderBasics();
      case 'interests': return renderInterests();
      case 'prompts': return renderPrompts();
      case 'vibes': return renderVibes();
      case 'preferences': return renderPreferences();
      case 'personality': return renderPersonality();
      case 'lifestyle': return renderLifestyle();
      case 'social': return renderSocial();
      case 'dealbreakers': return renderDealbreakers();
      case 'vibes_prefs': return renderVibesPrefs();
      default: return null;
    }
  };

  const isLastStep = step === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Add custom prompt if filled
      if (customPromptText.trim()) {
        const withCustom = [...selectedPrompts, { prompt: "Something people don't expect about me...", answer: customPromptText.trim() }];
        setSelectedPrompts(withCustom);
      }
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Set Up Your Profile</Text>
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>
      <Text style={styles.stepIndicator}>Step {step + 1} of {totalSteps}</Text>

      {renderStep()}

      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed() && styles.btnDisabled]}
          onPress={handleNext} disabled={!canProceed() || loading}>
          {loading ? <ActivityIndicator color="#fff" /> :
            <Text style={styles.primaryBtnText}>{isLastStep ? 'Complete Setup' : 'Next'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24 },
  stepIndicator: { fontSize: 13, color: '#999', marginBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#666', marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#333' },
  countText: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: -8 },
  noneText: { fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 8 },

  // Progress
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 4, marginTop: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#eee' },
  progressDotActive: { backgroundColor: '#E91E63' },

  // Path selection
  pathCard: { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#eee' },
  pathCardRecommended: { borderColor: '#E91E63', backgroundColor: '#FFF5F7' },
  pathTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  pathTime: { fontSize: 14, color: '#E91E63', fontWeight: '600', marginBottom: 8 },
  pathDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  pathBadge: { marginTop: 12, backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pathBadgePurple: { backgroundColor: '#F3E5F5' },
  pathBadgeText: { fontSize: 12, fontWeight: '600', color: '#666' },
  recommendedBadge: { backgroundColor: '#E91E63', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  recommendedText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  chipSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff' },

  // Slider
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  sliderDotActive: { backgroundColor: '#E91E63' },
  sliderDotText: { fontSize: 16, fontWeight: '600', color: '#666' },
  sliderDotTextActive: { color: '#fff' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 12, color: '#999' },

  // Intent
  intentCard: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 10 },
  intentCardActive: { borderColor: '#E91E63', backgroundColor: '#FFF5F7' },
  intentLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  intentLabelActive: { color: '#E91E63' },
  intentDesc: { fontSize: 13, color: '#888', marginTop: 2 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoSlot: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 12, overflow: 'hidden' },
  photoFull: { flex: 1 },
  photoImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptySlot: { flex: 1, borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  plusIcon: { fontSize: 32, color: '#ccc' },
  reqLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  uploadBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#FFF3E0', borderRadius: 8, marginBottom: 8 },
  uploadText: { fontSize: 13, color: '#E65100' },

  // Selfie
  selfieSection: { backgroundColor: '#F3E5F5', borderRadius: 12, padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#7B1FA2', marginBottom: 4 },
  selfieBtn: { backgroundColor: '#7B1FA2', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  selfieBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  selfieRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selfieThumb: { width: 50, height: 50, borderRadius: 25 },
  pendingBadge: { backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pendingText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Prompts
  promptCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promptQ: { fontSize: 14, fontWeight: '600', color: '#E91E63', marginBottom: 4 },
  promptA: { fontSize: 15, color: '#333' },
  removePromptBtn: { fontSize: 18, color: '#999', padding: 4 },
  promptOptionGroup: { marginBottom: 16 },
  promptOptionTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  customPromptSection: { marginTop: 16, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14 },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff', marginBottom: 4 },
  charCount: { fontSize: 11, color: '#999', textAlign: 'right' },

  // Vibes
  vibeQ: { marginBottom: 18 },
  vibeText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  vibeOpts: { flexDirection: 'row', gap: 10 },
  vibeOpt: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  vibeOptActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  vibeOptText: { fontSize: 13, color: '#333' },
  vibeOptTextActive: { color: '#fff' },

  // Age
  ageRow: { flexDirection: 'row', gap: 16 },
  ageInput: { flex: 1 },
  ageLabel: { fontSize: 14, color: '#666', marginBottom: 4 },

  // Nav
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#E91E63', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#E91E63', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: '#E91E63', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});
