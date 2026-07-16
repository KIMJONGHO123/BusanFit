import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { colors, spacing } from '@/theme';

type TravelTimeCardProps = {
  travelDate: string;
  startTime: string;
  endTime: string;
  onChangeTravelDate: (value: string) => void;
  onChangeStartTime: (value: string) => void;
  onChangeEndTime: (value: string) => void;
};

export function TravelTimeCard({
  travelDate,
  startTime,
  endTime,
  onChangeTravelDate,
  onChangeStartTime,
  onChangeEndTime,
}: TravelTimeCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>1</Text>
        </View>
        <View>
          <Text style={styles.title}>여행 시간 설정</Text>
          <Text style={styles.subtitle}>날짜와 이동 가능한 시간을 입력해주세요</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>여행 날짜</Text>
        <TextInput
          value={travelDate}
          onChangeText={onChangeTravelDate}
          placeholder="예: 2026-07-20"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.label}>시작 시간</Text>
          <TextInput
            value={startTime}
            onChangeText={onChangeStartTime}
            placeholder="08:00"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
        <View style={styles.timeField}>
          <Text style={styles.label}>종료 시간</Text>
          <TextInput
            value={endTime}
            onChangeText={onChangeEndTime}
            placeholder="17:00"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF',
  },
  iconText: {
    color: colors.primary,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
    gap: spacing.sm,
  },
});
