import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getMyProfile, updateProfile, uploadPhoto } from '../api/profiles';
import { API_BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PrivateProfile } from '../types';
import { colors } from '../theme';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 56) / 3;

const INTENT_OPTIONS = ['casual', 'serious', 'open'];
const INTENT_LABELS: Record<string, string> = {
  casual: 'Keeping it casual',
  serious: 'Something serious',
  open: 'Open to anything',
};

const ALL_INTERESTS = [
  'Hiking', 'Running', 'Gym', 'Yoga', 'Swimming', 'Cycling', 'Basketball', 'Soccer',
  'Tennis', 'Rock Climbing', 'Surfing', 'Martial Arts', 'Volleyball', 'Skiing',
  'Live Music', 'Concerts', 'Singing', 'Guitar', 'Piano', 'DJing', 'K-Pop', 'Hip Hop',
  'Photography', 'Art', 'Painting', 'Drawing', 'Writing', 'Poetry', 'Filmmaking', 'Crafts',
  'Cooking', 'Baking', 'Coffee', 'Wine', 'Craft Beer', 'Brunch', 'Foodie',
  'Movies', 'TV Shows', 'Anime', 'Gaming', 'Board Games', 'Podcasts', 'Reading',
  'Travel', 'Camping', 'Beach', 'Road Trips', 'Nature', 'Stargazing',
  'Dancing', 'House Parties', 'Volunteering', 'Festivals', 'Clubbing',
  'Fashion', 'Thrifting', 'Skincare', 'Meditation', 'Astrology', 'Dogs', 'Cats',
  'Science', 'History', 'Philosophy', 'Technology', 'Startups',
];

const HUMOR_STYLES = ['sarcastic', 'goofy', 'dry', 'dark', 'wholesome', 'witty'];
const COMM_PREFS = ['texter', 'caller', 'in-person', 'voice_notes'];
const CONFLICT_STYLES = ['talk_immediately', 'need_space', 'avoid', 'write_it_out'];
const DRINKING_OPTIONS = ['never', 'socially', 'regularly'];
const SMOKING_OPTIONS = ['never', 'socially', 'regularly'];
const BODY_TYPES = ['slim', 'athletic', 'average', 'curvy', 'muscular'];
const STYLE_OPTIONS = ['casual', 'preppy', 'streetwear', 'artsy', 'sporty', 'minimal', 'vintage', 'elegant'];
const EXERCISE_OPTIONS = ['never', 'sometimes', 'often', 'daily'];
const DIET_OPTIONS = ['no_restrictions', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'pescatarian'];
const SLEEP_OPTIONS = ['early_bird', 'night_owl', 'depends'];

const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface ExtendedProfile extends PrivateProfile {
  relationship_intent?: string;
  prompts?: { prompt: string; answer: string }[];
  onboarding_path?: string;
  social_energy?: number;
  humor_styles?: string[];
  communication_pref?: string;
  conflict_style?: string;
  drinking?: string;
  smoking?: string;
  exercise?: string;
  diet?: string;
  sleep_schedule?: string;
  group_role?: string[];
  ideal_group_size?: string;
  dealbreakers?: string[];
  body_type?: string;
  height_cm?: number;
  style_tags?: string[];
  pref_body_type?: string[];
  pref_height_range?: number[];
  pref_style?: string[];
  pref_social_energy_range?: number[];
  pref_humor_styles?: string[];
  pref_communication?: string[];
}

// ── Editable Chip Selector Modal ──

