import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { categoryMeta, colors, radius } from '@/theme';
import type { EventCategory } from '@/types/event';

interface Props {
  count: number;
  categories: EventCategory[];
}

/** Several events at once: their category emojis side by side plus the total count. */
function ClusterMarkerImpl({ count, categories }: Props) {
  return (
    <View style={styles.pill}>
      <View style={styles.emojis}>
        {categories.map((category, i) => (
          <View
            key={category}
            style={[styles.emojiWrap, { borderColor: categoryMeta[category].color, marginLeft: i === 0 ? 0 : -8, zIndex: categories.length - i }]}
          >
            <Text style={styles.emoji}>{categoryMeta[category].emoji}</Text>
          </View>
        ))}
      </View>
      <View style={styles.count}>
        <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
      </View>
    </View>
  );
}

export const ClusterMarker = memo(ClusterMarkerImpl);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 6,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  emojis: { flexDirection: 'row', alignItems: 'center' },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  count: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});
