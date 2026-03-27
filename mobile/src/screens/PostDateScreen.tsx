import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getGroupDetail } from '../api/chat';
import { submitFeedback } from '../api/feedback';
import { getMyMatches } from '../api/dates';
import { GroupDetail, GroupMember, IndividualImpression, InterestLevel } from '../types';
import { colors, radii, shadows, spacing, fontFamilies } from '../theme';
import { UserAvatar, LoadingState, PressableScale } from '../components';
import { haptic } from '../utils/haptics';
import { useStaggerItem } from '../utils/animations';

const REPORT_CATEGORIES = [
  { key: 'uncomfortable', label: 'Made me uncomfortable' },
  { key: 'inappropriate', label: 'Inappropriate behavior' },
  { key: 'misrepresentation', label: 'Misrepresentation' },
  { key: 'aggressive', label: 'Aggressive behavior' },
];

const INTEREST_OPTIONS: { value: InterestLevel; label: string; icon: string }[] = [
  { value: 'not_interested', label: 'Not interested', icon: 'close-circle-outline' },
  { value: 'maybe', label: 'Maybe — would need to see them again', icon: 'help-circle-outline' },
  { value: 'interested', label: 'Interested — would like to connect', icon: 'heart-outline' },
  { value: 'very_interested', label: 'Very interested — definitely want to see them again', icon: 'heart' },
];

const CHEMISTRY_LABELS = ['Awkward', 'Meh', 'Fine', 'Great', 'Amazing'];

const POSITIVE_TAGS = ['Good conversation', 'Fun activity', 'Felt comfortable', 'Someone caught my eye'];
const NEGATIVE_TAGS = ['Awkward silences', 'Bad activity fit', 'Felt left out', 'Someone dominated'];

