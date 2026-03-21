import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getGroupDetail, getIcebreakers, getVenueSuggestions } from '../api/chat';
import { GroupDetail, Venue } from '../types';

function getStatusLabel(group: GroupDetail): string {
  const today = new Date().toISOString().split('T')[0];
  if (group.status === 'completed') return 'Completed';
  if (group.scheduled_date === today) return 'Today!';
  return 'Upcoming';
}

function getStatusColor(label: string): string {
  if (label === 'Completed') return '#888';
  if (label === 'Today!') return '#4CAF50';
  return '#2196F3';
}

export default function GroupRevealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupData, iceData, venueData] = await Promise.all([
          getGroupDetail(groupId),
          getIcebreakers(groupId),
          getVenueSuggestions(groupId),
        ]);
        setGroup(groupData);
        setIcebreakers(iceData.prompts);
        setVenues(venueData.venues);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (loading || !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  const statusLabel = getStatusLabel(group);
  const statusColor = getStatusColor(statusLabel);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.activity}>{group.activity.replace(/_/g, ' ')}</Text>
        <Text style={styles.dateTime}>
          {group.scheduled_date} at {group.scheduled_time}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Group</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
        {group.members.map((member) => (
          <View key={member.user_id} style={styles.memberCard} testID={`member-${member.user_id}`}>
            {member.profile.photo_urls.length > 0 ? (
              <Image source={{ uri: member.profile.photo_urls[0] }} style={styles.memberPhoto} />
            ) : (
              <View style={[styles.memberPhoto, styles.photoPlaceholder]}>
                <Text style={styles.photoInitial}>
                  {member.profile.first_name.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.memberName}>{member.profile.first_name}</Text>
            <Text style={styles.memberDetail}>Age {member.profile.age}</Text>
            {member.profile.program && (
              <Text style={styles.memberDetail}>{member.profile.program}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {venues.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Venue Suggestions</Text>
          {venues.map((venue, i) => (
            <View key={i} style={styles.venueCard}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <Text style={styles.venueAddress}>{venue.address}</Text>
              <Text style={styles.venuePrice}>{venue.price_range}</Text>
            </View>
          ))}
        </>
      )}

      {icebreakers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Icebreakers</Text>
          {icebreakers.map((prompt, i) => (
            <View key={i} style={styles.icebreakerCard}>
              <Text style={styles.icebreakerText}>{prompt}</Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.actions}>
        {group.chat_room_id && (
          <TouchableOpacity
            testID="open-chat-button"
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('ChatDetail', { roomId: group.chat_room_id })
            }
          >
            <Text style={styles.primaryButtonText}>Open Group Chat</Text>
          </TouchableOpacity>
        )}

        {group.status === 'completed' && (
          <TouchableOpacity
            testID="post-date-button"
            style={[styles.primaryButton, { backgroundColor: '#9C27B0' }]}
            onPress={() =>
              navigation.navigate('PostDate', { groupId: group.id })
            }
          >
            <Text style={styles.primaryButtonText}>Leave Feedback</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  activity: {
    fontSize: 24, fontWeight: 'bold', color: '#E91E63', textTransform: 'capitalize',
  },
  dateTime: { fontSize: 16, color: '#666', marginTop: 4 },
  statusBadge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18, fontWeight: '600', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  membersScroll: { paddingHorizontal: 12 },
  memberCard: {
    width: 120, alignItems: 'center', padding: 12, marginHorizontal: 8,
    backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#eee',
  },
  memberPhoto: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  photoPlaceholder: {
    backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center',
  },
  photoInitial: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  memberName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  memberDetail: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 2 },
  venueCard: {
    marginHorizontal: 20, marginBottom: 8, padding: 12,
    backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee',
  },
  venueName: { fontSize: 14, fontWeight: '600' },
  venueAddress: { fontSize: 12, color: '#666', marginTop: 2 },
  venuePrice: { fontSize: 12, color: '#E91E63', marginTop: 2 },
  icebreakerCard: {
    marginHorizontal: 20, marginBottom: 8, padding: 12,
    backgroundColor: '#FFF0F5', borderRadius: 8,
  },
  icebreakerText: { fontSize: 14, color: '#333', fontStyle: 'italic' },
  actions: { padding: 20, gap: 12 },
  primaryButton: {
    backgroundColor: '#E91E63', paddingVertical: 14, borderRadius: 25, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
