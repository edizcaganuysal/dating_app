import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyGroups, getMyMatches } from '../api/dates';
import { DateGroup, Match } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [groupsData, matchesData] = await Promise.all([
        getMyGroups(),
        getMyMatches(),
      ]);
      setGroups(groupsData.filter(g => g.status === 'upcoming'));
      setMatches(matchesData);
    } catch {
      // Silently handle - data will be empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  const hasContent = groups.length > 0 || matches.length > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.content}>
            <Text style={styles.welcome}>
              Welcome, {user?.first_name || 'there'}!
            </Text>

            {!hasContent && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No dates yet!</Text>
                <Text style={styles.emptyText}>
                  Create your first date request to get matched with a group.
                </Text>
              </View>
            )}

            {groups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Groups</Text>
                {groups.map(group => (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.card}
                    onPress={() => navigation.navigate('GroupReveal', { groupId: group.id })}
                    testID={`group-${group.id}`}
                  >
                    <Text style={styles.cardTitle}>
                      {group.activity.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {group.scheduled_date} • {group.scheduled_time}
                    </Text>
                    <Text style={styles.cardDetail}>
                      {group.members.length} members
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {matches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Matches</Text>
                {matches.map(match => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.card}
                    onPress={() => navigation.navigate('Chat', { chatRoomId: match.chat_room_id })}
                    testID={`match-${match.id}`}
                  >
                    <Text style={styles.cardTitle}>{match.partner.first_name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {match.partner.program || 'Student'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
      />

      <TouchableOpacity
        testID="create-date-button"
        style={styles.fab}
        onPress={() => navigation.navigate('DateRequest')}
      >
        <Text style={styles.fabText}>+ Create Date Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 20 },
  emptyState: {
    backgroundColor: '#FFF0F5', borderRadius: 12, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#eee',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  cardDetail: { fontSize: 12, color: '#888', marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#E91E63', paddingVertical: 16, borderRadius: 30,
    alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
