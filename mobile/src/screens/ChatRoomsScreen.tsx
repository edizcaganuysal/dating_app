import React, { useState, useCallback } from 'react';
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
import { getChatRooms } from '../api/chat';
import { ChatRoom } from '../types';

export default function ChatRoomsScreen() {
  const navigation = useNavigation<any>();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await getChatRooms();
      setRooms(data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const getRoomTitle = (room: ChatRoom): string => {
    if (room.room_type === '1v1') {
      return room.participants.map((p) => p.first_name).join(', ');
    }
    return `Group Chat (${room.participants.length})`;
  };

  const getRoomSubtitle = (room: ChatRoom): string => {
    if (room.room_type === 'group') {
      return room.participants.map((p) => p.first_name).join(', ');
    }
    return 'Direct message';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>
            Get matched with a group to start chatting!
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.roomItem}
          onPress={() => navigation.navigate('ChatDetail', { roomId: item.id })}
          testID={`room-${item.id}`}
        >
          <View style={styles.roomAvatar}>
            <Text style={styles.avatarText}>
              {item.room_type === '1v1' ? '\u2764' : '\u{1F465}'}
            </Text>
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomTitle}>{getRoomTitle(item)}</Text>
            <Text style={styles.roomSubtitle} numberOfLines={1}>
              {getRoomSubtitle(item)}
            </Text>
            {item.last_message && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.last_message.content}
              </Text>
            )}
          </View>
          {item.last_message && (
            <Text style={styles.time}>
              {new Date(item.last_message.created_at).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      )}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
  roomItem: {
    flexDirection: 'row', padding: 16, borderBottomWidth: 1,
    borderBottomColor: '#eee', alignItems: 'center',
  },
  roomAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20 },
  roomInfo: { flex: 1 },
  roomTitle: { fontSize: 16, fontWeight: '600' },
  roomSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  lastMessage: { fontSize: 13, color: '#666', marginTop: 2 },
  time: { fontSize: 11, color: '#999' },
});