function ChipModal({
  visible,
  title,
  options,
  selected,
  multi,
  max,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string[];
  multi?: boolean;
  max?: number;
  onSave: (selected: string[]) => void;
  onClose: () => void;
}) {
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) setLocalSelected(selected);
  }, [visible, selected]);

  const toggle = (item: string) => {
    if (multi) {
      if (localSelected.includes(item)) {
        setLocalSelected(localSelected.filter(s => s !== item));
      } else if (!max || localSelected.length < max) {
        setLocalSelected([...localSelected, item]);
      }
    } else {
      setLocalSelected([item]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {multi && max && (
            <Text style={styles.modalSub}>{localSelected.length}/{max} selected</Text>
          )}
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.chipRow}>
              {options.map(opt => {
                const isSelected = localSelected.includes(opt);
                const disabled = multi && max !== undefined && localSelected.length >= max && !isSelected;
                return (
                  <TouchableOpacity
                    key={opt}
                    disabled={disabled}
                    style={[styles.chip, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}
                    onPress={() => toggle(opt)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {formatLabel(opt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => { onSave(localSelected); onClose(); }}
            >
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Component ──

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modals
  const [intentModalVisible, setIntentModalVisible] = useState(false);
  const [editPromptIndex, setEditPromptIndex] = useState<number | null>(null);
  const [editPromptAnswer, setEditPromptAnswer] = useState('');
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [humorModalVisible, setHumorModalVisible] = useState(false);
  const [commModalVisible, setCommModalVisible] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [drinkingModalVisible, setDrinkingModalVisible] = useState(false);
  const [smokingModalVisible, setSmokingModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [bodyTypeModalVisible, setBodyTypeModalVisible] = useState(false);
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(false);
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('25');

  const apiBase = API_BASE_URL;

  const resolvePhotoUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${apiBase}${url}`;
  };

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data as ExtendedProfile);
      setAgeMin(String(data.age_range_min || 18));
      setAgeMax(String(data.age_range_max || 25));
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = () => { setRefreshing(true); loadProfile(); };

  const saveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      await updateProfile({ [field]: value } as any);
      setProfile(prev => prev ? { ...prev, [field]: value } : prev);
    } catch {
      Alert.alert('Error', `Failed to update ${field}`);
    } finally {
      setSaving(false);
    }
  };

  const handleIntentChange = async (intent: string) => {
    await saveField('relationship_intent', intent);
    setIntentModalVisible(false);
  };

  const handleSavePrompt = async () => {
    if (editPromptIndex === null || !profile?.prompts) return;
    const updatedPrompts = [...profile.prompts];
    updatedPrompts[editPromptIndex] = { ...updatedPrompts[editPromptIndex], answer: editPromptAnswer };
    await saveField('prompts', updatedPrompts);
    setEditPromptIndex(null);
  };

  const handleSaveAge = async () => {
    const min = parseInt(ageMin);
    const max = parseInt(ageMax);
    if (isNaN(min) || isNaN(max) || min < 18 || max > 99 || min > max) {
      Alert.alert('Invalid', 'Please enter valid ages (18-99)');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ age_range_min: min, age_range_max: max } as any);
      setProfile(prev => prev ? { ...prev, age_range_min: min, age_range_max: max } : prev);
      setAgeModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update age range');
    } finally {
      setSaving(false);
    }
  };

  // ── Photo Management ──

  const pickAndUploadPhoto = async (index: number, source: 'camera' | 'gallery') => {
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
        setSaving(true);
        try {
          const { url } = await uploadPhoto(result.assets[0].uri);
          const urls = [...(profile?.photo_urls || [])];
          if (index < urls.length) {
            urls[index] = url;
          } else {
            urls.push(url);
          }
          await updateProfile({ photo_urls: urls } as any);
          setProfile(prev => prev ? { ...prev, photo_urls: urls } : prev);
        } catch (e: any) {
          let detail = e?.response?.data?.detail;
          if (!detail) {
            if (e?.code === 'ECONNABORTED') detail = 'Photo verification timed out. Try a smaller photo or retake it.';
            else if (e?.code === 'ERR_NETWORK') detail = 'Cannot reach the server. Check your WiFi connection.';
            else if (e?.response?.status === 500) detail = 'Verification service error. Please try again.';
            else detail = `Upload failed: ${e?.message || 'Unknown error'}`;
          }
          Alert.alert('Photo Rejected', detail);
        } finally {
          setSaving(false);
        }
      }
    } catch (err: any) { Alert.alert('Camera Error', err?.message || 'Could not access camera or photos. Check your permissions in Settings.'); }
  };

  const showPhotoOptions = (index: number) => {
    const hasPhoto = profile?.photo_urls && index < profile.photo_urls.length;
    const options = hasPhoto
      ? ['Replace with Camera', 'Replace from Gallery', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Cancel'];
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: hasPhoto ? 2 : undefined },
        (i) => {
          if (hasPhoto) {
            if (i === 0) pickAndUploadPhoto(index, 'camera');
            else if (i === 1) pickAndUploadPhoto(index, 'gallery');
            else if (i === 2) removePhoto(index);
          } else {
            if (i === 0) pickAndUploadPhoto(index, 'camera');
            else if (i === 1) pickAndUploadPhoto(index, 'gallery');
          }
        },
      );
    } else {
      const buttons = hasPhoto
        ? [
          { text: 'Replace with Camera', onPress: () => pickAndUploadPhoto(index, 'camera') },
          { text: 'Replace from Gallery', onPress: () => pickAndUploadPhoto(index, 'gallery') },
          { text: 'Remove Photo', style: 'destructive' as const, onPress: () => removePhoto(index) },
          { text: 'Cancel', style: 'cancel' as const },
        ]
        : [
          { text: 'Take Photo', onPress: () => pickAndUploadPhoto(index, 'camera') },
          { text: 'Choose from Gallery', onPress: () => pickAndUploadPhoto(index, 'gallery') },
          { text: 'Cancel', style: 'cancel' as const },
        ];
      Alert.alert('Photo', '', buttons);
    }
  };

  const removePhoto = async (index: number) => {
    if (!profile?.photo_urls) return;
    if (profile.photo_urls.length <= 3) {
      Alert.alert('Minimum Photos', 'You need at least 3 photos.');
      return;
    }
    const urls = profile.photo_urls.filter((_, i) => i !== index);
    await saveField('photo_urls', urls);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Unable to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photoUrls = profile.photo_urls || [];
  const photoSlots = [...photoUrls, ...Array(Math.max(0, 6 - photoUrls.length)).fill(null)].slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {saving && (
        <View style={styles.savingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          {photoUrls[0] ? (
            <Image source={{ uri: resolvePhotoUrl(photoUrls[0]) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color={colors.grayLight} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.nameText}>{profile.first_name}, {profile.age}</Text>
            {profile.program && <Text style={styles.programText}>{profile.program}</Text>}
            <View style={styles.badgeRow}>
              {profile.is_selfie_verified && (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Photos */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Photos</Text>
          <Text style={styles.cardHint}>Tap to edit</Text>
        </View>
        <View style={styles.photoGrid}>
          {photoSlots.map((url: string | null, i: number) => (
            <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => showPhotoOptions(i)}>
              {url ? (
                <Image source={{ uri: resolvePhotoUrl(url) }} style={styles.photo} />
              ) : (
                <View style={styles.emptyPhotoSlot}>
                  <Ionicons name="add" size={28} color={colors.grayLight} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Relationship Intent */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Looking for</Text>
          <TouchableOpacity onPress={() => setIntentModalVisible(true)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.valueText}>
          {INTENT_LABELS[profile.relationship_intent || 'open'] || 'Open to anything'}
        </Text>
      </View>

      {/* Intent Modal */}
      <Modal visible={intentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What are you looking for?</Text>
            {INTENT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={[styles.modalOption, profile.relationship_intent === opt && styles.modalOptionActive]}
                onPress={() => handleIntentChange(opt)}>
                <Text style={[styles.modalOptionText, profile.relationship_intent === opt && styles.modalOptionTextActive]}>
                  {INTENT_LABELS[opt]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIntentModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Prompts */}
      {profile.prompts && profile.prompts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prompts</Text>
          {profile.prompts.map((p, i) => (
            <TouchableOpacity key={i} style={styles.promptCard}
              onPress={() => { setEditPromptIndex(i); setEditPromptAnswer(p.answer); }}>
              <Text style={styles.promptQuestion}>{p.prompt}</Text>
              <Text style={styles.promptAnswer}>{p.answer}</Text>
              <Ionicons name="pencil" size={14} color={colors.gray} style={styles.pencilIcon} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Edit Prompt Modal */}
      <Modal visible={editPromptIndex !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Answer</Text>
            {editPromptIndex !== null && profile.prompts && (
              <Text style={styles.promptQuestionModal}>{profile.prompts[editPromptIndex]?.prompt}</Text>
            )}
            <TextInput style={styles.modalInput} value={editPromptAnswer}
              onChangeText={setEditPromptAnswer} multiline placeholder="Your answer..." maxLength={120} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditPromptIndex(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSavePrompt}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interests */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Interests</Text>
          <TouchableOpacity onPress={() => setInterestsModalVisible(true)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          {(profile.interests || []).map(interest => (
            <View key={interest} style={[styles.chip, styles.chipSelected]}>
              <Text style={styles.chipTextSelected}>{formatLabel(interest)}</Text>
            </View>
          ))}
        </View>
      </View>
      <ChipModal
        visible={interestsModalVisible}
        title="Edit Interests"
        options={ALL_INTERESTS.map(i => i.toLowerCase())}
        selected={profile.interests || []}
        multi max={10}
        onSave={(sel) => saveField('interests', sel)}
        onClose={() => setInterestsModalVisible(false)}
      />

      {/* Personality */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personality</Text>

        <TouchableOpacity style={styles.editRow} onPress={() => setHumorModalVisible(true)}>
          <Text style={styles.detailLabel}>Humor</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{(profile.humor_styles || []).map(formatLabel).join(', ') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setCommModalVisible(true)}>
          <Text style={styles.detailLabel}>Communication</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.communication_pref || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setConflictModalVisible(true)}>
          <Text style={styles.detailLabel}>Conflict style</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.conflict_style || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>
      </View>
      <ChipModal visible={humorModalVisible} title="Humor Style" options={HUMOR_STYLES} selected={profile.humor_styles || []} multi max={2} onSave={(s) => saveField('humor_styles', s)} onClose={() => setHumorModalVisible(false)} />
      <ChipModal visible={commModalVisible} title="Communication Preference" options={COMM_PREFS} selected={profile.communication_pref ? [profile.communication_pref] : []} onSave={(s) => saveField('communication_pref', s[0] || null)} onClose={() => setCommModalVisible(false)} />
      <ChipModal visible={conflictModalVisible} title="Conflict Style" options={CONFLICT_STYLES} selected={profile.conflict_style ? [profile.conflict_style] : []} onSave={(s) => saveField('conflict_style', s[0] || null)} onClose={() => setConflictModalVisible(false)} />

      {/* Lifestyle */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lifestyle</Text>

        <TouchableOpacity style={styles.editRow} onPress={() => setDrinkingModalVisible(true)}>
          <Text style={styles.detailLabel}>Drinking</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.drinking || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setSmokingModalVisible(true)}>
          <Text style={styles.detailLabel}>Smoking</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.smoking || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setExerciseModalVisible(true)}>
          <Text style={styles.detailLabel}>Exercise</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.exercise || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setDietModalVisible(true)}>
          <Text style={styles.detailLabel}>Diet</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.diet || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editRow} onPress={() => setSleepModalVisible(true)}>
          <Text style={styles.detailLabel}>Sleep</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.sleep_schedule || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>
      </View>
      <ChipModal visible={drinkingModalVisible} title="Drinking" options={DRINKING_OPTIONS} selected={profile.drinking ? [profile.drinking] : []} onSave={(s) => saveField('drinking', s[0] || null)} onClose={() => setDrinkingModalVisible(false)} />
      <ChipModal visible={smokingModalVisible} title="Smoking" options={SMOKING_OPTIONS} selected={profile.smoking ? [profile.smoking] : []} onSave={(s) => saveField('smoking', s[0] || null)} onClose={() => setSmokingModalVisible(false)} />
      <ChipModal visible={exerciseModalVisible} title="Exercise" options={EXERCISE_OPTIONS} selected={profile.exercise ? [profile.exercise] : []} onSave={(s) => saveField('exercise', s[0] || null)} onClose={() => setExerciseModalVisible(false)} />
      <ChipModal visible={dietModalVisible} title="Diet" options={DIET_OPTIONS} selected={profile.diet ? [profile.diet] : []} onSave={(s) => saveField('diet', s[0] || null)} onClose={() => setDietModalVisible(false)} />
      <ChipModal visible={sleepModalVisible} title="Sleep Schedule" options={SLEEP_OPTIONS} selected={profile.sleep_schedule ? [profile.sleep_schedule] : []} onSave={(s) => saveField('sleep_schedule', s[0] || null)} onClose={() => setSleepModalVisible(false)} />

      {/* About You (appearance) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About You</Text>

        <TouchableOpacity style={styles.editRow} onPress={() => setBodyTypeModalVisible(true)}>
          <Text style={styles.detailLabel}>Body Type</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{formatLabel(profile.body_type || '') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Height</Text>
          <Text style={styles.detailValue}>{profile.height_cm ? `${profile.height_cm} cm` : 'Not set'}</Text>
        </View>

        <TouchableOpacity style={styles.editRow} onPress={() => setStyleModalVisible(true)}>
          <Text style={styles.detailLabel}>Style</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.detailValue}>{(profile.style_tags || []).map(formatLabel).join(', ') || 'Not set'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </View>
        </TouchableOpacity>
      </View>
      <ChipModal visible={bodyTypeModalVisible} title="Body Type" options={BODY_TYPES} selected={profile.body_type ? [profile.body_type] : []} onSave={(s) => saveField('body_type', s[0] || null)} onClose={() => setBodyTypeModalVisible(false)} />
      <ChipModal visible={styleModalVisible} title="Your Style" options={STYLE_OPTIONS} selected={profile.style_tags || []} multi max={3} onSave={(s) => saveField('style_tags', s)} onClose={() => setStyleModalVisible(false)} />

      {/* Preferences */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <TouchableOpacity onPress={() => setAgeModalVisible(true)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Age Range</Text>
          <Text style={styles.detailValue}>{profile.age_range_min ?? 18} - {profile.age_range_max ?? 30}</Text>
        </View>
      </View>

      {/* Age Modal */}
      <Modal visible={ageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Age Preferences</Text>
            <Text style={styles.modalSub}>Private - only used for matching</Text>
            <View style={styles.ageRow}>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Min Age</Text>
                <TextInput style={styles.ageInput} keyboardType="number-pad" value={ageMin}
                  onChangeText={setAgeMin} maxLength={2} />
              </View>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Max Age</Text>
                <TextInput style={styles.ageInput} keyboardType="number-pad" value={ageMax}
                  onChangeText={setAgeMax} maxLength={2} />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAgeModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveAge}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Friends */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Friends')}>
        <View style={styles.friendsRow}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={styles.friendsText}>My Friends</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </View>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceElevated },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceElevated },
  errorText: { fontSize: 16, color: colors.gray, marginBottom: 12 },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  // Saving indicator
  savingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#FFF3E0', borderRadius: 8, marginBottom: 12 },
  savingText: { fontSize: 13, color: '#E65100' },

  // Cards
  card: { backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  cardHint: { fontSize: 12, color: colors.gray },
  editText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  valueText: { fontSize: 15, color: colors.dark },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { marginLeft: 16, flex: 1 },
  nameText: { fontSize: 22, fontWeight: 'bold', color: colors.dark },
  programText: { fontSize: 14, color: colors.darkSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 12, color: colors.success, fontWeight: '600' },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%', borderRadius: 10 },
  emptyPhotoSlot: { flex: 1, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.3 },
  chipText: { fontSize: 13, color: colors.dark },
  chipTextSelected: { color: '#fff', fontSize: 13 },

  // Editable rows
  editRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  editRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: colors.darkSecondary },
  detailValue: { fontSize: 14, color: colors.dark, fontWeight: '600' },

  // Prompts
  promptCard: { backgroundColor: colors.surfaceElevated, borderRadius: 8, padding: 12, marginBottom: 8, position: 'relative' },
  promptQuestion: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  promptAnswer: { fontSize: 14, color: colors.dark, paddingRight: 20 },
  pencilIcon: { position: 'absolute', top: 12, right: 12 },

  // Friends & Logout
  friendsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendsText: { fontSize: 16, fontWeight: '600', color: colors.dark, flex: 1 },
  logoutButton: { backgroundColor: colors.error, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.surfaceElevated, borderRadius: 16, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.dark, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.gray, marginBottom: 16 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: 8 },
  modalOptionActive: { backgroundColor: '#FFF5F7' },
  modalOptionText: { fontSize: 16, color: colors.dark },
  modalOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 16, color: colors.gray, textAlign: 'center' },
  modalSaveBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  modalSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  promptQuestionModal: { fontSize: 14, color: colors.primary, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 },

  // Age modal
  ageRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  ageField: { flex: 1 },
  ageLabel: { fontSize: 14, color: colors.darkSecondary, marginBottom: 6 },
  ageInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 18, textAlign: 'center', backgroundColor: colors.surfaceElevated },
});