// --- Section 1: Group Experience ---

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starsRow} testID="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => { haptic.selection(); onChange(star); }}
          hitSlop={8}
          style={styles.starTouchTarget}
          testID={`star-${star}`}
        >
          <Ionicons
            name={value >= star ? 'star' : 'star-outline'}
            size={36}
            color={value >= star ? colors.firelight : colors.grayLight}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ScaleButtons({ value, onChange, labels }: {
  value: number; onChange: (v: number) => void; labels: string[];
}) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => { haptic.selection(); onChange(n); }}
          style={[styles.scaleButton, value === n && styles.scaleButtonActive]}
        >
          <Text style={[styles.scaleNumber, value === n && styles.scaleNumberActive]}>{n}</Text>
          <Text style={[styles.scaleLabel, value === n && styles.scaleLabelActive]} numberOfLines={1}>
            {labels[n - 1]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// --- Section 2: Individual Impression Card ---

function MemberImpressionCard({ member, index, impression, onChangeInterest, onToggleFriend, onBlock, onReport, isBlocked }: {
  member: GroupMember;
  index: number;
  impression: { interest_level: InterestLevel; friend_interest: boolean };
  onChangeInterest: (level: InterestLevel) => void;
  onToggleFriend: () => void;
  onBlock: () => void;
  onReport: () => void;
  isBlocked: boolean;
}) {
  const fadeStyle = useStaggerItem(index);

  return (
    <Animated.View style={fadeStyle}>
      <View style={styles.impressionCard} testID={`impression-${member.user_id}`}>
        <View style={styles.memberHeader}>
          <UserAvatar
            photoUrl={member.profile.photo_urls.length > 0 ? member.profile.photo_urls[0] : null}
            firstName={member.profile.first_name}
            size="md"
            style={{ marginRight: 12 }}
          />
          <Text style={styles.memberName}>{member.profile.first_name}</Text>
        </View>

        <Text style={styles.questionText}>How interested are you in {member.profile.first_name}?</Text>
        {INTEREST_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            testID={`interest-${member.user_id}-${opt.value}`}
            style={[styles.interestCard, impression.interest_level === opt.value && styles.interestCardActive]}
            onPress={() => { haptic.selection(); onChangeInterest(opt.value); }}
          >
            <Ionicons
              name={opt.icon as any}
              size={20}
              color={impression.interest_level === opt.value ? colors.primary : colors.gray}
              style={{ marginRight: 10 }}
            />
            <Text style={[
              styles.interestLabel,
              impression.interest_level === opt.value && styles.interestLabelActive,
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.questionText}>Would you hang out as friends?</Text>
        <View style={styles.friendToggleRow}>
          <Pressable
            style={[styles.friendToggle, impression.friend_interest && styles.friendToggleActive]}
            onPress={() => { haptic.selection(); if (!impression.friend_interest) onToggleFriend(); }}
          >
            <Ionicons name="thumbs-up-outline" size={18} color={impression.friend_interest ? '#fff' : colors.dark} />
            <Text style={[styles.friendToggleText, impression.friend_interest && styles.friendToggleTextActive]}>Yes</Text>
          </Pressable>
          <Pressable
            style={[styles.friendToggle, !impression.friend_interest && styles.friendToggleNo]}
            onPress={() => { haptic.selection(); if (impression.friend_interest) onToggleFriend(); }}
          >
            <Ionicons name="thumbs-down-outline" size={18} color={!impression.friend_interest ? '#fff' : colors.dark} />
            <Text style={[styles.friendToggleText, !impression.friend_interest && styles.friendToggleTextActive]}>No</Text>
          </Pressable>
        </View>

        <View style={styles.cardFooterActions}>
          <TouchableOpacity
            testID={`block-${member.user_id}`}
            style={[styles.footerAction, isBlocked && styles.footerActionDanger]}
            onPress={onBlock}
          >
            <Ionicons name="ban-outline" size={16} color={isBlocked ? colors.error : colors.gray} />
            <Text style={[styles.footerActionText, isBlocked && styles.footerActionTextDanger]}>
              {isBlocked ? 'Blocked' : 'Block'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerAction} onPress={onReport}>
            <Ionicons name="flag-outline" size={16} color={colors.gray} />
            <Text style={styles.footerActionText}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// --- Section 3: Reflection Tags ---

function ReflectionChips({ selected, onToggle }: { selected: string[]; onToggle: (tag: string) => void }) {
  return (
    <View>
      <Text style={styles.chipGroupLabel}>Positive</Text>
      <View style={styles.chipGrid}>
        {POSITIVE_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.chip, selected.includes(tag) && styles.chipPositiveActive]}
            onPress={() => { haptic.light(); onToggle(tag); }}
          >
            <Text style={[styles.chipText, selected.includes(tag) && styles.chipTextActive]}>{tag}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.chipGroupLabel}>Negative</Text>
      <View style={styles.chipGrid}>
        {NEGATIVE_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.chip, selected.includes(tag) && styles.chipNegativeActive]}
            onPress={() => { haptic.light(); onToggle(tag); }}
          >
            <Text style={[styles.chipText, selected.includes(tag) && styles.chipTextNegActive]}>{tag}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// --- Main Screen ---

export default function PostDateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { groupId } = route.params;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Section 1
  const [experienceRating, setExperienceRating] = useState(0);
  const [chemistryRating, setChemistryRating] = useState(0);
  const [activityFitRating, setActivityFitRating] = useState(0);

  // Section 2
  const [impressions, setImpressions] = useState<Record<string, { interest_level: InterestLevel; friend_interest: boolean }>>({});
  const [blockIds, setBlockIds] = useState<string[]>([]);

  // Section 3
  const [reflectionTags, setReflectionTags] = useState<string[]>([]);

  // Report modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportCategory, setReportCategory] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const groupData = await getGroupDetail(groupId);
        setGroup(groupData);
        const crossGender = groupData.members.filter(
          (m) => m.user_id !== user?.id && m.profile.gender !== user?.gender,
        );
        const initial: Record<string, { interest_level: InterestLevel; friend_interest: boolean }> = {};
        crossGender.forEach((m) => {
          initial[m.user_id] = { interest_level: 'not_interested', friend_interest: false };
        });
        setImpressions(initial);
      } catch {
        Alert.alert('Error', 'Failed to load group details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, user?.id, user?.gender]);

  const crossGenderMembers: GroupMember[] = group
    ? group.members.filter((m) => m.user_id !== user?.id && m.profile.gender !== user?.gender)
    : [];

  const toggleBlock = (userId: string) => {
    Alert.alert('Block this person?', "You won't be matched with them again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          setBlockIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
          );
        },
      },
    ]);
  };

  const toggleReflectionTag = (tag: string) => {
    setReflectionTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (experienceRating === 0) {
      Alert.alert('Please rate your experience', 'Tap the stars to rate 1-5.');
      return;
    }
    if (chemistryRating === 0) {
      Alert.alert('Rate group chemistry', 'How well did the group gel?');
      return;
    }
    if (activityFitRating === 0) {
      Alert.alert('Rate the activity', 'Was the activity a good fit?');
      return;
    }

    setSubmitting(true);
    try {
      const impressionList: IndividualImpression[] = crossGenderMembers.map((m) => ({
        user_id: m.user_id,
        interest_level: impressions[m.user_id]?.interest_level ?? 'not_interested',
        friend_interest: impressions[m.user_id]?.friend_interest ?? false,
      }));

      await submitFeedback(groupId, {
        experience_rating: experienceRating,
        group_chemistry_rating: chemistryRating,
        activity_fit_rating: activityFitRating,
        reflection_tags: reflectionTags,
        impressions: impressionList,
        block_user_ids: blockIds,
        report_user_ids: reportUserId ? [reportUserId] : [],
        report_category: reportCategory || undefined,
      });

      const matches = await getMyMatches();
      const groupMatches = matches.filter((m) => m.group_id === groupId);
      if (groupMatches.length > 0) {
        navigation.replace('MatchReveal', { match: groupMatches[0] });
      } else {
        Alert.alert('Thanks for your feedback!', 'Your responses have been recorded.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !group) return <LoadingState />;

  const activityLabel = group.activity.replace(/_/g, ' ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>How was your date?</Text>
      <Text style={styles.subtitle}>{activityLabel} on {group.scheduled_date}</Text>

      {/* SECTION 1: Group Experience */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Experience</Text>

        <Text style={styles.questionText}>How was the overall experience?</Text>
        <StarRating value={experienceRating} onChange={setExperienceRating} />

        <Text style={styles.questionText}>How well did the group gel?</Text>
        <ScaleButtons value={chemistryRating} onChange={setChemistryRating} labels={CHEMISTRY_LABELS} />

        <Text style={styles.questionText}>Was {activityLabel} a good fit?</Text>
        <ScaleButtons
          value={activityFitRating}
          onChange={setActivityFitRating}
          labels={['Terrible', 'Poor', 'Okay', 'Good', 'Perfect']}
        />
      </View>

      {/* SECTION 2: Individual Impressions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Individual Impressions</Text>
        {crossGenderMembers.map((member, index) => (
          <MemberImpressionCard
            key={member.user_id}
            member={member}
            index={index}
            impression={impressions[member.user_id] || { interest_level: 'not_interested', friend_interest: false }}
            onChangeInterest={(level) =>
              setImpressions((prev) => ({
                ...prev,
                [member.user_id]: { ...prev[member.user_id], interest_level: level },
              }))
            }
            onToggleFriend={() =>
              setImpressions((prev) => ({
                ...prev,
                [member.user_id]: { ...prev[member.user_id], friend_interest: !prev[member.user_id].friend_interest },
              }))
            }
            onBlock={() => toggleBlock(member.user_id)}
            onReport={() => { setReportUserId(member.user_id); setReportModalVisible(true); }}
            isBlocked={blockIds.includes(member.user_id)}
          />
        ))}
      </View>

      {/* SECTION 3: Quick Reflection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Reflection</Text>
        <Text style={styles.optionalLabel}>Optional — you can skip this</Text>
        <Text style={styles.questionText}>What made this date great (or not)?</Text>
        <ReflectionChips selected={reflectionTags} onToggle={toggleReflectionTag} />
      </View>

      <PressableScale
        testID="submit-button"
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Feedback'}</Text>
      </PressableScale>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report a Member</Text>
            <Text style={styles.modalLabel}>Who?</Text>
            {crossGenderMembers.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={[styles.modalOption, reportUserId === member.user_id && styles.modalOptionActive]}
                onPress={() => setReportUserId(member.user_id)}
              >
                <Text style={styles.modalOptionText}>{member.profile.first_name}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.modalLabel}>Category</Text>
            {REPORT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.modalOption, reportCategory === cat.key && styles.modalOptionActive]}
                onPress={() => setReportCategory(cat.key)}
              >
                <Text style={styles.modalOptionText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Tell us more..."
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.modalSubmitText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  contentContainer: { padding: spacing.xl, paddingBottom: 60 },
  title: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.darkSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    textTransform: 'capitalize',
  },

  section: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.dark,
    marginBottom: spacing.md,
  },
  optionalLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.grayLight,
    marginBottom: spacing.sm,
  },

  questionText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.darkSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Star rating
  starsRow: { flexDirection: 'row', gap: 4 },
  starTouchTarget: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },

  // Scale buttons
  scaleRow: { flexDirection: 'row', gap: 6 },
  scaleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  scaleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSelected,
  },
  scaleNumber: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 16,
    color: colors.gray,
  },
  scaleNumberActive: { color: colors.primary },
  scaleLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 9,
    color: colors.grayLight,
    marginTop: 2,
  },
  scaleLabelActive: { color: colors.primaryDark },

  // Impression card
  impressionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  memberName: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.dark,
  },

  // Interest option cards
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  interestCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSelected,
  },
  interestLabel: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.darkSecondary,
    flex: 1,
  },
  interestLabelActive: {
    color: colors.primaryDark,
    fontFamily: fontFamilies.inter.semiBold,
  },

  // Friend toggle
  friendToggleRow: { flexDirection: 'row', gap: spacing.sm },
  friendToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  friendToggleActive: { backgroundColor: colors.success, borderColor: colors.success },
  friendToggleNo: { backgroundColor: colors.gray, borderColor: colors.gray },
  friendToggleText: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 14,
    color: colors.dark,
  },
  friendToggleTextActive: { color: '#fff' },

  // Card footer actions
  cardFooterActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md, gap: spacing.lg },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerActionDanger: {},
  footerActionText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    color: colors.gray,
  },
  footerActionTextDanger: { color: colors.error },

  // Reflection chips
  chipGroupLabel: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 13,
    color: colors.darkSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.xxl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  chipPositiveActive: { borderColor: colors.success, backgroundColor: colors.successLight },
  chipNegativeActive: { borderColor: colors.warning, backgroundColor: colors.warningLight },
  chipText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 13,
    color: colors.darkSecondary,
  },
  chipTextActive: {
    color: colors.success,
    fontFamily: fontFamilies.inter.semiBold,
  },
  chipTextNegActive: {
    color: colors.warning,
    fontFamily: fontFamilies.inter.semiBold,
  },

  // Submit
  submitButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.xxl,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: { backgroundColor: colors.grayLight },
  submitButtonText: {
    color: '#fff',
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 16,
  },

  // Report modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.dark,
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 14,
    color: colors.darkSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  modalOption: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 6 },
  modalOptionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSelected },
  modalOptionText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    color: colors.dark,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  modalCancel: { padding: 10 },
  modalCancelText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    color: colors.darkSecondary,
  },
  modalSubmit: { padding: 10, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20 },
  modalSubmitText: {
    color: '#fff',
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 14,
  },
});
