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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import useChat from '../hooks/useChat';
import { ChatMessage } from '../types';

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

      {typingUser && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingUser} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  connectionBanner: {
    backgroundColor: '#FF9800', padding: 4, alignItems: 'center',
  },
  connectionText: { color: '#fff', fontSize: 12 },
  messageList: { flex: 1, paddingHorizontal: 12 },
  messageBubble: {
    maxWidth: '75%', padding: 10, borderRadius: 16, marginVertical: 4,
  },
  ownMessage: {
    backgroundColor: '#E91E63', alignSelf: 'flex-end', borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '600', color: '#E91E63', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#333' },
  ownMessageText: { color: '#fff' },
  timestamp: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  ownTimestamp: { color: 'rgba(255,255,255,0.7)' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
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
});
