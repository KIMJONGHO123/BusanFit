import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAuthErrorMessage } from '@/api/auth';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/AuthContext';
import { colors, spacing } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (): Promise<void> => {
    // 서버로 요청하기 전에 앱에서 먼저 기본 입력값을 검사합니다.
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      Alert.alert('입력 확인', '올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    if (!password) {
      Alert.alert('입력 확인', '비밀번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // signIn 내부에서 /api/user/login 호출, 토큰 저장, 인증 상태 갱신을 처리합니다.
      await signIn({ email: trimmedEmail, password });
      router.replace('/');
    } catch (error) {
      Alert.alert('로그인 실패', getAuthErrorMessage(error, '이메일 또는 비밀번호를 확인해 주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="로그인 화면 닫기"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.replace('/')}>
              <Text style={styles.close}>x</Text>
            </Pressable>
            <Text style={styles.logo}>BusanFit</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>로그인하고 일정을 이어가세요</Text>
            <Text style={styles.description}>가입한 이메일과 비밀번호로 로그인해 주세요.</Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>이메일 주소</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="example@busanfit.com"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="비밀번호를 입력해 주세요"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupGuide}>아직 계정이 없나요?</Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={() => router.push('/signup')}>
                <Text style={styles.signupLink}>회원가입</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            disabled={isSubmitting}
            loading={isSubmitting}
            onPress={() => void handleLogin()}
            style={styles.submitButton}
            title="로그인"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { color: colors.textPrimary, fontSize: 24, fontWeight: '500', lineHeight: 28 },
  logo: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  headerSpacer: { width: 20 },
  content: { paddingTop: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', lineHeight: 36 },
  description: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.xl },
  submitButton: { width: '100%' },
  field: { gap: spacing.sm },
  label: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  input: {
    height: 52,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signupGuide: { color: colors.textSecondary, fontSize: 14 },
  signupLink: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 8,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 -3px 8px rgba(16, 24, 40, 0.08)' },
      default: {
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
    zIndex: 10,
  },
});
