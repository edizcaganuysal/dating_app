import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createProfile } from '../api/profiles';
import { selfieVerify } from '../api/profiles';
import { VibeAnswer } from '../types';

const INTERESTS = [
  'hiking', 'cooking', 'reading', 'gaming', 'photography', 'music',
  'travel', 'fitness', 'art', 'movies', 'dancing', 'coffee',
  'food', 'sports', 'yoga', 'volunteering',
];

const VIBE_QUESTIONS: { question: string; optionA: string; optionB: string }[] = [
  { question: 'Friday night: house party or cozy bar?', optionA: 'House party', optionB: 'Cozy bar' },
  { question: 'Pineapple on pizza: yes or no?', optionA: 'Yes', optionB: 'No' },
  { question: 'Road trip or beach vacation?', optionA: 'Road trip', optionB: 'Beach vacation' },
  { question: 'Early bird or night owl?', optionA: 'Early bird', optionB: 'Night owl' },
  { question: 'Cook at home or eat out?', optionA: 'Cook at home', optionB: 'Eat out' },
];

const YEARS = [1, 2, 3, 4, 5, 6];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Photos
  const [photoUrls, setPhotoUrls] = useState<string[]>(['', '', '', '', '', '']);

  // Step 2: About You
  const [program, setProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [bio, setBio] = useState('');

  // Step 3: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 4: Vibe Check
  const [vibeAnswers, setVibeAnswers] = useState<(string | null)[]>([null, null, null, null, null]);

  // Step 5: Preferences
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(25);

  const updatePhoto = (index: number, url: string) => {
    const updated = [...photoUrls];
    updated[index] = url;
    setPhotoUrls(updated);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const setVibeAnswer = (index: number, answer: string) => {
    const updated = [...vibeAnswers];
    updated[index] = answer;
    setVibeAnswers(updated);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return photoUrls.filter(u => u.trim() !== '').length >= 3;
      case 2:
        return program.trim() !== '' && bio.trim() !== '';
      case 3:
        return selectedInterests.length >= 1;
      case 4:
        return vibeAnswers.every(a => a !== null);
      case 5:
        return ageMin >= 18 && ageMax <= 30 && ageMin <= ageMax;
      default:
        return false;
    }
  };

  const handleSelfieVerify = async () => {
    try {
      await selfieVerify();
      Alert.alert('Success', 'Selfie verified!');
    } catch {
      Alert.alert('Error', 'Selfie verification failed');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const photos = photoUrls.filter(u => u.trim() !== '');
      const vibes: VibeAnswer[] = VIBE_QUESTIONS.map((q, i) => ({
        question: q.question,
        answer: vibeAnswers[i]!,
      }));

      await createProfile({
        bio,
        program,
        year_of_study: yearOfStudy,
        photo_urls: photos,
        interests: selectedInterests,
        vibe_answers: vibes,
        age_range_min: ageMin,
        age_range_max: ageMax,
      });

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Add at least 3 photos</Text>
      <Text style={styles.stepSubtitle}>Enter photo URLs (3 required, 3 optional)</Text>
      {photoUrls.map((url, i) => (
        <TextInput
          key={i}
          testID={`photo-input-${i}`}
          style={styles.input}
          placeholder={`Photo ${i + 1} URL${i < 3 ? ' (required)' : ' (optional)'}`}
          value={url}
          onChangeText={text => updatePhoto(i, text)}
          autoCapitalize="none"
        />
      ))}
      <TouchableOpacity style={styles.secondaryButton} onPress={handleSelfieVerify}>
        <Text style={styles.secondaryButtonText}>Selfie Verify</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>About You</Text>
      <TextInput
        testID="program-input"
        style={styles.input}
        placeholder="Program (e.g., Computer Science)"
        value={program}
        onChangeText={setProgram}
      />
      <Text style={styles.label}>Year of Study</Text>
      <View style={styles.chipRow}>
        {YEARS.map(y => (
          <TouchableOpacity
            key={y}
            testID={`year-${y}`}
            style={[styles.chip, yearOfStudy === y && styles.chipSelected]}
            onPress={() => setYearOfStudy(y)}
          >
            <Text style={[styles.chipText, yearOfStudy === y && styles.chipTextSelected]}>
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        testID="bio-input"
        style={[styles.input, styles.textArea]}
        placeholder="Tell us about yourself (max 500 chars)"
        value={bio}
        onChangeText={text => setBio(text.slice(0, 500))}
        multiline
        numberOfLines={4}
      />
      <Text style={styles.charCount}>{bio.length}/500</Text>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepSubtitle}>Select at least 1</Text>
      <View style={styles.chipRow}>
        {INTERESTS.map(interest => (
          <TouchableOpacity
            key={interest}
            testID={`interest-${interest}`}
            style={[styles.chip, selectedInterests.includes(interest) && styles.chipSelected]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[styles.chipText, selectedInterests.includes(interest) && styles.chipTextSelected]}>
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Vibe Check</Text>
      {VIBE_QUESTIONS.map((q, i) => (
        <View key={i} style={styles.vibeQuestion}>
          <Text style={styles.vibeText}>{q.question}</Text>
          <View style={styles.vibeOptions}>
            <TouchableOpacity
              testID={`vibe-${i}-a`}
              style={[styles.vibeOption, vibeAnswers[i] === q.optionA && styles.vibeOptionSelected]}
              onPress={() => setVibeAnswer(i, q.optionA)}
            >
              <Text style={[styles.vibeOptionText, vibeAnswers[i] === q.optionA && styles.vibeOptionTextSelected]}>
                {q.optionA}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID={`vibe-${i}-b`}
              style={[styles.vibeOption, vibeAnswers[i] === q.optionB && styles.vibeOptionSelected]}
              onPress={() => setVibeAnswer(i, q.optionB)}
            >
              <Text style={[styles.vibeOptionText, vibeAnswers[i] === q.optionB && styles.vibeOptionTextSelected]}>
                {q.optionB}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.stepTitle}>Preferences</Text>
      <Text style={styles.stepSubtitle}>This is private and only used for matching.</Text>
      <Text style={styles.label}>Age Range</Text>
      <View style={styles.ageRow}>
        <View style={styles.ageInput}>
          <Text style={styles.ageLabel}>Min</Text>
          <TextInput
            testID="age-min-input"
            style={styles.input}
            keyboardType="number-pad"
            value={String(ageMin)}
            onChangeText={text => {
              const val = parseInt(text, 10);
              if (!isNaN(val)) setAgeMin(val);
            }}
          />
        </View>
        <View style={styles.ageInput}>
          <Text style={styles.ageLabel}>Max</Text>
          <TextInput
            testID="age-max-input"
            style={styles.input}
            keyboardType="number-pad"
            value={String(ageMax)}
            onChangeText={text => {
              const val = parseInt(text, 10);
              if (!isNaN(val)) setAgeMax(val);
            }}
          />
        </View>
      </View>
      <Text style={styles.ageHint}>Range: 18-30</Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Set Up Your Profile</Text>
      <Text style={styles.stepIndicator}>Step {step} of 5</Text>

      {renderCurrentStep()}

      <View style={styles.navRow}>
        {step > 1 && (
          <TouchableOpacity
            testID="back-button"
            style={styles.secondaryButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 5 ? (
          <TouchableOpacity
            testID="next-button"
            style={[styles.primaryButton, !canProceed() && styles.buttonDisabled]}
            onPress={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="submit-button"
            style={[styles.primaryButton, (!canProceed() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 4 },
  stepIndicator: { fontSize: 14, color: '#888', marginBottom: 20 },
  stepTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: -8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  chipSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextSelected: { color: '#fff' },
  vibeQuestion: { marginBottom: 20 },
  vibeText: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  vibeOptions: { flexDirection: 'row', gap: 12 },
  vibeOption: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  vibeOptionSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  vibeOptionText: { fontSize: 14, color: '#333' },
  vibeOptionTextSelected: { color: '#fff' },
  ageRow: { flexDirection: 'row', gap: 16 },
  ageInput: { flex: 1 },
  ageLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  ageHint: { fontSize: 12, color: '#888', marginTop: -4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  primaryButton: {
    flex: 1, backgroundColor: '#E91E63', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    flex: 1, borderWidth: 1, borderColor: '#E91E63', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center',
  },
  secondaryButtonText: { color: '#E91E63', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
