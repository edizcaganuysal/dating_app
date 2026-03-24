import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getChatRooms } from '../api/chat';
import { ChatRoom } from '../types';
import { colors, typography, spacing, radii } from '../theme';
import { UserAvatar, RelativeTimestamp, EmptyState, PressableScale, SkeletonRow } from '../components';
import { useAuth } from '../context/AuthContext';
import { markRoomRead } from '../hooks/useUnreadCount';
import { useStaggerItem } from '../utils/animations';

function ChatRoomItem({ room, index, user, onPress }: { room: ChatRoom; index: number; user: any; onPress: () => void }) {
  const fadeStyle = useStaggerItem(index, 50, 'right');

  const getRoomTitle = (): string => {
    if (room.room_type === '1v1') {
      const other = room.participants.find(p => p.user_id !== user?.id);
      return other?.first_name || room.participants.map(p => p.first_name).join(', ');
    }
    return `Group Chat (${room.participants.length})`;
  };

  const getOtherName = (): string => {
    const other = room.participants.find(p => p.user_id !== user?.id);
    return other?.first_name || '?';
  };

  return (
    <Animated.View style={fadeStyle}>
      <PressableScale style={styles.roomItem} onPress={onPress}>
        {room.room_type === '1v1' ? (
          <UserAvatar firstName={getOtherName()} size="md" />
        ) : (
          <View style={styles.groupAvatarStack}>
            {room.participants.slice(0, 3).map((p, i) => (
              <View key={p.user_id} style={[styles.miniAvatar, { left: i * 12, zIndex: 3 - i }]}>
                <UserAvatar firstName={p.first_name} size="xs" borderColor={colors.surfaceElevated} borderWidth={1.5} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.roomInfo}>
          <Text style={styles.roomTitle} numberOfLines={1}>{getRoomTitle()}</Text>
          {room.room_type === 'group' && (
            <Text style={styles.roomSubtitle} numberOfLines={1}>
              {room.participants.map(p => p.first_name).join(', ')}
            </Text>
          )}
          {room.last_message && (
            <Text style={styles.lastMessage} numberOfLines={1}>{room.last_message.content}</Text>
          )}
        </View>

        {room.last_message && (
          <RelativeTimestamp dateString={room.last_message.created_at} variant="short" />
        )}
      </PressableScale>
    </Animated.View>
  );
}

export default function ChatRoomsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try { const data = await getChatRooms(); setRooms(data); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadRooms(); }, []));

  const handleOpenRoom = (room: ChatRoom) => {
    markRoomRead(room.id);
    navigation.navigate('ChatDetail', { roomId: room.id });
  };

  if (loading) return (
    <View style={styles.container}>
      <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
    </View>
  );

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRooms(); }} tintColor={colors.primary} />}
      style={styles.container}
      ListEmptyComponent={
        <EmptyState icon="chatbubbles-outline" title="No chats yet" description="Get matched with a group to start chatting!" />
      }
      renderItem={({ item, index }) => (
        <ChatRoomItem room={item} index={index} user={user} onPress={() => handleOpenRoom(item)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  roomItem: {
    flexDirection: 'row', padding: spacing.lg, borderBottomWidth: 1,
    borderBottomColor: colors.borderLight, alignItems: 'center',
    backgroundColor: colors.surfaceElevated, gap: spacing.md,
  },
  groupAvatarStack: { width: 48, height: 48, position: 'relative' },
  miniAvatar: { position: 'absolute', top: 12 },
  roomInfo: { flex: 1 },
  roomTitle: { ...typography.labelLarge, color: colors.dark },
  roomSubtitle: { ...typography.caption, color: colors.gray, marginTop: spacing.xxs },
  lastMessage: { ...typography.bodySmall, color: colors.darkSecondary, marginTop: spacing.xxs },
});
