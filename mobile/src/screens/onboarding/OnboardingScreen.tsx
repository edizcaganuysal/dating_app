/**
 * OnboardingScreen — Main controller for conversational onboarding.
 * Manages flow state, data, and orchestrates the conversation with Yuni AI.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createProfile } from '../../api/profiles';
import { verifyPhotosBatch } from '../../api/profiles';
import OnboardingChat, { ChatMessage } from './OnboardingChat';
import AnalyzingScreen from './AnalyzingScreen';
import OnboardingComplete from './OnboardingComplete';
import PhotosStep from './steps/PhotosStep';
import BasicsStep from './steps/BasicsStep';
import IntentStep from './steps/IntentStep';
import AgeRangeStep from './steps/AgeRangeStep';
import DealbreakersStep from './steps/DealbreakersStep';
import ValuesStep from './steps/ValuesStep';
import GroupVibeStep from './steps/GroupVibeStep';
import ActivitiesStep from './steps/ActivitiesStep';
import InterestsStep from './steps/InterestsStep';
import PromptsStep from './steps/PromptsStep';
import { colors, fontFamilies, spacing, radii } from '../../theme';
import {
  getReaction, programReactions, yearReactions, intentReactions,
  roleReactions, getRandomPhotoReaction, valueReactions,
  dealbreakersReactions, socialEnergyReactions,
  activityMilestones, interestMilestones, analyzingMessages,
} from '../../utils/yuniReactions';
import sounds from '../../utils/sounds';

// ── Flow phases ──
type Phase =
  | 'photos' | 'basics_program' | 'basics_year'
  | 'analyzing_1'
  | 'intent' | 'age_range' | 'dealbreakers'
  | 'analyzing_2'
  | 'values'
  | 'analyzing_3'
  | 'vibe_energy' | 'vibe_role'
  | 'activities' | 'interests'
  | 'prompts'
  | 'submitting' | 'complete';

interface PhotoSlot { localUri: string; serverUrl: string; }

// ── Personality traits derived from values ──
function deriveTraits(valuesVector: (number | null)[], socialEnergy: number, groupRole: string): string[] {
  const traits: string[] = [];
  if (valuesVector[3] === 0) traits.push('Adventurous');
  else if (valuesVector[3] === 1) traits.push('Grounded');
  if (valuesVector[1] === 1) traits.push('Open-Minded');
  else if (valuesVector[1] === 0) traits.push('Traditional');
  if (socialEnergy >= 4) traits.push('Social Butterfly');
  else if (socialEnergy <= 2) traits.push('Thoughtful');
  else traits.push('Balanced');
  return traits.slice(0, 3);
}

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  // ── Flow state ──
  const [phase, setPhase] = useState<Phase>('photos');
  const [loading, setLoading] = useState(false);

  // ── Data state (same as old ProfileSetupScreen) ──
  const [photos, setPhotos] = useState<(PhotoSlot | null)[]>([null, null, null, null, null, null]);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieStatus, setSelfieStatus] = useState<'none' | 'verifying' | 'verified' | 'failed'>('none');
  const [selfieMessage, setSelfieMessage] = useState('');
  const [selfieServerUrl, setSelfieServerUrl] = useState<string | null>(null);
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>({});

  const [program, setProgram] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(2);

  const [intent, setIntent] = useState('');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  const [valuesVector, setValuesVector] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [socialEnergy, setSocialEnergy] = useState(3);
  const [groupRole, setGroupRole] = useState('');

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [selectedPrompts, setSelectedPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [customPromptTexts, setCustomPromptTexts] = useState<Record<string, string>>({});

  // ── Chat messages for each phase ──
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const photoCount = photos.filter(p => p !== null).length;

  // ── Progress calculation ──
  const progress = useMemo(() => {
    const phases: Phase[] = [
      'photos', 'basics_program', 'basics_year', 'intent', 'age_range',
      'dealbreakers', 'values', 'vibe_energy', 'vibe_role',
      'activities', 'interests', 'prompts',
    ];
    const idx = phases.indexOf(phase);
    if (idx === -1) return 1;
    return (idx + 1) / phases.length;
  }, [phase]);

  // ── Add Yuni message to chat ──
  const addYuniMessage = useCallback((text: string, delay = 600) => {
    const msg: ChatMessage = {
      id: `yuni-${Date.now()}-${Math.random()}`,
      type: 'yuni',
      text,
      delay,
    };
    setChatHistory(prev => [...prev, msg]);
  }, []);

  const addUserChoice = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user-choice',
      text,
      delay: 0,
    };
    setChatHistory(prev => [...prev, msg]);
  }, []);

  // ── Phase-specific chat messages ──
  const getPhaseMessages = useCallback((): ChatMessage[] => {
    switch (phase) {
      case 'photos':
        return [
          { id: 'p1', type: 'yuni', text: "Hey! I'm Yuni, your matchmaker 🔥", delay: 300 },
          { id: 'p2', type: 'yuni', text: "Before we start — let's see who I'm working with!", delay: 800 },
          { id: 'p3', type: 'yuni', text: "Drop 3+ photos of yourself. I'll need them for your profile.", delay: 800 },
        ];
      case 'basics_program':
        return [
          { id: 'bp1', type: 'yuni', text: "Alright — quick round. What are you studying?", delay: 400 },
        ];
      case 'basics_year':
        return [
          { id: 'by1', type: 'yuni', text: "And what year are you in?", delay: 400 },
        ];
      case 'intent':
        return [
          { id: 'i1', type: 'yuni', text: "So... what are you hoping to find? No judgment 😌", delay: 400 },
        ];
      case 'age_range':
        return [
          { id: 'ar1', type: 'yuni', text: "What's your age range? (This stays private, promise 🤫)", delay: 400 },
        ];
      case 'dealbreakers':
        return [
          { id: 'd1', type: 'yuni', text: "Any absolute dealbreakers? Things that are a hard no?", delay: 400 },
        ];
      case 'values':
        return [
          { id: 'v1', type: 'yuni', text: "Now the fun part — let's talk about what you actually value", delay: 400 },
          { id: 'v2', type: 'yuni', text: "I'm going to give you two options. Tap the one that feels more YOU.", delay: 800 },
        ];
      case 'vibe_energy':
        return [
          { id: 've1', type: 'yuni', text: "Now — how do you vibe in a group?", delay: 400 },
          { id: 've2', type: 'yuni', text: "On a scale from wallflower to party starter...", delay: 600 },
        ];
      case 'vibe_role':
        return [
          { id: 'vr1', type: 'yuni', text: "And when you're in a group, you're usually the...", delay: 400 },
        ];
      case 'activities':
        return [
          { id: 'a1', type: 'yuni', text: "Okay now the really fun stuff — what do you love doing?", delay: 400 },
          { id: 'a2', type: 'yuni', text: "Pick at least 3 group date activities you'd be into", delay: 600 },
        ];
      case 'interests':
        return [
          { id: 'in1', type: 'yuni', text: "Great taste! Now let me know your interests", delay: 400 },
        ];
      case 'prompts':
        return [
          { id: 'pr1', type: 'yuni', text: "Last step! Let's give your future group a taste of your personality", delay: 400 },
          { id: 'pr2', type: 'yuni', text: "Pick 2-3 prompts and answer them — or write your own", delay: 600 },
        ];
      default:
        return [];
    }
  }, [phase]);

  // ── Validation for "Next" button ──
  const canProceed = useMemo((): boolean => {
    switch (phase) {
      case 'photos':
        return photoCount >= 3 && selfieStatus === 'verified' && Object.keys(uploadingSlots).length === 0;
      case 'basics_program':
        return program === 'Other' ? customProgram.trim() !== '' : program !== '';
      case 'basics_year':
        return true; // always valid
      case 'intent':
        return intent !== '';
      case 'age_range':
        return true;
      case 'dealbreakers':
        return true; // 0 dealbreakers is fine
      case 'values':
        return valuesVector.every(v => v !== null);
      case 'vibe_energy':
        return true;
      case 'vibe_role':
        return groupRole !== '';
      case 'activities':
        return selectedActivities.length >= 3;
      case 'interests':
        return selectedInterests.length >= 3;
      case 'prompts': {
        if (selectedPrompts.length < 2) return false;
        return selectedPrompts.every(sp =>
          sp.answer !== '__custom__' || (customPromptTexts[sp.prompt] || '').trim().length > 0,
        );
      }
      default:
        return false;
    }
  }, [phase, photoCount, selfieStatus, uploadingSlots, program, customProgram, intent,
    valuesVector, groupRole, selectedActivities, selectedInterests, selectedPrompts, customPromptTexts]);

  // ── Handle phase transitions ──
  const goNext = useCallback(async () => {
    const transitions: Record<Phase, Phase> = {
      'photos': 'basics_program',
      'basics_program': 'basics_year',
      'basics_year': 'analyzing_1',
      'analyzing_1': 'intent',
      'intent': 'age_range',
      'age_range': 'dealbreakers',
      'dealbreakers': 'analyzing_2',
      'analyzing_2': 'values',
      'values': 'analyzing_3',
      'analyzing_3': 'vibe_energy',
      'vibe_energy': 'vibe_role',
      'vibe_role': 'activities',
      'activities': 'interests',
      'interests': 'prompts',
      'prompts': 'submitting',
      'submitting': 'complete',
      'complete': 'complete',
    };

    // Special: photos need batch verification
    if (phase === 'photos') {
      try {
        const photoUrls = photos.filter(p => p !== null && p.serverUrl !== '').map(p => p!.serverUrl);
        if (selfieServerUrl) photoUrls.push(selfieServerUrl);
        await verifyPhotosBatch(photoUrls);
      } catch (e: any) {
        Alert.alert('Photo Verification Failed',
          e?.response?.data?.detail || 'Your photos could not be verified.');
        return;
      }
    }

    // Special: prompts → submit profile
    if (phase === 'prompts') {
      setPhase('submitting');
      await handleSubmit();
      return;
    }

    const next = transitions[phase];
    if (next) {
      setChatHistory([]);
      setPhase(next);
      sounds.whoosh();
    }
  }, [phase, photos, selfieServerUrl]);

  const goBack = useCallback(() => {
    const backMap: Record<Phase, Phase | 'logout'> = {
      'photos': 'logout',
      'basics_program': 'photos',
      'basics_year': 'basics_program',
      'intent': 'basics_year',
      'age_range': 'intent',
      'dealbreakers': 'age_range',
      'values': 'dealbreakers',
      'vibe_energy': 'values',
      'vibe_role': 'vibe_energy',
      'activities': 'vibe_role',
      'interests': 'activities',
      'prompts': 'interests',
      'analyzing_1': 'basics_year',
      'analyzing_2': 'dealbreakers',
      'analyzing_3': 'values',
      'submitting': 'prompts',
      'complete': 'complete',
    };
    const prev = backMap[phase];
    if (prev === 'logout') {
      Alert.alert('Leave Setup?', 'You will be logged out.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    } else if (prev) {
      setChatHistory([]);
      setPhase(prev);
    }
  }, [phase, logout]);

  // ── Submit profile ──
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const photoUrls = photos.filter(p => p !== null && p.serverUrl !== '').map(p => p!.serverUrl);
      const finalProgram = program === 'Other' ? customProgram.trim() : program;
      const finalPrompts = selectedPrompts.map(sp => {
        if (sp.answer === '__custom__') return { prompt: sp.prompt, answer: (customPromptTexts[sp.prompt] || '').trim() };
        return sp;
      });
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

      setPhase('complete');
    } catch (e: any) {
      let message = 'Failed to create profile.';
      if (e?.response?.data?.detail) {
        const detail = e.response.data.detail;
        message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
      Alert.alert('Profile Creation Failed', message);
      setPhase('prompts');
    } finally {
      setLoading(false);
    }
  };

  // ── Render analyzing interstitials ──
  if (phase === 'analyzing_1') {
    return (
      <AnalyzingScreen
        messages={["Analyzing your vibe...", "Almost there...", "Getting to know you..."]}
        insight="Okay, I'm getting a feel for you. Now the important stuff..."
        duration={2500}
        onComplete={() => { setChatHistory([]); setPhase('intent'); }}
      />
    );
  }

  if (phase === 'analyzing_2') {
    return (
      <AnalyzingScreen
        messages={["Processing your choices...", "Building your profile..."]}
        duration={2000}
        onComplete={() => { setChatHistory([]); setPhase('values'); }}
      />
    );
  }

  if (phase === 'analyzing_3') {
    const traits = deriveTraits(valuesVector, socialEnergy, groupRole);
    return (
      <AnalyzingScreen
        messages={["Building your personality map...", "Mapping your social wavelength...", "Done! Here's what I've got..."]}
        insight={traits.join(' • ')}
        duration={3000}
        onComplete={() => { setChatHistory([]); setPhase('vibe_energy'); }}
      />
    );
  }

  // ── Render complete screen ──
  if (phase === 'complete') {
    const finalProgram = program === 'Other' ? customProgram.trim() : program;
    const traits = deriveTraits(valuesVector, socialEnergy, groupRole);
    const firstPhoto = photos.find(p => p !== null)?.localUri;
    return (
      <OnboardingComplete
        userName={user?.first_name || 'You'}
        program={finalProgram}
        traits={traits}
        photoUri={firstPhoto}
        onContinue={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
      />
    );
  }

  // ── Render submitting state ──
  if (phase === 'submitting') {
    return (
      <AnalyzingScreen
        messages={["Creating your profile...", "Setting everything up...", "Almost ready!"]}
        duration={10000} // Will be interrupted by submit completion
        onComplete={() => {}} // handleSubmit manages transition
      />
    );
  }

  // ── Build chat messages ──
  const messages = [...getPhaseMessages(), ...chatHistory];

  // ── Render step content ──
  const renderStepContent = () => {
    switch (phase) {
      case 'photos':
        return (
          <PhotosStep
            photos={photos} setPhotos={setPhotos}
            selfieUri={selfieUri} setSelfieUri={setSelfieUri}
            selfieStatus={selfieStatus} setSelfieStatus={setSelfieStatus}
            selfieMessage={selfieMessage} setSelfieMessage={setSelfieMessage}
            selfieServerUrl={selfieServerUrl} setSelfieServerUrl={setSelfieServerUrl}
            uploadingSlots={uploadingSlots} setUploadingSlots={setUploadingSlots}
            onPhotoAdded={(count) => {
              if (count >= 3 && count <= 6) addYuniMessage(getRandomPhotoReaction(), 300);
            }}
            onSelfieVerified={() => addYuniMessage("That's you alright! ✨", 500)}
          />
        );
      case 'basics_program':
        return (
          <BasicsStep
            phase="program"
            program={program} setProgram={setProgram}
            customProgram={customProgram} setCustomProgram={setCustomProgram}
            yearOfStudy={yearOfStudy} setYearOfStudy={setYearOfStudy}
            onProgramSelected={(p) => {
              addUserChoice(p);
              addYuniMessage(getReaction(programReactions, p), 500);
            }}
            onYearSelected={() => {}}
          />
        );
      case 'basics_year':
        return (
          <BasicsStep
            phase="year"
            program={program} setProgram={setProgram}
            customProgram={customProgram} setCustomProgram={setCustomProgram}
            yearOfStudy={yearOfStudy} setYearOfStudy={setYearOfStudy}
            onProgramSelected={() => {}}
            onYearSelected={(y) => {
              addUserChoice(`Year ${y}`);
              addYuniMessage(getReaction(yearReactions, String(y)), 500);
            }}
          />
        );
      case 'intent':
        return (
          <IntentStep
            intent={intent} setIntent={setIntent}
            onSelected={(i) => {
              const label = i === 'serious' ? 'Something serious' : i === 'casual' ? 'Keeping it casual' : 'Open to anything';
              addUserChoice(label);
              addYuniMessage(getReaction(intentReactions, i), 500);
            }}
          />
        );
      case 'age_range':
        return <AgeRangeStep ageMin={ageMin} setAgeMin={setAgeMin} ageMax={ageMax} setAgeMax={setAgeMax} />;
      case 'dealbreakers':
        return (
          <DealbreakersStep
            dealbreakers={dealbreakers} setDealbreakers={setDealbreakers}
            onDone={() => {
              const reaction = dealbreakers.length === 0
                ? dealbreakersReactions.none
                : dealbreakersReactions.some;
              addYuniMessage(reaction, 300);
              setTimeout(() => goNext(), 1500);
            }}
          />
        );
      case 'values':
        return (
          <ValuesStep
            valuesVector={valuesVector} setValuesVector={setValuesVector}
            onValueSelected={(count) => {
              if (count === 3) addYuniMessage(valueReactions.halfway, 300);
              if (count === 6) {
                addYuniMessage(valueReactions.complete, 300);
                sounds.chime();
              }
            }}
          />
        );
      case 'vibe_energy':
        return (
          <GroupVibeStep
            phase="energy"
            socialEnergy={socialEnergy} setSocialEnergy={setSocialEnergy}
            groupRole={groupRole} setGroupRole={setGroupRole}
            onEnergySet={(e) => {
              const level = e <= 2 ? 'low' : e >= 4 ? 'high' : 'mid';
              addYuniMessage(socialEnergyReactions[level], 300);
              setTimeout(() => { setChatHistory([]); setPhase('vibe_role'); }, 1500);
            }}
            onRoleSelected={() => {}}
          />
        );
      case 'vibe_role':
        return (
          <GroupVibeStep
            phase="role"
            socialEnergy={socialEnergy} setSocialEnergy={setSocialEnergy}
            groupRole={groupRole} setGroupRole={setGroupRole}
            onEnergySet={() => {}}
            onRoleSelected={(r) => {
              addUserChoice(r);
              addYuniMessage(getReaction(roleReactions, r), 500);
            }}
          />
        );
      case 'activities':
        return (
          <ActivitiesStep
            selectedActivities={selectedActivities}
            setSelectedActivities={setSelectedActivities}
            onActivityToggled={(count) => {
              const milestone = activityMilestones[count];
              if (milestone) addYuniMessage(milestone, 300);
            }}
          />
        );
      case 'interests':
        return (
          <InterestsStep
            selectedInterests={selectedInterests}
            setSelectedInterests={setSelectedInterests}
            onInterestToggled={(count) => {
              const milestone = interestMilestones[count];
              if (milestone) addYuniMessage(milestone, 300);
            }}
          />
        );
      case 'prompts':
        return (
          <PromptsStep
            selectedPrompts={selectedPrompts}
            setSelectedPrompts={setSelectedPrompts}
            customPromptTexts={customPromptTexts}
            setCustomPromptTexts={setCustomPromptTexts}
            onPromptAdded={(count) => {
              if (count === 1) addYuniMessage("Nice answer! One more to go 💬", 300);
              if (count === 2) addYuniMessage("You're all set when you're ready! Tap finish whenever ✨", 300);
            }}
          />
        );
      default:
        return null;
    }
  };

  // ── Show "Next" for phases that don't auto-advance ──
  const showNextButton = !['dealbreakers', 'vibe_energy'].includes(phase);
  const nextLabel = phase === 'prompts' ? 'Finish ✨' : phase === 'photos' ? 'Photos done!' : 'Continue';

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Chat + step content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <OnboardingChat messages={messages}>
          {renderStepContent()}
        </OnboardingChat>
      </KeyboardAvoidingView>

      {/* Next button */}
      {showNextButton && canProceed && (
        <Animated.View entering={FadeInDown.springify()} style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={loading}
          >
            <Text style={styles.nextBtnText}>{nextLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  backText: {
    fontSize: 18, color: colors.dark,
    fontFamily: fontFamilies.inter.semiBold,
  },
  progressBar: {
    flex: 1, height: 6, backgroundColor: colors.border,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: radii.md,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 16, color: '#FFFFFF',
  },
});
