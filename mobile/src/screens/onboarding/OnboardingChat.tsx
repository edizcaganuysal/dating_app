/**
 * OnboardingChat — The chat-bubble UI engine for conversational onboarding.
 * Renders Yuni AI messages as left-aligned chat bubbles with typing indicators.
 * Supports inline content (components rendered between chat bubbles).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { BouncingDots } from '../../components';
import { colors, fontFamilies, spacing, radii } from '../../theme';

const { width } = Dimensions.get('window');

export interface ChatMessage {
  id: string;
  type: 'yuni' | 'content' | 'user-choice';
  text?: string;
  content?: React.ReactNode;
  delay?: number; // ms before showing this message
}

interface OnboardingChatProps {
  messages: ChatMessage[];
  showTyping?: boolean;
  children?: React.ReactNode; // inline content at the bottom
  scrollEnabled?: boolean;
}

function YuniBubble({ text, index }: { text: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(300).springify()}
      style={styles.yuniBubbleContainer}
    >
      <View style={styles.yuniAvatar}>
        <Text style={styles.yuniAvatarText}>Y</Text>
      </View>
      <View style={styles.yuniBubble}>
        <Text style={styles.yuniBubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function UserChoiceBubble({ text, index }: { text: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(300).springify()}
      style={styles.userBubbleContainer}
    >
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={styles.yuniBubbleContainer}
    >
      <View style={styles.yuniAvatar}>
        <Text style={styles.yuniAvatarText}>Y</Text>
      </View>
      <View style={[styles.yuniBubble, styles.typingBubble]}>
        <BouncingDots color={colors.yuniAiPrimary} size={6} />
      </View>
    </Animated.View>
  );
}

export default function OnboardingChat({
  messages,
  showTyping = false,
  children,
  scrollEnabled = true,
}: OnboardingChatProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);

  // Progressive message reveal with delays
  useEffect(() => {
    setVisibleMessages([]);
    let timer: NodeJS.Timeout;
    let accumulated = 0;

    messages.forEach((msg, i) => {
      const delay = msg.delay ?? (msg.type === 'yuni' ? 600 : 0);
      accumulated += delay;

      timer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, msg]);
        // Auto-scroll
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, accumulated);
    });

    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
    >
      {visibleMessages.map((msg, index) => {
        if (msg.type === 'yuni' && msg.text) {
          return <YuniBubble key={msg.id} text={msg.text} index={index} />;
        }
        if (msg.type === 'user-choice' && msg.text) {
          return <UserChoiceBubble key={msg.id} text={msg.text} index={index} />;
        }
        if (msg.type === 'content' && msg.content) {
          return (
            <Animated.View
              key={msg.id}
              entering={FadeInUp.delay(100).duration(400).springify()}
              style={styles.contentBlock}
            >
              {msg.content}
            </Animated.View>
          );
        }
        return null;
      })}

      {showTyping && <TypingIndicator />}

      {children && (
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={styles.contentBlock}
        >
          {children}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  yuniBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    maxWidth: width * 0.85,
  },
  yuniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.yuniAiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  yuniAvatarText: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  yuniBubble: {
    backgroundColor: colors.yuniAiBubble,
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: width * 0.7,
    borderWidth: 1,
    borderColor: colors.yuniAiBorder,
  },
  typingBubble: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  yuniBubbleText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.dark,
  },
  userBubbleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    borderTopRightRadius: radii.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: width * 0.7,
  },
  userBubbleText: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: 15,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  contentBlock: {
    marginBottom: spacing.lg,
    marginLeft: 40, // Aligned with bubble content (avatar 32 + margin 8)
  },
});
