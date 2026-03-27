/**
 * GroupVibeStep — Social energy + group role selection.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const GROUP_ROLES = [
  { value: 'Catalyst', emoji: '🎯', desc: 'You get things started' },
  { value: 'Entertainer', emoji: '🎭', desc: 'You keep everyone laughing' },
  { value: 'Listener', emoji: '👂', desc: "You're the one everyone opens up to" },
  { value: 'Planner', emoji: '📋', desc: 'You make sure everything goes smoothly' },
  { value: 'Flexible', emoji: '🌊', desc: 'You go with the flow' },
];

interface GroupVibeStepProps {
  phase: 'energy' | 'role';
  socialEnergy: number;
  setSocialEnergy: (v: number) => void;
  groupRole: string;
  setGroupRole: (r: string) => void;
  onEnergySet: (energy: number) => void;
  onRoleSelected: (role: string) => void;
}

export default function GroupVibeStep({
  phase, socialEnergy, setSocialEnergy, groupRole, setGroupRole,
  onEnergySet, onRoleSelected,
}: GroupVibeStepProps) {
  if (phase === 'energy') {
    const energyLabel = socialEnergy <= 2 ? '🌙 Quiet observer'
      : socialEnergy >= 4 ? '🔥 Life of the party'
      : '⚖️ Perfect balance';

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.container}>
        <View style={styles.energyDisplay}>
          <Text style={styles.energyEmoji}>
            {socialEnergy <= 2 ? '🌙' : socialEnergy >= 4 ? '🔥' : '⚖️'}
          </Text>
          <Text style={styles.energyLabel}>{energyLabel}</Text>
        </View>

        <Slider
          style={styles.slider}
          minimumValue={1} maximumValue={5} step={1}
          value={socialEnergy}
          onValueChange={(v: number) => setSocialEnergy(Math.round(v))}
          minimumTrackTintColor={colors.ember}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />

        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>🌙 Quiet</Text>
          <Text style={styles.sliderLabel}>🔥 Party</Text>
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={() => onEnergySet(socialEnergy)}>
          <Text style={styles.continueBtnText}>That's me!</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Role selection
  return (
    <View style={styles.container}>
      {GROUP_ROLES.map((role, i) => {
        const isSelected = groupRole === role.value;
        return (
          <Animated.View key={role.value} entering={FadeInDown.delay(i * 80).springify()}>
            <TouchableOpacity
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => {
                setGroupRole(role.value);
                onRoleSelected(role.value);
                sounds.pop();
              }}
            >
              <Text style={styles.roleEmoji}>{role.emoji}</Text>
              <View style={styles.roleContent}>
                <Text style={[styles.roleName, isSelected && styles.roleNameSelected]}>
                  {role.value}
                </Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </View>
              {isSelected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, gap: spacing.md },
  energyDisplay: {
    alignItems: 'center', marginBottom: spacing.xl,
  },
  energyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  energyLabel: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 18,
    color: colors.dark,
  },
  slider: { width: '100%', height: 40 },
  sliderLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sliderLabel: {
    fontFamily: fontFamilies.inter.regular, fontSize: 12,
    color: colors.gray,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: radii.md,
    alignItems: 'center', marginTop: spacing.xl,
  },
  continueBtnText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 15,
    color: '#FFFFFF',
  },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border, gap: spacing.md,
  },
  roleCardSelected: {
    borderColor: colors.primary, backgroundColor: colors.surfaceSelected,
  },
  roleEmoji: { fontSize: 28 },
  roleContent: { flex: 1 },
  roleName: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 16,
    color: colors.dark,
  },
  roleNameSelected: { color: colors.primary },
  roleDesc: {
    fontFamily: fontFamilies.inter.regular, fontSize: 13,
    color: colors.gray, marginTop: 2,
  },
  check: {
    fontFamily: fontFamilies.inter.bold, fontSize: 18,
    color: colors.primary,
  },
});
