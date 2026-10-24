import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PILOT_CITIES, type PilotCity } from '@/components/map/CityShortcuts';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { createEvent } from '@/data/eventsRepo';
import { useAuth } from '@/lib/auth';
import { cleanText, eventInputSchema } from '@/lib/security';
import { isBackendConfigured } from '@/lib/supabase';
import { CATEGORIES, categoryMeta, colors, radius } from '@/theme';
import type { EventCategory } from '@/types/event';

const DURATIONS = [60, 120, 180, 240];

/** Next quarter hour from now, in minutes since midnight. */
function defaultStartMinutes(): number {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes() + 30;
  return Math.min(Math.ceil(m / 15) * 15, 23 * 60 + 45);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function CreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState<EventCategory>('community');
  const [dayOffset, setDayOffset] = useState(0);
  const [startMinutes, setStartMinutes] = useState(defaultStartMinutes);
  const [duration, setDuration] = useState(120);
  const [price, setPrice] = useState('0');
  const [capacity, setCapacity] = useState('');
  const [link, setLink] = useState('');
  const [place, setPlace] = useState<{ lng: number; lat: number; city: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (isBackendConfigured && !session) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>{t('create.title')}</Text>
        <Text style={styles.muted}>{t('create.needSignIn')}</Text>
        <Button label={t('auth.signIn')} onPress={() => router.push('/auth')} />
      </View>
    );
  }

  const shiftTime = (delta: number) => setStartMinutes((m) => (m + delta + 1440) % 1440);

  const pickMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('map.locationDenied'));
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setPlace({ lng: pos.coords.longitude, lat: pos.coords.latitude, city: '' });
  };

  const pickCity = (city: PilotCity) => {
    const [lng, lat] = PILOT_CITIES[city].lngLat;
    setPlace({ lng, lat, city: t(`cities.${city}`) });
  };

  const publish = async () => {
    if (!place) {
      Alert.alert(t('create.needLocation'));
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() + dayOffset);
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);

    const parsed = eventInputSchema.safeParse({
      title: cleanText(title, 120),
      category,
      venueName: cleanText(venue, 120),
      lng: place.lng,
      lat: place.lat,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      priceCents: Math.round((Number(price.replace(',', '.')) || 0) * 100),
      capacity: capacity.trim() ? Number(capacity) : undefined,
      ticketUrl: link.trim() || undefined,
    });
    if (!parsed.success || end.getTime() <= Date.now()) {
      Alert.alert(t('create.invalid'));
      return;
    }

    setBusy(true);
    const result = await createEvent({ ...parsed.data, city: place.city });
    setBusy(false);
    if ('error' in result) {
      Alert.alert(t(result.error === 'backendOff' ? 'auth.backendOff' : 'create.failed'));
      return;
    }
    Alert.alert(t('create.success'));
    setTitle('');
    setVenue('');
    setPrice('0');
    setCapacity('');
    setLink('');
    setPlace(null);
    router.navigate('/(tabs)/index');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('create.title')}</Text>

        <Text style={styles.label}>{t('create.name')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>{t('create.venue')}</Text>
        <TextInput style={styles.input} value={venue} onChangeText={setVenue} maxLength={120} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>{t('create.category')}</Text>
        <View style={styles.wrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={`${categoryMeta[c].emoji} ${t(`categories.${c}`)}`} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Text style={styles.label}>{t('create.when')}</Text>
        <View style={styles.wrap}>
          <Chip label={t('create.dayToday')} active={dayOffset === 0} onPress={() => setDayOffset(0)} />
          <Chip label={t('create.dayTomorrow')} active={dayOffset === 1} onPress={() => setDayOffset(1)} />
        </View>
        <View style={styles.stepper}>
          <Button label="−15" variant="secondary" style={styles.step} onPress={() => shiftTime(-15)} />
          <Text style={styles.time}>
            {pad(Math.floor(startMinutes / 60))}:{pad(startMinutes % 60)}
          </Text>
          <Button label="+15" variant="secondary" style={styles.step} onPress={() => shiftTime(15)} />
        </View>

        <Text style={styles.label}>{t('create.duration')}</Text>
        <View style={styles.wrap}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={`${d / 60} h`} active={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>

        <Text style={styles.label}>{t('create.price')}</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={8} />

        <Text style={styles.label}>{t('create.capacity')}</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={(v) => setCapacity(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={5} />

        <Text style={styles.label}>{t('create.link')}</Text>
        <TextInput
          style={styles.input}
          value={link}
          onChangeText={setLink}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={500}
          placeholder="https://"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>{t('create.where')}</Text>
        <View style={styles.wrap}>
          <Chip label={`◎ ${t('create.useMyLocation')}`} active={place != null && place.city === ''} onPress={() => void pickMyLocation()} />
          {(Object.keys(PILOT_CITIES) as PilotCity[]).map((c) => (
            <Chip key={c} label={t(`cities.${c}`)} active={place?.city === t(`cities.${c}`)} onPress={() => pickCity(c)} />
          ))}
        </View>
        {place ? <Text style={styles.ok}>✓ {t('create.locationSet')}</Text> : null}

        <Button label={t('create.publish')} loading={busy} onPress={() => void publish()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, gap: 10 },
  gate: { flex: 1, paddingHorizontal: 16, gap: 14, backgroundColor: colors.surface },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  muted: { fontSize: 15, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: 6 },
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { flex: 1, height: 44 },
  time: { fontSize: 24, fontWeight: '800', color: colors.text, minWidth: 80, textAlign: 'center' },
  ok: { color: colors.join, fontWeight: '700' },
});
