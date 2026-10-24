import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Selectable pill used in filter panels and forms. */
export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelActive: { color: colors.surface },
});
