import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getFriends,
  getPendingRequests,
  getMyFriendCode,
  addFriendByCode,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  Friend,
  PendingRequest,
  SearchResult,
} from '../api/friends';
import { colors } from '../theme';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [myCode, setMyCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingCode, setAddingCode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [friendsData, pendingData, codeData] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getMyFriendCode(),
      ]);
      setFriends(friendsData);
      setPending(pendingData);
      setMyCode(codeData.code);
    } catch {
      Alert.alert('Error', 'Failed to load friends data');
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

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Add me on LoveGenie! My friend code: ${myCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleAddByCode = async () => {
    if (!codeInput.trim()) {
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }
    setAddingCode(true);
    try {
      await addFriendByCode(codeInput.trim());
      Alert.alert('Success', 'Friend request sent!');
      setCodeInput('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Invalid friend code');
    } finally {
      setAddingCode(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults(prev => prev.filter(r => r.id !== userId));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to send request');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const handleRemove = (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.first_name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.id);
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* My Code */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Friend Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{myCode || '...'}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Friend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Friend</Text>

        {/* By Code */}
        <Text style={styles.subLabel}>Enter Friend Code</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Friend code"
            value={codeInput}
            onChangeText={setCodeInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.addButton, addingCode && styles.buttonDisabled]}
            onPress={handleAddByCode}
            disabled={addingCode}
          >
            {addingCode ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* By Search */}
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Search by Name or Email</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map(result => (
              <View key={result.id} style={styles.searchResultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>
                    {result.first_name} {result.last_name}
                  </Text>
                  {result.program && (
                    <Text style={styles.friendSub}>{result.program}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.sendRequestButton}
                  onPress={() => handleSendRequest(result.id)}
                >
                  <Ionicons name="person-add" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Requests</Text>
          {pending.map(req => (
            <View key={req.id} style={styles.pendingRow}>
              <Text style={styles.friendName}>{req.friend_name}</Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(req.id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(req.id)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Friends List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Friends {friends.length > 0 ? `(${friends.length})` : ''}
        </Text>
        {friends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet. Add some above!</Text>
        ) : (
          friends.map(friend => (
            <View key={friend.id} style={styles.friendRow}>
              {friend.photo_urls?.[0] ? (
                <Image source={{ uri: friend.photo_urls[0] }} style={styles.friendAvatar} />
              ) : (
                <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                  <Ionicons name="person" size={20} color={colors.grayLight} />
                </View>
              )}
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.first_name} {friend.last_name}</Text>
                <View style={styles.friendMeta}>
                  <View style={[
                    styles.genderBadge,
                    { backgroundColor: friend.gender === 'male' ? colors.info : colors.primary },
                  ]}>
                    <Text style={styles.genderText}>
                      {friend.gender === 'male' ? 'M' : 'F'}
                    </Text>
                  </View>
                  {friend.program && (
                    <Text style={styles.friendSub}>{friend.program}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemove(friend)}>
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceElevated },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceElevated,
  },
  card: {
    backgroundColor: colors.surfaceElevated, borderRadius: 12, padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 12 },
  subLabel: { fontSize: 13, fontWeight: '600', color: colors.darkSecondary, marginBottom: 6 },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 24, fontWeight: 'bold', color: colors.primary, letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  shareButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 15, backgroundColor: colors.surfaceElevated,
  },
  addButton: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  searchButton: {
    backgroundColor: colors.primary, padding: 10, borderRadius: 8,
  },
  searchResults: { marginTop: 12 },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sendRequestButton: {
    padding: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 20,
  },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pendingActions: { flexDirection: 'row', gap: 8 },
  acceptButton: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
  },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  rejectButton: {
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
  },
  rejectText: { color: colors.darkSecondary, fontSize: 13 },
  emptyText: { fontSize: 14, color: colors.gray, textAlign: 'center', paddingVertical: 16 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  friendAvatar: { width: 44, height: 44, borderRadius: 22 },
  friendAvatarPlaceholder: {
    backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  friendInfo: { flex: 1, marginLeft: 12 },
  friendName: { fontSize: 15, fontWeight: '600', color: colors.dark },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  friendSub: { fontSize: 13, color: colors.darkSecondary },
  genderBadge: {
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  genderText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
