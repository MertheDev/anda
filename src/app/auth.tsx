import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { credentialsSchema, displayNameSchema, useAuth } from '@/lib/auth';
import { cleanText } from '@/lib/security';
import { colors, radius } from '@/theme';

export default function AuthScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const credentials = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!credentials.success) {
      const emailBad = credentials.error.issues.some((i) => i.path[0] === 'email');
      setError(t(emailBad ? 'auth.invalidEmail' : 'auth.shortPassword'));
      return;
    }
    if (mode === 'signUp' && !displayNameSchema.safeParse(cleanText(name, 40)).success) {
      setError(t('auth.shortName'));
      return;
    }
    setBusy(true);
    const result =
      mode === 'signIn'
        ? await signIn(credentials.data.email, credentials.data.password)
        : await signUp(credentials.data.email, credentials.data.password, name);
    setBusy(false);
    if (!result.ok) {
      setError(t(result.error === 'backendOff' ? 'auth.backendOff' : 'auth.failed'));
      return;
    }
    if (result.needsConfirmation) {
      Alert.alert(t('auth.checkEmail'));
      setMode('signIn');
      return;
    }
    router.back();
  };

  const isSignUp = mode === 'signUp';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Anda</Text>
        <Text style={styles.title}>{t(isSignUp ? 'auth.signUp' : 'auth.signIn')}</Text>

        {isSignUp ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.displayName')}
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            autoCapitalize="words"
            autoComplete="name"
          />
        ) : null}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          maxLength={254}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          maxLength={72}
          onSubmitEditing={() => void submit()}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={t(isSignUp ? 'auth.signUp' : 'auth.signIn')} loading={busy} onPress={() => void submit()} />

        <Pressable onPress={() => setMode(isSignUp ? 'signIn' : 'signUp')} accessibilityRole="button">
          <Text style={styles.switch}>{t(isSignUp ? 'auth.switchToSignIn' : 'auth.switchToSignUp')}</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>{t('auth.or')}</Text>
          <View style={styles.line} />
        </View>

        {/* Apple and Google need native client IDs and are added once the backend providers are configured. */}
        <Button label={t('auth.apple')} variant="secondary" onPress={() => Alert.alert(t('auth.oauthSoon'))} />
        <Button label={t('auth.google')} variant="secondary" onPress={() => Alert.alert(t('auth.oauthSoon'))} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, gap: 14 },
  brand: { fontSize: 36, fontWeight: '900', color: colors.primary },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  switch: { textAlign: 'center', color: colors.link, fontSize: 15, fontWeight: '600', paddingVertical: 6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.textMuted, fontSize: 13 },
});
