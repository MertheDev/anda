import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { cleanText } from '@/lib/security';
import { isBackendConfigured } from '@/lib/supabase';
import { colors, radius } from '@/theme';

const LANGUAGE_LABELS = { tr: 'Türkçe', en: 'English' } as const;

function NameEditor({ initialName }: { initialName: string }) {
  const { t } = useTranslation();
  const { updateDisplayName } = useAuth();
  const [name, setName] = useState(initialName);

  const saveName = async () => {
    const ok = await updateDisplayName(name);
    Alert.alert(ok ? t('profile.saved') : t('auth.shortName'));
  };

  return (
    <>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(v) => setName(cleanText(v, 40))}
        maxLength={40}
        placeholder={t('auth.displayName')}
        placeholderTextColor={colors.textMuted}
      />
      <Button label={t('profile.editName')} variant="secondary" onPress={() => void saveName()} />
    </>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session, profile, signOut, deleteAccount } = useAuth();

  const confirmDelete = () => {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteAccount'),
        style: 'destructive',
        onPress: () => {
          void deleteAccount().then((ok) => {
            if (!ok) Alert.alert(t('profile.deleteFailed'));
          });
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t('profile.title')}</Text>

      {session && profile ? (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.muted}>{session.user.email}</Text>
          <Text style={styles.role}>{t(`profile.role_${profile.role}`)}</Text>

          <NameEditor key={profile.id} initialName={profile.displayName} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.name}>{t('profile.guest')}</Text>
          <Text style={styles.muted}>{isBackendConfigured ? t('profile.guestHint') : t('auth.backendOff')}</Text>
          {isBackendConfigured ? <Button label={t('auth.signIn')} onPress={() => router.push('/auth')} /> : null}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.section}>{t('profile.language')}</Text>
        <View style={styles.row}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <Chip key={lng} label={LANGUAGE_LABELS[lng]} active={i18n.language === lng} onPress={() => void i18n.changeLanguage(lng)} />
          ))}
        </View>
      </View>

      <Text style={styles.privacy}>{t('profile.privacy')}</Text>

      {session ? (
        <View style={styles.actions}>
          <Button label={t('profile.signOut')} variant="secondary" onPress={() => void signOut()} />
          <Button label={t('profile.deleteAccount')} variant="danger" onPress={confirmDelete} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { paddingHorizontal: 16, gap: 14 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, gap: 10 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.surface, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  role: { fontSize: 13, fontWeight: '700', color: colors.business },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 8 },
  privacy: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 4 },
  actions: { gap: 10 },
});
