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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getGroupDetail } from '../api/chat';
import { submitFeedback } from '../api/feedback';
import { getMyMatches } from '../api/dates';
import { GroupDetail, GroupMember, RomanticInterestInput } from '../types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../theme';
import { UserAvatar, LoadingState, PressableScale } from '../components';
import { haptic } from '../utils/haptics';

const REPORT_CATEGORIES = [
  { key: 'uncomfortable', label: 'Made me uncomfortable' },
  { key: 'inappropriate', label: 'Inappropriate behavior' },
  { key: 'misrepresentation', label: 'Misrepresentation' },
  { key: 'aggressive', label: 'Aggressive behavior' },
];

export default function PostDateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { groupId } = route.params;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [interests, setInterests] = useState<Record<string, boolean>>({});
  const [blockIds, setBlockIds] = useState<string[]>([]);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportCategory, setReportCategory] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const groupData = await getGroupDetail(groupId);
        setGroup(groupData);
        const otherMembers = groupData.members.filter((m) => m.user_id !== user?.id);
        const initial: Record<string, boolean> = {};
        otherMembers.forEach((m) => { initial[m.user_id] = false; });
        setInterests(initial);
      } catch {
        Alert.alert('Error', 'Failed to load group details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, user?.id]);

  const otherMembers: GroupMember[] = group
    ? group.members.filter((m) => m.user_id !== user?.id)
    : [];

  const toggleInterest = (userId: string) => {
    setInterests((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const toggleBlock = (userId: string) => {
    Alert.alert(
      'Block this person?',
      "You won't be matched with them again.",
      [
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
      ],
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please rate your experience', 'Tap the stars to rate 1-5.');
      return;
    }
    setSubmitting(true);
    try {
      const romanticInterests: RomanticInterestInput[] = otherMembers.map((m) => ({
        user_id: m.user_id,
        interested: interests[m.user_id] || false,
      }));

      const reportUserIds = reportUserId ? [reportUserId] : [];

      await submitFeedback(groupId, {
        experience_rating: rating,
        romantic_interests: romanticInterests,
        block_user_ids: blockIds,
        report_user_ids: reportUserIds,
        report_category: reportCategory || undefined,
      });

      // Check for new matches
      const matches = await getMyMatches();
      const groupMatches = matches.filter((m) => m.group_id === groupId);

      if (groupMatches.length > 0) {
        navigation.replace('MatchReveal', {
          match: groupMatches[0],
        });
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

  if (loading || !group) {
    return <LoadingState />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>How was your date?</Text>
      <Text style={styles.subtitle}>
        {group.activity.replace(/_/g, ' ')} on {group.scheduled_date}
      </Text>

      {/* Star Rating */}
      <Text style={styles.sectionTitle}>Experience Rating</Text>
      <View style={styles.starsRow} testID="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => { haptic.selection(); setRating(star); }}
            hitSlop={8}
            style={styles.starTouchTarget}
            testID={`star-${star}`}
          >
            <Ionicons
              name={rating >= star ? 'star' : 'star-outline'}
              size={36}
              color={rating >= star ? '#FFD700' : colors.grayLight}
            />
          </Pressable>
        ))}
      </View>

      {/* Romantic Interest */}
      <Text style={styles.sectionTitle}>Romantic Interest</Text>
      {otherMembers.map((member, index) => (
        <Animated.View key={member.user_id} entering={FadeInDown.delay(index * 60).springify()}>
          <View style={styles.memberRow} testID={`interest-${member.user_id}`}>
            <View style={styles.memberInfo}>
              <UserAvatar
                photoUrl={member.profile.photo_urls.length > 0 ? member.profile.photo_urls[0] : null}
                firstName={member.profile.first_name}
                size="md"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.memberName}>{member.profile.first_name}</Text>
            </View>
            <View style={styles.memberActions}>
              <TouchableOpacity
                testID={`heart-${member.user_id}`}
                style={[styles.heartButton, interests[member.user_id] && styles.heartActive]}
                onPress={() => toggleInterest(member.user_id)}
              >
                <Text style={[styles.heartIcon, interests[member.user_id] && styles.heartIconActive]}>
                  {interests[member.user_id] ? '\u2764' : '\u2661'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`block-${member.user_id}`}
                style={[styles.blockButton, blockIds.includes(member.user_id) && styles.blockActive]}
                onPress={() => toggleBlock(member.user_id)}
              >
                <Text style={styles.blockText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      ))}

      {/* Report */}
      <TouchableOpacity
        testID="report-button"
        style={styles.reportButton}
        onPress={() => setReportModalVisible(true)}
      >
        <Text style={styles.reportButtonText}>Report a member</Text>
      </TouchableOpacity>

      {/* Submit */}
      <PressableScale
        testID="submit-button"
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Text>
      </PressableScale>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report a Member</Text>

            <Text style={styles.modalLabel}>Who?</Text>
            {otherMembers.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={[
                  styles.modalOption,
                  reportUserId === member.user_id && styles.modalOptionActive,
                ]}
                onPress={() => setReportUserId(member.user_id)}
              >
                <Text>{member.profile.first_name}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.modalLabel}>Category</Text>
            {REPORT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.modalOption,
                  reportCategory === cat.key && styles.modalOptionActive,
                ]}
                onPress={() => setReportCategory(cat.key)}
              >
                <Text>{cat.label}</Text>
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
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setReportModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceElevated, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 14, color: colors.darkSecondary, marginTop: 4, marginBottom: 20, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 4 },
  starTouchTarget: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  memberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '500' },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartButton: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  heartActive: { backgroundColor: colors.surfaceSelected },
  heartIcon: { fontSize: 20, color: colors.grayLight },
  heartIconActive: { color: colors.primary },
  blockButton: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  blockActive: { backgroundColor: '#ffebee', borderColor: '#f44336' },
  blockText: { fontSize: 12, color: colors.darkSecondary },
  reportButton: {
    marginTop: 24, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
  },
  reportButtonText: { color: colors.darkSecondary, fontSize: 14 },
  submitButton: {
    marginTop: 20, marginBottom: 40, backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: 25, alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: colors.grayLight },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.darkSecondary, marginTop: 12, marginBottom: 8 },
  modalOption: {
    padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 6,
  },
  modalOptionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSelected },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10,
    minHeight: 60, textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12,
  },
  modalCancel: { padding: 10 },
  modalSubmit: {
    padding: 10, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20,
  },
  modalSubmitText: { color: '#fff', fontWeight: '600' },
});
