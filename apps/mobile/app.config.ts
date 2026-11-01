import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Single place for brand + identifiers. "Pizarra" is a working name and
 * the bundle id is a placeholder until Phase 5 (it cannot change after store release).
 */
export const BRAND = {
  name: 'Pizarra',
  slug: 'pizarra',
  scheme: 'pizarra',
  bundleId: 'com.edrider.pizarra',
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: BRAND.name,
  slug: BRAND.slug,
  scheme: BRAND.scheme,
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: BRAND.bundleId, supportsTablet: true },
  android: { package: BRAND.bundleId },
  web: { bundler: 'metro', output: 'single' },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: {
    dataProvider: process.env.EXPO_PUBLIC_DATA_PROVIDER ?? 'mock',
  },
});
