import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

export const PILOT_CITIES = {
  izmir: { lngLat: [27.1428, 38.4237] as [number, number], zoom: 11.5 },
  istanbul: { lngLat: [28.9784, 41.0082] as [number, number], zoom: 10.5 },
};

export type PilotCity = keyof typeof PILOT_CITIES;

interface Props {
  onSelect: (city: PilotCity) => void;
}

function CityShortcutsImpl({ onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {(Object.keys(PILOT_CITIES) as PilotCity[]).map((city) => (
        <Pressable
          key={city}
          onPress={() => onSelect(city)}
          style={styles.pill}
          accessibilityRole="button"
          accessibilityLabel={t(`cities.${city}`)}
        >
          <Text style={styles.label}>{t(`cities.${city}`)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const CityShortcuts = memo(CityShortcutsImpl);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
});
