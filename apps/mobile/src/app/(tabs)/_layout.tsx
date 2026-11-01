import Feather from '@expo/vector-icons/Feather';
import type { ColorValue } from 'react-native';
import { themes } from '@pizarra/ui';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CompareHeaderButton } from '../../components/compare-button';

const t = themes.dark;
type IconName = keyof typeof Feather.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Feather name={name} color={typeof color === 'string' ? color : undefined} size={size} />
  );

export default function TabsLayout() {
  const { t: tr } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerRight: () => <CompareHeaderButton />,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('tabs.home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="plantilla"
        options={{ title: tr('tabs.squad'), tabBarIcon: icon('users') }}
      />
      <Tabs.Screen
        name="mercado"
        options={{ title: tr('tabs.market'), tabBarIcon: icon('shopping-bag') }}
      />
      <Tabs.Screen name="once" options={{ title: tr('tabs.lineup'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen
        name="radar"
        options={{ title: tr('tabs.radar'), tabBarIcon: icon('activity') }}
      />
      <Tabs.Screen name="rivales" options={{ title: tr('tabs.rivals'), tabBarIcon: icon('eye') }} />
    </Tabs>
  );
}
