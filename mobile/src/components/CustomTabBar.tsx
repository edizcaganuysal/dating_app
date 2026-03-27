import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies, spacing, radii } from '../theme';
import * as Haptics from 'expo-haptics';

const AnimatedText = Animated.Text;

interface TabConfig {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'MyDates', label: 'My Dates', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'Chat', label: 'Chat', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

function TabItem({
  tab,
  isFocused,
  onPress,
  onLongPress,
  badge,
}: {
  tab: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(1.1, { damping: 15, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    Haptics.selectionAsync();
    onPress();
  };

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
        <Ionicons
          name={isFocused ? tab.iconFocused : tab.icon}
          size={22}
          color={isFocused ? colors.primary : colors.gray}
        />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <AnimatedText style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </AnimatedText>
          </View>
        )}
      </Animated.View>
      <AnimatedText
        style={[
          styles.tabLabel,
          { color: isFocused ? colors.primary : colors.gray },
        ]}
      >
        {tab.label}
      </AnimatedText>
      {isFocused && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.tabRow}>
          {state.routes.map((route: any, index: number) => {
            const tab = TABS.find(t => t.name === route.name) || TABS[0];
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            const badge = options.tabBarBadge;

            return (
              <TabItem
                key={route.key}
                tab={tab}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                badge={badge}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 221, 215, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#241C1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
      },
    }),
  },
  tabRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 10,
    lineHeight: 14,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.firelight,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 9,
    lineHeight: 12,
    color: colors.coal,
  },
});
