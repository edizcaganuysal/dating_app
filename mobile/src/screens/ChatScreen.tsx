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
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import useChat from '../hooks/useChat';
import { askGenie } from '../api/chat';
import { ChatMessage, GENIE_USER_ID } from '../types';

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
    try {
      await askGenie(roomId, question);
    } catch {
      // Response comes through WebSocket, error is silent
    } finally {
      setGenieLoading(false);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingHistory || messages.length === 0) return;
    setLoadingHistory(true);
    try {
      await loadHistory(messages[0]?.id);
    } catch {
      // Silently handle
    } finally {
      setLoadingHistory(false);
    }
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
      <View
        style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage]}
        testID={`message-${item.id}`}
      >
        {!isOwn && <Text style={styles.senderName}>{item.sender_name}</Text>}
        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{item.content}</Text>
        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
              <Text style={styles.genieTypingText}>Genie is thinking...</Text>
              <ActivityIndicator size="small" color="#7B1FA2" />
            </View>
          ) : (
            <Text style={styles.typingText}>{typingUser} is typing...</Text>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        {/* Genie Button */}
        <TouchableOpacity
          style={styles.genieButton}
          onPress={() => setGenieMenuVisible(true)}
          disabled={genieLoading}
        >
          <Text style={styles.genieButtonText}>🧞</Text>
        </TouchableOpacity>

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
          disabled={!text.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  connectionBanner: { backgroundColor: '#FF9800', padding: 4, alignItems: 'center' },
  connectionText: { color: '#fff', fontSize: 12 },
  messageList: { flex: 1, paddingHorizontal: 12 },

  // Regular messages
  messageBubble: { maxWidth: '75%', padding: 10, borderRadius: 16, marginVertical: 4 },
  ownMessage: { backgroundColor: '#E91E63', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '600', color: '#E91E63', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#333' },
  ownMessageText: { color: '#fff' },
  timestamp: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  ownTimestamp: { color: 'rgba(255,255,255,0.7)' },

  // Genie messages
  genieBubble: {
    maxWidth: '85%', alignSelf: 'center', marginVertical: 6,
    backgroundColor: '#F3E5F5', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#E1BEE7',
  },
  genieHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  genieEmoji: { fontSize: 16 },
  genieName: { fontSize: 12, fontWeight: '700', color: '#7B1FA2' },
  genieText: { fontSize: 14, color: '#333', lineHeight: 20 },
  genieTimestamp: { fontSize: 10, color: '#9E9E9E', marginTop: 6, alignSelf: 'flex-end' },

  // Typing
  typingContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  genieTypingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  genieTypingEmoji: { fontSize: 14 },
  genieTypingText: { fontSize: 12, color: '#7B1FA2', fontStyle: 'italic' },

  // Input bar
  inputContainer: {
    flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  genieButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E5F5',
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  genieButtonText: { fontSize: 20 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100, fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#E91E63', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontWeight: '600' },

  // Genie bottom sheet
  genieOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  genieSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  genieSheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: 16,
  },
  genieSheetTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 4 },
  genieSheetSub: { fontSize: 14, color: '#666', marginBottom: 16 },
  geniePreset: {
    backgroundColor: '#F3E5F5', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8,
  },
  geniePresetText: { fontSize: 15, color: '#4A148C', fontWeight: '600' },
  genieCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  genieCancelText: { fontSize: 15, color: '#999' },
});
