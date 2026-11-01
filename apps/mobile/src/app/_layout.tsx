import '../global.css';
import '../i18n';
import { themes } from '@pizarra/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { DataRoot } from '../lib/data-context';

const t = themes.dark;

export default function RootLayout() {
  const { t: tr } = useTranslation();
  return (
    <DataRoot>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.surface },
          headerTintColor: t.text,
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player/[id]" options={{ title: '' }} />
        <Stack.Screen name="compare" options={{ title: tr('compare.title') }} />
        <Stack.Screen name="account" options={{ title: tr('account.title') }} />
      </Stack>
    </DataRoot>
  );
}
