import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyDateRequests, getMyGroups, cancelDateRequest } from '../api/dates';
import { DateRequest, DateGroup, ActivityType } from '../types';
import { colors, typography, spacing, fontFamilies } from '../theme';
import { LoadingState, EmptyState, PressableScale, SkeletonCard } from '../components';

const ACTIVITY_EMOJI: Record<string, string> = {
  dinner: '\u{1F37D}',
  bar: '\u{1F37A}',
  bowling: '\u{1F3B3}',
  karaoke: '\u{1F3A4}',
  board_games: '\u{1F3B2}',
  cooking_class: '\u{1F468}\u200D\u{1F373}',
  trivia_night: '\u{1F9E0}',
  mini_golf: '\u26F3',
  escape_room: '\u{1F510}',
  arcade: '\u{1F579}',
};

const ACTIVITY_LABEL: Record<string, string> = {
  dinner: 'Dinner',
  bar: 'Bar / Pub',
  bowling: 'Bowling',
  karaoke: 'Karaoke',
  board_games: 'Board Game Cafe',
  cooking_class: 'Cooking Class',
  trivia_night: 'Trivia Night',
  mini_golf: 'Mini Golf',
  escape_room: 'Escape Room',
  arcade: 'Arcade',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function MyDatesScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<DateRequest[]>([]);
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reqData, groupData] = await Promise.all([
        getMyDateRequests(),
        getMyGroups(),
      ]);
      setRequests(reqData);
      setGroups(groupData);
    } catch {
      Alert.alert('Error', 'Failed to load dates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this date request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelDateRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to cancel request');
          }
        },
      },
    ]);
  };

  const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'active');
  const upcomingGroups = groups.filter(g => g.status === 'upcoming' || g.status === 'confirmed');
  const pastGroups = groups.filter(g => g.status === 'completed' || g.status === 'past');

  if (loading) {
    return (
      <View style={[styles.container, styles.content]}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  const isEmpty = activeRequests.length === 0 && upcomingGroups.length === 0 && pastGroups.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {isEmpty && (
        <EmptyState
          icon="calendar-outline"
          title="No dates yet"
          description="Create a date request from the Home screen to get started!"
        />
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active Requests</Text>
          {activeRequests.map((req, index) => (
            <Animated.View key={req.id} >
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.activityEmoji}>
                    {ACTIVITY_EMOJI[req.activity] || ''}
                  </Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.activityLabel}>
                      {ACTIVITY_LABEL[req.activity] || req.activity}
                    </Text>
                    <Text style={styles.detailText}>
                      Group of {req.group_size} {req.pre_group_friend_ids?.length > 0 ? `(+${req.pre_group_friend_ids.length} friend${req.pre_group_friend_ids.length > 1 ? 's' : ''})` : ''}
                    </Text>
                    <Text style={styles.metaText}>
                      {req.availability_slots.length} time slot{req.availability_slots.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <PressableScale
                      style={styles.editButton}
                      onPress={() => navigation.navigate('Home', {
                        screen: 'DateRequest',
                        params: { editRequestId: req.id },
                      })}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </PressableScale>
                    <PressableScale
                      style={styles.cancelButton}
                      onPress={() => handleCancel(req.id)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </PressableScale>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      )}

      {/* Upcoming Dates */}
      {upcomingGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming Dates</Text>
          {upcomingGroups.map((group, index) => (
            <Animated.View key={group.id} >
              <PressableScale
                style={styles.card}
                onPress={() => navigation.navigate('Home', {
                  screen: 'GroupReveal',
                  params: { groupId: group.id },
                })}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.activityEmoji}>
                    {ACTIVITY_EMOJI[group.activity] || ''}
                  </Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.activityLabel}>
                      {ACTIVITY_LABEL[group.activity] || group.activity}
                    </Text>
                    <Text style={styles.detailText}>
                      {formatDate(group.scheduled_date)} at {group.scheduled_time}
                    </Text>
                    <Text style={styles.metaText}>
                      {group.members.length} members
                      {group.venue_name ? ` \u00B7 ${group.venue_name}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray} />
                </View>
              </PressableScale>
            </Animated.View>
          ))}
        </>
      )}

      {/* Past Dates */}
      {pastGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Past Dates</Text>
          {pastGroups.map((group, index) => (
            <Animated.View key={group.id} >
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.activityEmoji}>
                    {ACTIVITY_EMOJI[group.activity] || ''}
                  </Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.activityLabel}>
                      {ACTIVITY_LABEL[group.activity] || group.activity}
                    </Text>
                    <Text style={styles.detailText}>
                      {formatDate(group.scheduled_date)}
                    </Text>
                    <Text style={styles.metaText}>
                      {group.members.length} members
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
  sectionTitle: {
    ...typography.headlineSmall, color: colors.dark, marginBottom: spacing.md, marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  activityEmoji: { fontSize: 28, marginRight: spacing.md },
  cardInfo: { flex: 1 },
  activityLabel: { ...typography.labelLarge, color: colors.dark },
  detailText: { ...typography.bodySmall, color: colors.darkSecondary, marginTop: spacing.xxs },
  metaText: { ...typography.caption, color: colors.gray, marginTop: spacing.xxs },
  actionRow: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  editButton: {
    borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16,
  },
  editText: { color: colors.primary, fontFamily: fontFamilies.inter.semiBold, fontSize: 13 },
  cancelButton: {
    borderWidth: 1, borderColor: colors.error, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16,
  },
  cancelText: { color: colors.error, fontFamily: fontFamilies.inter.semiBold, fontSize: 13 },
  statusBadge: {
    backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { color: colors.success, fontFamily: fontFamilies.inter.semiBold, fontSize: 12 },
});
