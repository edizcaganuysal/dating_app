import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import useChat from '../hooks/useChat';
import { askGenie } from '../api/chat';
import { ChatMessage, GENIE_USER_ID } from '../types';
import { colors, spacing, typography, radii } from '../theme';
import { UserAvatar, RelativeTimestamp, PressableScale, BouncingDots } from '../components';
import { markRoomRead } from '../hooks/useUnreadCount';
import { useFadeIn } from '../utils/animations';

const GENIE_PRESETS = [
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
  const [genieMenuVisible, setGenieMenuVisible] = useState(false);
  const [genieLoading, setGenieLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  const handleAskGenie = async (question: string) => {
    setGenieMenuVisible(false);
    setGenieLoading(true);
    try { await askGenie(roomId, question); } catch {} finally { setGenieLoading(false); }
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingHistory || messages.length === 0) return;
    setLoadingHistory(true);
    try { await loadHistory(messages[0]?.id); } catch {} finally { setLoadingHistory(false); }
  }, [loadingHistory, messages, loadHistory]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === user?.id;
    const isGenie = item.sender_id === GENIE_USER_ID;

    if (isGenie) {
      return (
        <View style={styles.genieBubble} testID={`message-${item.id}`}>
          <View style={styles.genieHeader}>
            <Text style={styles.genieEmoji}>🧞</Text>
            <Text style={styles.genieName}>Genie</Text>
          </View>
          <Text style={styles.genieText}>{item.content}</Text>
          <Text style={styles.genieTimestamp}>
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

  const isGenieTyping = typingUser === 'Genie';

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

      {(typingUser || genieLoading) && (
        <View style={styles.typingContainer}>
          {isGenieTyping || genieLoading ? (
            <View style={styles.genieTypingRow}>
              <Text style={styles.genieTypingEmoji}>🧞</Text>
              <Text style={styles.genieTypingText}>Genie</Text>
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
          style={styles.genieButton}
          onPress={() => setGenieMenuVisible(true)}
          disabled={genieLoading}
        >
          <Text style={styles.genieButtonText}>🧞</Text>
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

      {/* Genie Menu */}
      <Modal visible={genieMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.genieOverlay} activeOpacity={1} onPress={() => setGenieMenuVisible(false)}>
          <View style={styles.genieSheet}>
            <View style={styles.genieSheetHandle} />
            <Text style={styles.genieSheetTitle}>🧞 Ask Genie</Text>
            <Text style={styles.genieSheetSub}>Your AI date planning assistant</Text>
            {GENIE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={styles.geniePreset}
                onPress={() => handleAskGenie(preset.question)}
              >
                <Text style={styles.geniePresetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.genieCancel} onPress={() => setGenieMenuVisible(false)}>
              <Text style={styles.genieCancelText}>Cancel</Text>
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
  genieBubble: {
    maxWidth: '85%', alignSelf: 'center', marginVertical: 6,
    backgroundColor: '#F3E5F5', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#E1BEE7',
  },
  genieHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  genieEmoji: { fontSize: 16 },
  genieName: { fontSize: 12, fontWeight: '700', color: '#7B1FA2' },
  genieText: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  genieTimestamp: { fontSize: 10, color: '#9E9E9E', marginTop: 6, alignSelf: 'flex-end' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: colors.gray, fontStyle: 'italic' },
  genieTypingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  genieTypingEmoji: { fontSize: 14 },
  genieTypingText: { fontSize: 12, color: '#7B1FA2', fontStyle: 'italic', marginRight: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputContainer: {
    flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  genieButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E5F5',
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  genieButtonText: { fontSize: 20 },
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
  genieOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  genieSheet: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  genieSheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  genieSheetTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  genieSheetSub: { fontSize: 14, color: colors.darkSecondary, marginBottom: 16 },
  geniePreset: {
    backgroundColor: '#F3E5F5', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8,
  },
  geniePresetText: { fontSize: 15, color: '#4A148C', fontWeight: '600' },
  genieCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  genieCancelText: { fontSize: 15, color: colors.gray },
});
