import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getGroupDetail, getIcebreakers, getVenueSuggestions } from '../api/chat';
import { GroupDetail, Venue } from '../types';
import { colors } from '../theme';
import { UserAvatar, LoadingState, PressableScale } from '../components';
import { useFadeIn, useStaggerItem } from '../utils/animations';

function getStatusLabel(group: GroupDetail): string {
  const today = new Date().toISOString().split('T')[0];
  if (group.status === 'completed') return 'Completed';
  if (group.scheduled_date === today) return 'Today!';
  return 'Upcoming';
}

function getStatusColor(label: string): string {
  if (label === 'Completed') return colors.gray;
  if (label === 'Today!') return colors.success;
  return colors.info;
}

function MemberCard({ member, index }: { member: any; index: number }) {
  const fadeStyle = useStaggerItem(index, 200, 'none');
  return (
    <Animated.View style={fadeStyle}>
      <View style={styles.memberCard} testID={`member-${member.user_id}`}>
        <UserAvatar
          photoUrl={member.profile.photo_urls.length > 0 ? member.profile.photo_urls[0] : null}
          firstName={member.profile.first_name}
          size="lg"
        />
        <Text style={styles.memberName}>{member.profile.first_name}</Text>
        <Text style={styles.memberDetail}>Age {member.profile.age}</Text>
        {member.profile.program && <Text style={styles.memberDetail}>{member.profile.program}</Text>}
      </View>
    </Animated.View>
  );
}

function VenueCard({ venue, onOpenMaps }: { venue: Venue; onOpenMaps: (addr: string) => void }) {
  const fadeStyle = useFadeIn({ delay: 300, direction: 'up' });
  return (
    <Animated.View style={fadeStyle}>
      <View style={styles.venueCard}>
        <Text style={styles.venueName}>{venue.name}</Text>
        <View style={styles.venueAddressRow}>
          <Text style={styles.venueAddress}>{venue.address}</Text>
          {venue.address && (
            <TouchableOpacity onPress={() => onOpenMaps(venue.address)}>
              <Text style={styles.mapsLink}>Open in Maps</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.venuePrice}>{venue.price_range}</Text>
      </View>
    </Animated.View>
  );
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
          getGroupDetail(groupId), getIcebreakers(groupId), getVenueSuggestions(groupId),
        ]);
        setGroup(groupData);
        setIcebreakers(iceData.prompts);
        setVenues(venueData.venues);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [groupId]);

  const handleShare = async () => {
    if (!group) return;
    const activity = group.activity.replace(/_/g, ' ');
    const venue = venues.length > 0 ? venues[0].name : 'TBD';
    const memberNames = group.members.map((m) => m.profile.first_name).join(', ');
    const message = `I am going on a Yuni group date! ${activity} at ${venue}, ${group.scheduled_date} ${group.scheduled_time}. Group: ${memberNames}. I will check in after!`;
    try { await Share.share({ message }); } catch {}
  };

  const handleOpenMaps = (address: string) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };

  if (loading || !group) return <LoadingState />;

  const statusLabel = getStatusLabel(group);
  const statusColor = getStatusColor(statusLabel);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.activity}>{group.activity.replace(/_/g, ' ')}</Text>
        <Text style={styles.dateTime}>{group.scheduled_date} at {group.scheduled_time}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Group</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
        {group.members.map((member, index) => (
          <MemberCard key={member.user_id} member={member} index={index} />
        ))}
      </ScrollView>

      {venues.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Venue Suggestions</Text>
          {venues.map((venue, i) => (
            <VenueCard key={i} venue={venue} onOpenMaps={handleOpenMaps} />
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
          <PressableScale testID="open-chat-button" style={styles.primaryButton}
            onPress={() => navigation.navigate('ChatDetail', { roomId: group.chat_room_id })}>
            <Text style={styles.primaryButtonText}>Open Group Chat</Text>
          </PressableScale>
        )}
        {group.status === 'completed' && (
          <PressableScale testID="post-date-button" style={[styles.primaryButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => navigation.navigate('PostDate', { groupId: group.id })}>
            <Text style={styles.primaryButtonText}>Leave Feedback</Text>
          </PressableScale>
        )}
        <PressableScale testID="share-plans-button" style={styles.shareButton} onPress={handleShare}>
          <View style={styles.shareButtonContent}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>Share My Plans</Text>
          </View>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  activity: { fontSize: 24, fontWeight: 'bold', color: colors.primary, textTransform: 'capitalize' },
  dateTime: { fontSize: 16, color: colors.darkSecondary, marginTop: 4 },
  statusBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  membersScroll: { paddingHorizontal: 12 },
  memberCard: {
    width: 120, alignItems: 'center', padding: 12, marginHorizontal: 8,
    backgroundColor: colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  memberName: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  memberDetail: { fontSize: 12, color: colors.gray, textAlign: 'center', marginTop: 2 },
  venueCard: {
    marginHorizontal: 20, marginBottom: 8, padding: 12,
    backgroundColor: colors.surfaceElevated, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  venueName: { fontSize: 14, fontWeight: '600' },
  venueAddressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 },
  venueAddress: { fontSize: 12, color: colors.darkSecondary },
  mapsLink: { fontSize: 12, color: colors.info, fontWeight: '600' },
  venuePrice: { fontSize: 12, color: colors.primary, marginTop: 2 },
  icebreakerCard: { marginHorizontal: 20, marginBottom: 8, padding: 12, backgroundColor: colors.surfaceSelected, borderRadius: 8 },
  icebreakerText: { fontSize: 14, color: colors.dark, fontStyle: 'italic' },
  actions: { padding: 20, gap: 12 },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  shareButton: { backgroundColor: colors.info, paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  shareButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
