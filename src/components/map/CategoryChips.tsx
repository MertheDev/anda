import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CATEGORIES, categoryMeta, colors, radius } from '@/theme';
import type { EventCategory } from '@/types/event';

interface Props {
  counts: Record<EventCategory, number>;
  total: number;
  selected: EventCategory[];
  onToggle: (category: EventCategory) => void;
  onClear: () => void;
}

/** Horizontal category chips with live counters for the visible map area. */
function CategoryChipsImpl({ counts, total, selected, onToggle, onClear }: Props) {
  const { t } = useTranslation();
  const allActive = selected.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={onClear}
        style={[styles.chip, allActive && styles.chipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: allActive }}
      >
        <Text style={[styles.label, allActive && styles.labelActive]}>
          {t('map.all')} {total}
        </Text>
      </Pressable>

      {CATEGORIES.map((category) => {
        const active = selected.includes(category);
        const count = counts[category];
        if (count === 0 && !active) return null;
        return (
          <Pressable
            key={category}
            onPress={() => onToggle(category)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {categoryMeta[category].emoji} {t(`categories.${category}`)} {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = memo(CategoryChipsImpl);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  chipActive: { backgroundColor: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelActive: { color: colors.surface },
});
