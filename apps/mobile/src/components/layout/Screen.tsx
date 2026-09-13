import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation, bottomNavigationHeight } from '@/components/layout/BottomNavigation';
import { colors, spacing } from '@/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = false, contentContainerStyle }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, styles.withBottomNavigation, contentContainerStyle]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, styles.flex, styles.withBottomNavigation, contentContainerStyle]}>
        {children}
      </View>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  withBottomNavigation: {
    paddingBottom: bottomNavigationHeight + spacing.md,
  },
  flex: {
    flex: 1,
  },
});
