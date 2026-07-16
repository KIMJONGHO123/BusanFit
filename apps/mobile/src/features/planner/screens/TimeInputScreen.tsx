import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { TravelTimeCard } from '@/features/planner/components/TravelTimeCard';
import { colors, spacing } from '@/theme';

function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function TimeInputScreen() {
  const [travelDate, setTravelDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [message, setMessage] = useState('');

  const handleNext = () => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (!travelDate.trim()) {
      setMessage('여행 날짜를 입력해주세요.');
      return;
    }

    if (startMinutes === null) {
      setMessage('시작 시간을 08:00 형식으로 입력해주세요.');
      return;
    }

    if (endMinutes === null) {
      setMessage('종료 시간을 17:00 형식으로 입력해주세요.');
      return;
    }

    if (endMinutes <= startMinutes) {
      setMessage('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    setMessage('시간 입력이 완료되었습니다. 다음 단계는 관광지 선택 화면에서 연결됩니다.');
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <AppButton title="←" variant="secondary" onPress={() => router.back()} style={styles.backButton} />
        <View>
          <Text style={styles.brand}>BusanFit</Text>
          <Text style={styles.step}>1단계 · 여행 기본정보</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>부산 여행 계획하기</Text>
        <Text style={styles.description}>가장 효율적인 경로를 계산할 수 있도록 여행 시간을 먼저 알려주세요.</Text>
      </View>

      <TravelTimeCard
        travelDate={travelDate}
        startTime={startTime}
        endTime={endTime}
        onChangeTravelDate={setTravelDate}
        onChangeStartTime={setStartTime}
        onChangeEndTime={setEndTime}
      />

      {message ? (
        <View
          style={[
            styles.messageBox,
            message.includes('완료') ? styles.successMessage : styles.errorMessage,
          ]}>
          <Text
            style={[
              styles.messageText,
              message.includes('완료') ? styles.successText : styles.errorText,
            ]}>
            {message}
          </Text>
        </View>
      ) : null}

      <AppButton title="다음 단계" onPress={handleNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 48,
    minHeight: 48,
    paddingHorizontal: 0,
  },
  brand: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  step: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  header: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  messageBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorMessage: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  successMessage: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
  },
});
