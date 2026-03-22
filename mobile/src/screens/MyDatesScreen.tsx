import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyDateRequests, getMyGroups, cancelDateRequest } from '../api/dates';
import { DateRequest, DateGroup, ActivityType } from '../types';

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  const isEmpty = activeRequests.length === 0 && upcomingGroups.length === 0 && pastGroups.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E63" />}
    >
      {isEmpty && (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={60} color="#ddd" />
          <Text style={styles.emptyTitle}>No Dates Yet</Text>
          <Text style={styles.emptyText}>Create a date request from the Home screen to get started!</Text>
        </View>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active Requests</Text>
          {activeRequests.map(req => (
            <View key={req.id} style={styles.card}>
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
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(req.id)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Upcoming Dates */}
      {upcomingGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming Dates</Text>
          {upcomingGroups.map(group => (
            <TouchableOpacity
              key={group.id}
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
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Past Dates */}
      {pastGroups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Past Dates</Text>
          {pastGroups.map(group => (
            <View key={group.id} style={styles.card}>
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
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  emptyContainer: {
    alignItems: 'center', paddingVertical: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12, marginTop: 8,
  },
  card: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  activityEmoji: { fontSize: 28, marginRight: 12 },
  cardInfo: { flex: 1 },
  activityLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  detailText: { fontSize: 13, color: '#666', marginTop: 2 },
  metaText: { fontSize: 12, color: '#999', marginTop: 2 },
  cancelButton: {
    borderWidth: 1, borderColor: '#FF3B30', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16,
  },
  cancelText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  statusBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
});
