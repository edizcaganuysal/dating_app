import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyGroups, getMyMatches } from '../api/dates';
import { DateGroup, Match } from '../types';
import { colors, typography, spacing, shadows } from '../theme';
import {
  UserAvatar,
  ErrorState,
  EmptyState,
  AnimatedButton,
  GradientCard,
  PressableScale,
  SkeletonCard,
} from '../components';
import { haptic } from '../utils/haptics';
import { useFadeIn, useSpringIn, usePulse, useStaggerItem } from '../utils/animations';
import { Ionicons } from '@expo/vector-icons';

const ACTIVITY_LABELS: Record<string, string> = {
  dinner: 'Dinner', bar: 'Bar Hopping', bowling: 'Bowling',
  karaoke: 'Karaoke', board_games: 'Board Game Cafe',
  cooking_class: 'Cooking Class', trivia: 'Trivia Night',
  arcade: 'Arcade', mini_golf: 'Mini Golf', escape_room: 'Escape Room',
};

const ACTIVITY_EMOJI: Record<string, string> = {
  dinner: '🍽️', bar: '🍻', bowling: '🎳', karaoke: '🎤',
  board_games: '🎲', cooking_class: '👨‍🍳', trivia: '🧠',
  arcade: '🕹️', mini_golf: '⛳', escape_room: '🔐',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return timeStr; }
}

// ─── Countdown hook ────────────────────────────────────────────────

function useCountdown(scheduledDate: string, scheduledTime: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function compute() {
      const timePart = scheduledTime || '18:00';
      const target = new Date(`${scheduledDate}T${timePart}`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) { setLabel('Starting now'); return; }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) setLabel(`in ${days}d ${hours}h`);
      else if (hours > 0) setLabel(`in ${hours}h ${minutes}m`);
      else setLabel(`in ${minutes}m ${seconds}s`);
    }

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [scheduledDate, scheduledTime]);

  return label;
}

// ─── Group Card ─────────────────────────────────────────────────

function GroupCard({ group, index, onPress }: { group: DateGroup; index: number; onPress: () => void }) {
  const countdown = useCountdown(group.scheduled_date, group.scheduled_time);
  const label = ACTIVITY_LABELS[group.activity] || group.activity.replace(/_/g, ' ');
  const emoji = ACTIVITY_EMOJI[group.activity] || '📅';
  const fadeStyle = useStaggerItem(index);

  return (
    <Animated.View style={fadeStyle}>
      <PressableScale onPress={onPress}>
        <GradientCard gradientColors={[colors.surfaceElevated, '#FFF8F5']} style={styles.groupCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDate}>
                {formatDate(group.scheduled_date)}
                {group.scheduled_time ? ` at ${formatTime(group.scheduled_time)}` : ''}
              </Text>
            </View>
            <View style={styles.countdownBadge}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          </View>
          {group.members.length > 0 && (
            <View style={styles.avatarRow}>
              {group.members.slice(0, 4).map((member, i) => (
                <View key={member.id || i} style={[styles.avatarOverlap, { marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i }]}>
                  <UserAvatar
                    photoUrl={member.photo_urls?.[0]}
                    firstName={member.first_name}
                    size="sm"
                    borderColor={colors.surfaceElevated}
                    borderWidth={2}
                  />
                </View>
              ))}
              <Text style={styles.memberCount}>{group.members.length} members</Text>
            </View>
          )}
        </GradientCard>
      </PressableScale>
    </Animated.View>
  );
}

// ─── Match Card ─────────────────────────────────────────────────

function MatchCard({ match, index, onPress }: { match: Match; index: number; onPress: () => void }) {
  const fadeStyle = useStaggerItem(index);

  return (
    <Animated.View style={fadeStyle}>
      <PressableScale onPress={onPress}>
        <GradientCard gradientColors={[colors.surfaceElevated, colors.surfaceSelected]} style={styles.matchCard}>
          <UserAvatar photoUrl={match.partner.photo_urls?.[0]} firstName={match.partner.first_name} size="md" />
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{match.partner.first_name}</Text>
            <Text style={styles.matchProgram}>{match.partner.program || 'Student'}</Text>
          </View>
          <Ionicons name="heart" size={20} color={colors.primary} />
        </GradientCard>
      </PressableScale>
    </Animated.View>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────

function SkeletonLoading() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonContainer}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fabSpring = useSpringIn(500);
  const hasContentRef = useRef(false);
  const fabPulseStyle = usePulse(1, 1.05, 800, 1300);
  const welcomeFade = useFadeIn({ delay: 0 });

  const loadData = async () => {
    setError(false);
    try {
      const [groupsData, matchesData] = await Promise.all([getMyGroups(), getMyMatches()]);
      const upcoming = groupsData.filter(g => g.status === 'upcoming');
      setGroups(upcoming);
      setMatches(matchesData);
      hasContentRef.current = upcoming.length > 0 || matchesData.length > 0;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) return <SkeletonLoading />;
  if (error) return <ErrorState message="Couldn't load your dates" onRetry={loadData} />;

  const hasContent = groups.length > 0 || matches.length > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Animated.View style={welcomeFade}>
              <Text style={styles.welcome}>Welcome, {user?.first_name || 'there'}! 👋</Text>
            </Animated.View>

            {!hasContent && (
              <EmptyState
                icon="heart-outline"
                title="No dates yet!"
                description="Create your first date request to get matched with a group of awesome people."
                actionLabel="Create Date Request"
                onAction={() => navigation.navigate('DateRequest')}
              />
            )}

            {groups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Groups</Text>
                {groups.map((group, index) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    index={index}
                    onPress={() => navigation.navigate('GroupReveal', { groupId: group.id })}
                  />
                ))}
              </View>
            )}

            {matches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Matches</Text>
                {matches.map((match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={groups.length + index}
                    onPress={() => navigation.navigate('ChatDetail', { roomId: match.chat_room_id })}
                  />
                ))}
              </View>
            )}
          </View>
        }
      />

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, hasContent ? fabSpring : fabPulseStyle]}>
        <AnimatedButton
          label="Create Date Request"
          onPress={() => { haptic.light(); navigation.navigate('DateRequest'); }}
          variant="primary"
          size="lg"
          fullWidth
          icon="add-circle-outline"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  listContent: { paddingBottom: 100 },
  skeletonContainer: { padding: spacing.xl, paddingTop: spacing.xxxxl },
  welcome: {
    ...typography.headlineLarge,
    color: colors.dark,
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
  sectionTitle: { ...typography.headlineSmall, color: colors.dark, marginBottom: spacing.md },
  groupCard: { marginBottom: spacing.md, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 28 },
  cardTitle: { ...typography.labelLarge, color: colors.dark },
  cardDate: { ...typography.bodySmall, color: colors.darkSecondary, marginTop: spacing.xxs },
  countdownBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfacePressed, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: 999,
  },
  countdownText: { ...typography.captionSmall, color: colors.primary, fontWeight: '600' },
  avatarRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  avatarOverlap: {},
  memberCount: { ...typography.caption, color: colors.gray, marginLeft: spacing.sm },
  matchCard: { marginBottom: spacing.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  matchInfo: { flex: 1, marginLeft: spacing.md },
  matchName: { ...typography.labelLarge, color: colors.dark },
  matchProgram: { ...typography.bodySmall, color: colors.gray },
  fabContainer: { position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl, ...shadows.xl },
});
