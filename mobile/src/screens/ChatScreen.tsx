import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import useChat from '../hooks/useChat';
import { askYuniAi } from '../api/chat';
import { getMyMatches, getSecondDateSuggestions, proposeSecondDate } from '../api/dates';
import { ChatMessage, YUNI_AI_USER_ID, SecondDateSuggestion, Match } from '../types';
import { colors, spacing, typography, radii } from '../theme';
import { UserAvatar, RelativeTimestamp, PressableScale, BouncingDots, DateSuggestionCard } from '../components';
import { markRoomRead } from '../hooks/useUnreadCount';
import { useFadeIn } from '../utils/animations';

const YUNI_PRESETS = [
  { label: 'Suggest a venue', question: 'Can you suggest some good venues for our date?' },
  { label: 'What should we wear?', question: 'What should we wear to this date?' },
  { label: 'Conversation starter', question: 'Give us a fun conversation starter!' },
  { label: 'Help us decide', question: 'Help us make a decision about planning.' },
  { label: 'Planning tips', question: 'Any tips for planning our date?' },
];

export default function ChatScreen() {
  const route = useRoute<any>();
  const { roomId } = route.params;
  const { user, token } = useAuth();
  const { messages, isConnected, sendMessage, sendTyping, loadHistory, typingUser } = useChat(
    roomId,
    token || '',
  );

  React.useEffect(() => { markRoomRead(roomId); }, [roomId]);

  const [text, setText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [yuniMenuVisible, setYuniMenuVisible] = useState(false);
  const [yuniLoading, setYuniLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [suggestions, setSuggestions] = useState<SecondDateSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    getMyMatches()
      .then((matches) => {
        const match = matches.find((m) => m.chat_room_id === roomId);
        if (match) {
          getSecondDateSuggestions(match.id)
            .then((s) => setSuggestions(s.filter((x) => x.status === 'suggested')))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [roomId]);

  const handlePropose = async (secondDateId: string) => {
    setProposing(true);
    try {
      await proposeSecondDate(secondDateId);
      setSuggestions((prev) => prev.filter((s) => s.id !== secondDateId));
      Alert.alert('Date Proposed!', 'Your match will be notified.');
    } catch {
      Alert.alert('Error', 'Could not propose date. Try again.');
    } finally {
      setProposing(false);
    }
  };

  const handleSkipSuggestion = () => {
    setSuggestionIndex((prev) => (prev + 1) % Math.max(suggestions.length, 1));
  };

  const currentSuggestion = suggestions.length > 0 ? suggestions[suggestionIndex % suggestions.length] : null;

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    sendMessage(content);
    setText('');
  };

  const handleTextChange = (value: string) => {
    setText(value);
    sendTyping();
  };

  const handleAskYuni = async (question: string) => {
    setYuniMenuVisible(false);
    setYuniLoading(true);
    try { await askYuniAi(roomId, question); } catch {} finally { setYuniLoading(false); }
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingHistory || messages.length === 0) return;
    setLoadingHistory(true);
    try { await loadHistory(messages[0]?.id); } catch {} finally { setLoadingHistory(false); }
  }, [loadingHistory, messages, loadHistory]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === user?.id;
    const isYuniAi = item.sender_id === YUNI_AI_USER_ID;

    if (isYuniAi) {
      return (
        <View style={styles.yuniAiBubble} testID={`message-${item.id}`}>
          <View style={styles.yuniAiHeader}>
            <Text style={styles.yuniAiEmoji}>✨</Text>
            <Text style={styles.yuniAiName}>Yuni AI</Text>
          </View>
          <Text style={styles.yuniAiText}>{item.content}</Text>
          <Text style={styles.yuniAiTimestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]} testID={`message-${item.id}`}>
        {!isOwn && (
          <UserAvatar firstName={item.sender_name || '?'} size="xs" style={{ marginRight: spacing.sm, marginTop: 2 }} />
        )}
        <View style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {!isOwn && <Text style={styles.senderName}>{item.sender_name}</Text>}
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{item.content}</Text>
          <RelativeTimestamp
            dateString={item.created_at}
            variant="short"
            style={isOwn ? styles.ownTimestamp : styles.timestamp}
          />
        </View>
      </View>
    );
  };

  const isYuniTyping = typingUser === 'Yuni AI';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}

      {currentSuggestion && (
        <DateSuggestionCard
          suggestion={currentSuggestion}
          onPropose={handlePropose}
          onSkip={handleSkipSuggestion}
          loading={proposing}
        />
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        style={styles.messageList}
        testID="message-list"
      />

      {(typingUser || yuniLoading) && (
        <View style={styles.typingContainer}>
          {isYuniTyping || yuniLoading ? (
            <View style={styles.yuniAiTypingRow}>
              <Text style={styles.yuniAiTypingEmoji}>✨</Text>
              <Text style={styles.yuniAiTypingText}>Yuni AI</Text>
              <BouncingDots color="#7B1FA2" />
            </View>
          ) : (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>{typingUser}</Text>
              <BouncingDots color={colors.gray} />
            </View>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <PressableScale
          style={styles.yuniAiButton}
          onPress={() => setYuniMenuVisible(true)}
          disabled={yuniLoading}
        >
          <Text style={styles.yuniAiButtonText}>✨</Text>
        </PressableScale>

        <TextInput
          testID="message-input"
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          testID="send-button"
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          activeOpacity={0.7}
        >
          <Ionicons
            name={text.trim() ? 'send' : 'mic-outline'}
            size={20}
            color={text.trim() ? '#fff' : colors.gray}
          />
        </TouchableOpacity>
      </View>

      {/* Yuni AI Menu */}
      <Modal visible={yuniMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.yuniAiOverlay} activeOpacity={1} onPress={() => setYuniMenuVisible(false)}>
          <View style={styles.yuniAiSheet}>
            <View style={styles.yuniAiSheetHandle} />
            <Text style={styles.yuniAiSheetTitle}>✨ Ask Yuni AI</Text>
            <Text style={styles.yuniAiSheetSub}>Your AI date planning assistant</Text>
            {YUNI_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={styles.yuniAiPreset}
                onPress={() => handleAskYuni(preset.question)}
              >
                <Text style={styles.yuniAiPresetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.yuniAiCancel} onPress={() => setYuniMenuVisible(false)}>
              <Text style={styles.yuniAiCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceElevated },
  connectionBanner: { backgroundColor: colors.warning, padding: 4, alignItems: 'center' },
  connectionText: { color: '#fff', fontSize: 12 },
  messageList: { flex: 1, paddingHorizontal: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2, justifyContent: 'flex-start' },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '70%', padding: 10, borderRadius: 16, marginVertical: 2 },
  ownMessage: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: colors.otherMessage, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  messageText: { fontSize: 15, color: colors.dark },
  ownMessageText: { color: '#fff' },
  timestamp: { fontSize: 10, color: colors.gray, marginTop: 4, alignSelf: 'flex-end' },
  ownTimestamp: { color: 'rgba(255,255,255,0.7)' },
  yuniAiBubble: {
    maxWidth: '85%', alignSelf: 'center', marginVertical: 6,
    backgroundColor: colors.yuniAiBubble, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.yuniAiBorder,
  },
  yuniAiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  yuniAiEmoji: { fontSize: 16 },
  yuniAiName: { fontSize: 12, fontWeight: '700', color: colors.yuniAiPrimary },
  yuniAiText: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  yuniAiTimestamp: { fontSize: 10, color: '#9E9E9E', marginTop: 6, alignSelf: 'flex-end' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: colors.gray, fontStyle: 'italic' },
  yuniAiTypingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yuniAiTypingEmoji: { fontSize: 14 },
  yuniAiTypingText: { fontSize: 12, color: colors.yuniAiPrimary, fontStyle: 'italic', marginRight: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputContainer: {
    flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  yuniAiButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.yuniAiBubble,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  yuniAiButtonText: { fontSize: 20 },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100, fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: colors.grayLight },
  sendIconContainer: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  yuniAiOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  yuniAiSheet: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  yuniAiSheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  yuniAiSheetTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  yuniAiSheetSub: { fontSize: 14, color: colors.darkSecondary, marginBottom: 16 },
  yuniAiPreset: {
    backgroundColor: colors.yuniAiBubble, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8,
  },
  yuniAiPresetText: { fontSize: 15, color: '#4A148C', fontWeight: '600' },
  yuniAiCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  yuniAiCancelText: { fontSize: 15, color: colors.gray },
});
