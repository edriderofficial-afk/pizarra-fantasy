import { Text, View } from 'react-native';
import { MODEL_VERSION } from '@pizarra/core';
import { createMockProvider } from '@pizarra/data';

const provider = createMockProvider();

export default function HomeScreen() {
  return (
    <View className="flex-1 gap-3 bg-dark-background p-4">
      <Text accessibilityRole="header" className="text-2xl font-bold text-dark-text">
        Pizarra
      </Text>
      <Text className="text-base text-dark-textMuted">
        Resumen de jornada, alertas y cuenta atrás del mercado (Fase 1).
      </Text>
      <Text className="text-xs text-dark-textMuted">
        Datos: {provider.kind} · Modelo v{MODEL_VERSION}
      </Text>
      <Text className="mt-auto text-xs text-dark-textMuted">
        App independiente, no afiliada ni respaldada por LALIGA. Estimaciones orientativas.
      </Text>
    </View>
  );
}
