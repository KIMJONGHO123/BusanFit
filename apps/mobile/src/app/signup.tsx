import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
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

import { getAuthErrorMessage, signup } from '@/api/auth';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (): Promise<void> => {
    // 서버 validation 전에 사용자가 바로 이해할 수 있는 입력 오류를 먼저 보여줍니다.
    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNickname) {
      Alert.alert('입력 확인', '닉네임을 입력해 주세요.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      Alert.alert('입력 확인', '올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('입력 확인', '비밀번호는 8자 이상 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('입력 확인', '비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 회원가입은 계정 생성만 하고, 완료 후 로그인 화면으로 이동합니다.
      await signup({ email: trimmedEmail, password, nickname: trimmedNickname });
      Alert.alert('회원가입 완료', '가입이 완료되었습니다. 로그인해 주세요.');
      router.replace({ pathname: '/login', params: { email: trimmedEmail } });
    } catch (error) {
      Alert.alert('회원가입 실패', getAuthErrorMessage(error, '회원가입에 실패했습니다. 다시 시도해 주세요.'));
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
              accessibilityLabel="회원가입 화면 닫기"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.back()}>
              <Text style={styles.close}>x</Text>
            </Pressable>
            <Text style={styles.logo}>BusanFit</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.description}>계정을 만들면 로그인 후 일정을 저장할 수 있습니다.</Text>

            <View style={styles.form}>
              <FormField
                autoComplete="nickname"
                editable={!isSubmitting}
                label="닉네임"
                onChangeText={setNickname}
                placeholder="사용할 닉네임"
                value={nickname}
              />
              <FormField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                label="이메일 주소"
                onChangeText={setEmail}
                placeholder="example@busanfit.com"
                value={email}
              />
              <FormField
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isSubmitting}
                label="비밀번호"
                onChangeText={setPassword}
                placeholder="8자 이상 입력해 주세요"
                secureTextEntry
                value={password}
              />
              <FormField
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isSubmitting}
                label="비밀번호 확인"
                onChangeText={setPasswordConfirm}
                onSubmitEditing={() => void handleSignup()}
                placeholder="비밀번호를 한 번 더 입력해 주세요"
                returnKeyType="done"
                secureTextEntry
                value={passwordConfirm}
              />
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginGuide}>이미 계정이 있나요?</Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={() => router.replace('/login')}>
                <Text style={styles.loginLink}>로그인</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            disabled={isSubmitting}
            loading={isSubmitting}
            onPress={() => void handleSignup()}
            style={styles.submitButton}
            title="가입하기"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = ComponentProps<typeof TextInput> & { label: string };

function FormField({ label, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textSecondary} style={styles.input} {...inputProps} />
    </View>
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
  content: { paddingTop: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '800', lineHeight: 38 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
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
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginGuide: { color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 8,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 10,
  },
});
