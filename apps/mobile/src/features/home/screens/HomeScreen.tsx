import { Href, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors, spacing } from '@/theme';

const plannerTimeRoute = '/planner/time' as Href;

export function HomeScreen() {
  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>B</Text>
        </View>
        <Text style={styles.brandName}>BusanFit</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>여행 일정 진단기</Text>
        <Text style={styles.description}>
          부산 여행 시간을 입력하고 일정이 가능한지 확인해보세요
        </Text>
      </View>

      <AppCard style={styles.visualCard}>
        <View style={styles.mapPreview}>
          <View style={[styles.pin, styles.pinOne]} />
          <View style={[styles.pin, styles.pinTwo]} />
          <View style={[styles.pin, styles.pinThree]} />
        </View>
        <View style={styles.checkCard}>
          <View style={styles.checkIcon}>
            <Text style={styles.checkIconText}>✓</Text>
          </View>
          <View>
            <Text style={styles.checkLabel}>FEASIBILITY CHECK</Text>
            <Text style={styles.checkTitle}>완벽한 타이밍</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.infoGrid}>
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoIcon}>◷</Text>
          <Text style={styles.infoLabel}>이동 시간</Text>
          <Text style={styles.infoTitle}>분 단위 계산</Text>
        </AppCard>
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoIcon}>△</Text>
          <Text style={styles.infoLabel}>혼잡도</Text>
          <Text style={styles.infoTitle}>실시간 반영</Text>
        </AppCard>
      </View>

      <AppButton title="일정 만들기 시작  →" onPress={() => router.push(plannerTimeRoute)} />

      <AppCard style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>최근 일정</Text>
        <Text style={styles.noticeText}>아직 저장된 일정이 없습니다. 첫 부산 여행 일정을 만들어보세요.</Text>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF',
  },
  logoText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  brandName: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  visualCard: {
    minHeight: 230,
    justifyContent: 'flex-end',
    backgroundColor: '#F9FBFF',
    overflow: 'hidden',
  },
  mapPreview: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: spacing.lg,
    borderRadius: 18,
    backgroundColor: '#EDF2F7',
    borderColor: colors.border,
    borderWidth: 1,
  },
  pin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  pinOne: {
    left: '25%',
    top: '36%',
  },
  pinTwo: {
    left: '56%',
    top: '24%',
  },
  pinThree: {
    right: '18%',
    bottom: '35%',
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  checkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  checkIconText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '900',
  },
  checkLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  checkTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoCard: {
    flex: 1,
    gap: spacing.xs,
  },
  infoIcon: {
    color: colors.primary,
    fontSize: 22,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  noticeCard: {
    gap: spacing.xs,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
