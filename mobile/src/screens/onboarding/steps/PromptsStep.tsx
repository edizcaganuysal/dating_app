/**
 * PromptsStep — Expandable prompt cards with answer options.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const PROMPTS = [
  "My ideal first date would be...",
  "The quickest way to my heart is...",
  "I'm looking for someone who...",
  "On a Sunday morning you'll find me...",
  "I geek out about...",
  "My friends would describe me as...",
  "A dealbreaker for me is...",
  "My love language is...",
  "The most spontaneous thing I've done is...",
  "I'll never shut up about...",
];

const PROMPT_OPTIONS: Record<string, string[]> = {
  "My ideal first date would be...": ["Dinner and deep conversation", "Something adventurous outdoors", "Cozy movie night", "Exploring a new neighborhood", "Cooking together", "A museum or gallery", "Live music and drinks", "Coffee and a long walk"],
  "The quickest way to my heart is...": ["Making me laugh", "Thoughtful surprises", "Quality time together", "Good food", "Deep late-night conversations", "A handwritten note", "Planning something special", "Being genuinely curious about my life"],
  "I'm looking for someone who...": ["Makes me laugh until I cry", "Is ambitious and driven", "Loves adventure", "Can hold a deep conversation", "Is kind to everyone", "Doesn't take themselves too seriously", "Shares my values", "Challenges me to grow"],
  "On a Sunday morning you'll find me...": ["At brunch with friends", "Sleeping in and reading", "At the gym or on a run", "At the farmers market", "Binge-watching something", "Cooking a big breakfast", "Hiking somewhere scenic", "Doing absolutely nothing"],
  "I geek out about...": ["Music and concerts", "Sports stats", "True crime podcasts", "Tech and startups", "History and culture", "Space and astronomy", "Cooking techniques", "Film theory"],
  "My friends would describe me as...": ["The planner of the group", "The life of the party", "The therapist friend", "Always down for anything", "Loyal to a fault", "The funny one", "The chill one", "The adventurous one"],
  "A dealbreaker for me is...": ["Not having a sense of humor", "Being closed-minded", "Poor communication", "Not being ambitious", "Being rude to strangers", "Not liking animals", "No emotional intelligence", "Being too competitive"],
  "My love language is...": ["Words of affirmation", "Quality time", "Physical touch", "Acts of service", "Gift giving", "Cooking for someone", "Planning thoughtful experiences", "Writing letters"],
  "The most spontaneous thing I've done is...": ["Booked a last-minute trip", "Went skydiving", "Moved to a new city alone", "Said yes to a blind date", "Quit my job to follow a dream", "Road trip with no plan"],
  "I'll never shut up about...": ["My latest Netflix obsession", "That one trip I took", "My pet", "This amazing restaurant I found", "The book I'm reading", "My side project", "A conspiracy theory", "My workout routine"],
};

interface PromptsStepProps {
  selectedPrompts: { prompt: string; answer: string }[];
  setSelectedPrompts: (p: { prompt: string; answer: string }[]) => void;
  customPromptTexts: Record<string, string>;
  setCustomPromptTexts: (t: Record<string, string>) => void;
  onPromptAdded: (count: number) => void;
}

export default function PromptsStep({
  selectedPrompts, setSelectedPrompts,
  customPromptTexts, setCustomPromptTexts,
  onPromptAdded,
}: PromptsStepProps) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const addPrompt = (prompt: string, answer: string) => {
    if (selectedPrompts.length >= 3) return;
    const updated = [...selectedPrompts, { prompt, answer }];
    setSelectedPrompts(updated);
    setExpandedPrompt(null);
    sounds.chime();
    onPromptAdded(updated.length);
  };

  const removePrompt = (index: number) => {
    const prompt = selectedPrompts[index].prompt;
    const updated = selectedPrompts.filter((_, i) => i !== index);
    setSelectedPrompts(updated);
    const ct = { ...customPromptTexts };
    delete ct[prompt];
    setCustomPromptTexts(ct);
  };

  const availablePrompts = PROMPTS.filter(p => !selectedPrompts.some(sp => sp.prompt === p));

  return (
    <View style={styles.container}>
      {/* Selected prompts */}
      {selectedPrompts.map((sp, i) => {
        const isCustom = sp.answer === '__custom__';
        return (
          <Animated.View key={sp.prompt} entering={FadeIn.duration(300)} style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptQuestion}>{sp.prompt}</Text>
              <TouchableOpacity onPress={() => removePrompt(i)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {isCustom ? (
              <TextInput
                style={styles.customInput}
                placeholder="Type your answer..."
                placeholderTextColor={colors.grayLight}
                value={customPromptTexts[sp.prompt] || ''}
                onChangeText={t => setCustomPromptTexts({ ...customPromptTexts, [sp.prompt]: t.slice(0, 120) })}
                maxLength={120}
                autoFocus
              />
            ) : (
              <Text style={styles.promptAnswer}>{sp.answer}</Text>
            )}
          </Animated.View>
        );
      })}

      {/* Available prompts */}
      {selectedPrompts.length < 3 && availablePrompts.length > 0 && (
        <View style={styles.availableSection}>
          {availablePrompts.slice(0, 4).map((prompt, i) => (
            <Animated.View key={prompt} entering={FadeInDown.delay(i * 80).springify()}>
              <TouchableOpacity
                style={[styles.promptOption, expandedPrompt === prompt && styles.promptOptionExpanded]}
                onPress={() => setExpandedPrompt(expandedPrompt === prompt ? null : prompt)}
              >
                <Text style={styles.promptOptionTitle}>{prompt}</Text>
                <Text style={styles.expandIcon}>{expandedPrompt === prompt ? '−' : '+'}</Text>
              </TouchableOpacity>

              {expandedPrompt === prompt && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.answersContainer}>
                  <View style={styles.chipRow}>
                    {(PROMPT_OPTIONS[prompt] || []).map(ans => (
                      <TouchableOpacity
                        key={ans} style={styles.answerChip}
                        onPress={() => addPrompt(prompt, ans)}
                      >
                        <Text style={styles.answerChipText}>{ans}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.answerChip, styles.customChip]}
                      onPress={() => addPrompt(prompt, '__custom__')}
                    >
                      <Text style={styles.customChipText}>✏️ Write my own...</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          ))}
        </View>
      )}

      <Text style={styles.statusText}>
        {selectedPrompts.length < 2
          ? `Pick ${2 - selectedPrompts.length} more prompt${selectedPrompts.length === 1 ? '' : 's'}`
          : selectedPrompts.length < 3
            ? "Looking good! Add one more or continue"
            : "All 3 prompts filled! 🎉"
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, gap: spacing.md },
  promptCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.primary,
  },
  promptHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  promptQuestion: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 14,
    color: colors.primary, flex: 1,
  },
  removeBtn: {
    fontFamily: fontFamilies.inter.bold, fontSize: 16,
    color: colors.gray, paddingLeft: spacing.sm,
  },
  promptAnswer: {
    fontFamily: fontFamilies.inter.medium, fontSize: 15,
    color: colors.dark,
  },
  customInput: {
    fontFamily: fontFamilies.inter.regular, fontSize: 15,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm,
    padding: spacing.md, color: colors.dark, backgroundColor: colors.cream,
  },
  availableSection: { gap: spacing.sm },
  promptOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  promptOptionExpanded: { borderColor: colors.primaryLight, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  promptOptionTitle: {
    fontFamily: fontFamilies.inter.medium, fontSize: 14,
    color: colors.dark, flex: 1,
  },
  expandIcon: {
    fontFamily: fontFamilies.inter.bold, fontSize: 20,
    color: colors.primary,
  },
  answersContainer: {
    backgroundColor: colors.cream, padding: spacing.md,
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.primaryLight,
    borderBottomLeftRadius: radii.md, borderBottomRightRadius: radii.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  answerChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radii.xl, backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  answerChipText: {
    fontFamily: fontFamilies.inter.regular, fontSize: 13,
    color: colors.dark,
  },
  customChip: { borderColor: colors.primary, borderStyle: 'dashed' },
  customChipText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 13,
    color: colors.primary,
  },
  statusText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 13,
    color: colors.gray, textAlign: 'center', marginTop: spacing.sm,
  },
});
