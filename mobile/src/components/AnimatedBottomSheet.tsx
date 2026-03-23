import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { colors, typography, spacing, radii } from '../theme';

interface AnimatedBottomSheetProps {
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
  title?: string;
  scrollable?: boolean;
  enableDynamicSizing?: boolean;
}

const AnimatedBottomSheetComponent = forwardRef<BottomSheet, AnimatedBottomSheetProps>(
  ({ snapPoints: snapPointsProp, children, onClose, title, scrollable = false, enableDynamicSizing = false }, ref) => {
    const snapPoints = useMemo(() => snapPointsProp ?? ['50%'], [snapPointsProp]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    const handleSheetChanges = useCallback((index: number) => {
      if (index === -1) onClose?.();
    }, [onClose]);

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={enableDynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        <ContentWrapper style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </ContentWrapper>
      </BottomSheet>
    );
  },
);

AnimatedBottomSheetComponent.displayName = 'AnimatedBottomSheet';

export default AnimatedBottomSheetComponent;

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  handle: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.dark,
    marginBottom: spacing.lg,
  },
});
