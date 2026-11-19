import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TextField } from '@/components/ui/TextField';
import { Layout, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function RegisterScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const registerAccount = useSettingsStore((s) => s.registerAccount);
  const signInDemo = useSettingsStore((s) => s.signInDemo);
  const showToast = useSettingsStore((s) => s.showToast);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameError = submitted && !fullName.trim() ? 'Full name is required.' : undefined;
  const emailCheck = validateEmail(email);
  const passwordCheck = validatePassword(password);
  const confirmError =
    submitted && password !== confirmPassword ? 'Passwords do not match.' : undefined;

  const handleRegister = async () => {
    setSubmitted(true);
    if (nameError || !emailCheck.valid || !passwordCheck.valid || password !== confirmPassword) {
      return;
    }

    setSubmitting(true);
    try {
      await registerAccount(fullName, email);
      showToast('Local profile created for Stage 1 demo.', 'success');
      router.replace('/(tabs)/home');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccount = async () => {
    setSubmitting(true);
    try {
      await signInDemo();
      showToast('Signed in with Demo Account (Alex Morgan).', 'success');
      router.replace('/(tabs)/home');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground variant="home">
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={[styles.brandIcon, { backgroundColor: palette.primary }]}>
                  <AppIcon name="target" size={20} color="#ffffff" />
                </View>
                <Text style={[Typography.h3, { color: palette.text }]}>ProcrastiStop</Text>
              </View>
              <IconButton
                icon="arrow"
                accessibilityLabel="Back to sign in"
                onPress={() => router.replace('/(auth)/login')}
              />
            </View>

            <View style={styles.headerCopy}>
              <Text style={[Typography.h1, { color: palette.text, fontSize: 29 }]}>
                Create your account
              </Text>
              <Text style={[Typography.body, { color: palette.textMuted, marginTop: 6 }]}>
                Start protecting focused blocks for the deadlines that matter most.
              </Text>
            </View>

            <View style={styles.form}>
              <TextField
                label="Full name"
                placeholder="Alex Morgan"
                icon="user"
                value={fullName}
                onChangeText={setFullName}
                error={nameError}
              />

              <TextField
                label="Email address"
                placeholder="you@example.com"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={submitted && !emailCheck.valid ? emailCheck.error : undefined}
              />

              <TextField
                label="Password"
                placeholder="At least 6 characters"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={submitted && !passwordCheck.valid ? passwordCheck.error : undefined}
              />

              <TextField
                label="Confirm password"
                placeholder="Repeat your password"
                icon="lock"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                error={confirmError}
              />

              <PrimaryButton
                title="Create account"
                tone="energy"
                onPress={handleRegister}
                loading={submitting}
              />

              <SecondaryButton
                title="Continue with Demo Account"
                icon="spark"
                onPress={handleDemoAccount}
                disabled={submitting}
                fullWidth
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                  Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    gap: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    marginTop: Spacing.sm,
  },
  form: {
    gap: Spacing.md + 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
