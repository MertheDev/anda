import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { joinEvent, leaveEvent, reportEvent, type JoinError } from '@/data/eventsRepo';
import { useAuth } from '@/lib/auth';
import { formatPrice, formatWhen, initials } from '@/lib/format';
import { openExternalUrl } from '@/lib/security';
import { isBackendConfigured } from '@/lib/supabase';
import { categoryMeta, colors, radius } from '@/theme';
import type { AndaEvent } from '@/types/event';

interface Props {
  event: AndaEvent | null;
  onClose: () => void;
  /** Called with the updated event after a join/leave so the map and the card stay in sync. */
  onChange: (event: AndaEvent) => void;
}

const SNAP_POINTS = ['44%', '90%'];

export function EventSheet({ event, onClose, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const sheetRef = useRef<BottomSheet>(null);
  const [busy, setBusy] = useState(false);
  // Id of the event whose translated title is shown; resets itself when another event opens.
  const [altFor, setAltFor] = useState<string | null>(null);
  // Keep the last event on screen while the sheet animates closed.
  const [shown, setShown] = useState<AndaEvent | null>(event);
  if (event && event !== shown) setShown(event);

  // `shown` is a dependency because the sheet only mounts once there is something to show:
  // on the first selection the ref is still empty when `event` changes, so this must run again.
  useEffect(() => {
    if (event) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [event, shown]);

  if (!shown) return null;
  const ev = shown;
  const meta = categoryMeta[ev.category];
  const locale = i18n.language;
  const full = ev.capacity != null && ev.attendeeCount >= ev.capacity && !ev.joined;
  const showAlt = altFor === ev.id;
  const title = showAlt && ev.titleAlt ? ev.titleAlt : ev.title;

  const failMessage = (error: JoinError): string => {
    if (error === 'full') return t('event.full');
    return t('event.joinFailed');
  };

  const toggleJoin = async () => {
    if (isBackendConfigured && !session) {
      router.push('/auth');
      return;
    }
    if (!isBackendConfigured) {
      // Sample-data mode: toggle locally so the flow can be tried without a backend.
      const joined = !ev.joined;
      onChange({ ...ev, joined, attendeeCount: ev.attendeeCount + (joined ? 1 : -1) });
      void Haptics.selectionAsync();
      return;
    }
    setBusy(true);
    const result = ev.joined ? await leaveEvent(ev.id) : await joinEvent(ev.id);
    setBusy(false);
    if ('error' in result) {
      if (result.error === 'notAuthenticated') router.push('/auth');
      else Alert.alert(failMessage(result.error));
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange({ ...ev, joined: !ev.joined, attendeeCount: result.count });
  };

  const openTickets = async () => {
    if (!(await openExternalUrl(ev.ticketUrl))) Alert.alert(t('event.invalidLink'));
  };

  const openDirections = async () => {
    const [lng, lat] = ev.lngLat;
    await openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const share = () => {
    void Share.share({ message: t('event.shareText', { title: ev.title, venue: ev.venueName }) });
  };

  const report = () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    const send = async (reason: string) => {
      const ok = await reportEvent(ev.id, reason, session.user.id);
      Alert.alert(ok ? t('event.reportSent') : t('event.joinFailed'));
    };
    Alert.alert(t('event.reportReason'), undefined, [
      { text: t('event.reason_spam'), onPress: () => void send('spam') },
      { text: t('event.reason_unsafe'), onPress: () => void send('unsafe') },
      { text: t('event.reason_other'), onPress: () => void send('other') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: meta.color }]}>
            <Text style={styles.badgeText}>
              {meta.emoji} {t(`categories.${ev.category}`)}
            </Text>
          </View>
          {ev.type === 'business' ? (
            <View style={[styles.badge, { backgroundColor: colors.business }]}>
              <Text style={styles.badgeText}>★ {t('event.business')}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{title}</Text>
        {ev.titleAlt ? (
          <Pressable onPress={() => setAltFor(showAlt ? null : ev.id)} accessibilityRole="button">
            <Text style={styles.link}>{showAlt ? t('event.showOriginal') : t('event.translate')}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.when}>{formatWhen(ev, t, locale)}</Text>
        <Text style={styles.line}>
          📍 {ev.venueName}
          {ev.city ? `, ${ev.city}` : ''}
        </Text>
        <Text style={styles.line}>
          💳 {formatPrice(ev, t, locale)}
          {ev.capacity != null ? `  ·  ${t('event.spots', { count: ev.capacity })}` : ''}
        </Text>
        <Text style={styles.line}>
          {ev.type === 'business' ? '🏪' : '🙋'} {t(ev.type === 'business' ? 'event.business' : 'event.host')}: {ev.hostName}
        </Text>

        <View style={styles.attendees}>
          <View style={styles.avatars}>
            {ev.attendees.slice(0, 5).map((a, i) => (
              <View key={a.id} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10 }]}>
                <Text style={styles.avatarText}>{initials(a.name)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.going}>{t('event.going', { count: ev.attendeeCount })}</Text>
        </View>

        <Button
          label={ev.joined ? t('event.joined') : full ? t('event.full') : t('event.join')}
          variant={ev.joined ? 'secondary' : 'join'}
          disabled={full}
          loading={busy}
          onPress={() => void toggleJoin()}
        />

        <View style={styles.actions}>
          {ev.ticketUrl ? <Button label={t('event.tickets')} variant="secondary" style={styles.action} onPress={() => void openTickets()} /> : null}
          <Button label={t('event.directions')} variant="secondary" style={styles.action} onPress={() => void openDirections()} />
        </View>
        <View style={styles.actions}>
          <Button label={t('event.share')} variant="secondary" style={styles.action} onPress={share} />
          <Button label={t('event.report')} variant="secondary" style={styles.action} onPress={report} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  handle: { backgroundColor: colors.border, width: 44 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: colors.link },
  when: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  line: { fontSize: 15, color: colors.text },
  attendees: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  going: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
