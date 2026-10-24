import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';

export const MAP_BACKGROUND = '#F3EDE3';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const FETCH_TIMEOUT_MS = 8000;

const LABEL = '#2B2B33';
const WATER_LABEL = '#2F7AA8';

/** Per-layer paint colors that replace positron's greys with a warmer, softer palette. */
const PAINT_OVERRIDES: Record<string, Record<string, string>> = {
  background: { 'background-color': MAP_BACKGROUND },
  park: { 'fill-color': '#C8E3B6' },
  landcover_wood: { 'fill-color': '#B8D9A4' },
  landuse_residential: { 'fill-color': '#EDE5D8' },
  water: { 'fill-color': '#9FD1EE' },
  waterway: { 'line-color': '#9FD1EE' },
  building: { 'fill-color': '#E6DBC9', 'fill-outline-color': '#D6C9B3' },
  highway_path: { 'line-color': '#D8CBB5' },
  highway_minor: { 'line-color': '#FFFFFF' },
  highway_major_casing: { 'line-color': '#E2D3B8' },
  highway_major_inner: { 'line-color': '#FFFFFF' },
  highway_motorway_casing: { 'line-color': '#E5B766' },
  highway_motorway_inner: { 'line-color': '#FFE0A3' },
  highway_motorway_bridge_casing: { 'line-color': '#E5B766' },
  highway_motorway_bridge_inner: { 'line-color': '#FFE0A3' },
  boundary_2: { 'line-color': '#C9C2B8' },
  boundary_3: { 'line-color': '#D6D0C6' },
  water_name_point_label: { 'text-color': WATER_LABEL },
  water_name_line_label: { 'text-color': WATER_LABEL },
  waterway_line_label: { 'text-color': WATER_LABEL },
  label_other: { 'text-color': LABEL },
  label_village: { 'text-color': LABEL },
  label_town: { 'text-color': LABEL },
  label_state: { 'text-color': '#55555F' },
  label_city: { 'text-color': '#22222A' },
  label_city_capital: { 'text-color': '#22222A' },
  label_country_1: { 'text-color': '#55555F' },
  label_country_2: { 'text-color': '#55555F' },
  label_country_3: { 'text-color': '#55555F' },
};

function applyPalette(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = PAINT_OVERRIDES[layer.id];
      return paint ? ({ ...layer, paint: { ...layer.paint, ...paint } } as typeof layer) : layer;
    }),
  };
}

let cached: StyleSpecification | null = null;

async function loadStyle(): Promise<StyleSpecification | string> {
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(STYLE_URL, { signal: controller.signal });
    if (!response.ok) return STYLE_URL;
    cached = applyPalette((await response.json()) as StyleSpecification);
    return cached;
  } catch {
    // Offline or slow: fall back to the stock style URL, which MapLibre loads itself.
    return STYLE_URL;
  } finally {
    clearTimeout(timer);
  }
}

/** The styled map, or null for the brief moment before it has loaded. */
export function useMapStyle(): StyleSpecification | string | null {
  const [style, setStyle] = useState<StyleSpecification | string | null>(cached);
  useEffect(() => {
    if (style) return;
    let cancelled = false;
    void loadStyle().then((s) => {
      if (!cancelled) setStyle(s);
    });
    return () => {
      cancelled = true;
    };
  }, [style]);
  return style;
}
