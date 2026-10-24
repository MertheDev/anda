import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { categoryMeta, colors, radius } from '@/theme';
import type { AndaEvent } from '@/types/event';

interface Props {
  event: AndaEvent;
  selected: boolean;
  /** Small round variant without a tail, used while zoomed out. */
  compact?: boolean;
}

/** Emoji bubble with a tail; business events get a purple border and a badge. */
function EventMarkerImpl({ event, selected, compact }: Props) {
  const meta = categoryMeta[event.category];
  const isBusiness = event.type === 'business';
  const ring = isBusiness ? colors.business : meta.color;

  return (
    <View style={[styles.wrap, selected && styles.selected]}>
      <View style={[styles.bubble, compact && styles.bubbleCompact, { borderColor: ring }]}>
        <Text style={compact ? styles.emojiCompact : styles.emoji}>{meta.emoji}</Text>
        {isBusiness ? (
          <View style={[styles.badge, compact && styles.badgeCompact]}>
            <Text style={styles.badgeText}>★</Text>
          </View>
        ) : null}
      </View>
      {compact ? null : <View style={[styles.tail, { borderTopColor: ring }]} />}
    </View>
  );
}

export const EventMarker = memo(EventMarkerImpl);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  selected: { transform: [{ scale: 1.2 }] },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleCompact: { width: 36, height: 36, borderWidth: 2.5 },
  emoji: { fontSize: 22 },
  emojiCompact: { fontSize: 18 },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.business,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeCompact: { top: -5, right: -5, width: 15, height: 15 },
  badgeText: { color: colors.surface, fontSize: 9, fontWeight: '700' },
});
