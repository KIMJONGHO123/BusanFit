import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing } from '@/theme';

type AppButtonVariant = 'primary' | 'secondary';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: AppButtonVariant;
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => pressed && !isDisabled && styles.pressed}>
      <View
        pointerEvents="none"
        style={[
          styles.base,
          variant === 'primary' ? styles.primary : styles.secondary,
          isDisabled && styles.disabled,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} />
        ) : (
          <Text style={[styles.title, variant === 'secondary' && styles.secondaryTitle]}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  disabled: {
    backgroundColor: colors.disabled,
  },
  pressed: { opacity: 0.82 },
  title: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryTitle: {
    color: colors.primary,
  },
});
