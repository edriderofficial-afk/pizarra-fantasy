# ADR 0005 — Versiones de toolchain

- Estado: aceptado (Fase 0)

| Decisión                                           | Motivo                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript **6.0.3** (no 7.x)                      | `typescript-eslint` 8.72 declara `typescript <6.1.0`. Revisar cuando soporte TS 7.                     |
| Tailwind **3.4.19** en web y móvil                 | NativeWind 4.2 requiere `tailwindcss ~3`. Un único preset compartido. Migrar con NativeWind 5 estable. |
| React **19.3.0** en todo el monorepo               | Versión fijada por Expo SDK 58. Evita dos copias de React con node_modules hoisted.                    |
| `node-linker=hoisted`                              | Configuración más fiable para Metro y React Native en monorepos pnpm.                                  |
| pnpm **10.28**                                     | Versión instalada y estable. Fijada vía `packageManager`.                                              |
| ESLint 10 flat config + `typescript-eslint` strict | Configuración compartida en `@pizarra/config`.                                                         |
| Vitest 5 + coverage v8                             | Umbral de 90 % en `core`.                                                                              |

Las versiones de `react-native`, `expo-*`, reanimated, etc. salen de `node_modules/expo/bundledNativeModules.json` (equivalente offline a `expo install`).
