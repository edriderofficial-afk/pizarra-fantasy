import { Tabs } from 'expo-router';
import { themes } from '@pizarra/ui';

const t = themes.dark;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="plantilla" options={{ title: 'Plantilla' }} />
      <Tabs.Screen name="mercado" options={{ title: 'Mercado' }} />
      <Tabs.Screen name="once" options={{ title: 'Once' }} />
      <Tabs.Screen name="radar" options={{ title: 'Radar' }} />
      <Tabs.Screen name="rivales" options={{ title: 'Rivales' }} />
    </Tabs>
  );
}
