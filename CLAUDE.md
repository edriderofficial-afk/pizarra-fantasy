# CLAUDE.md — Pizarra

Asistente analítico (no oficial) para LALIGA Fantasy. Brief completo: `docs/BRIEF.md`.
Fase actual: **0 completada** (setup). Siguiente: Fase 1 (núcleo con datos mock).

## Stack

- Monorepo **pnpm 10 + Turborepo 2**. Node 22 (`.nvmrc`).
- `apps/mobile`: Expo SDK 58, Expo Router, NativeWind 4 (Tailwind 3.4), React 19.3.0 / RN 0.88.
- `apps/web`: Next.js 16 (App Router), Tailwind 3.4.
- `packages/core`: lógica pura (TS + Zod), Vitest con umbral de cobertura 90 %.
- `packages/data`: interfaz `DataProvider` + adaptadores (`mock`, `fantasy`).
- `packages/ui`: tokens de diseño + preset Tailwind compartido (web y móvil).
- `packages/api-client`: cliente tipado del backend (Fase 2).
- `packages/config`: tsconfig base y ESLint flat config compartidos.
- Backend (Fase 2): Supabase (Postgres + RLS + Auth anónima + Edge Functions), Drizzle ORM.

## Comandos

| Comando                                      | Qué hace                                                |
| -------------------------------------------- | ------------------------------------------------------- |
| `pnpm install`                               | Instala todo (node_modules hoisted, ver `.npmrc`)       |
| `pnpm dev`                                   | Arranca Expo (Metro :8081) y Next (:3000) en paralelo   |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Lint, tipos y tests en todo el monorepo                 |
| `pnpm test:coverage`                         | Tests con umbral de cobertura (core ≥ 90 %)             |
| `pnpm build`                                 | Build de web + `expo export` Android (prueba de bundle) |
| `pnpm format` / `pnpm format:check`          | Prettier                                                |
| `pnpm --filter @pizarra/core test`           | Ejecutar en un solo paquete                             |

## Convenciones

- TypeScript estricto en todo (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Sin `any` (ESLint error).
- Lógica de negocio solo en `packages/core`, como funciones puras con tests al lado (`*.test.ts`).
- Los paquetes internos exportan **código fuente TS** (`exports: ./src/index.ts`); Next los transpila (`transpilePackages`) y Metro los resuelve directamente. No hay paso de build para paquetes.
- Toda respuesta externa se valida con Zod.
- Reglas de temporada en `packages/core/src/rules/season-YYYY-YY.ts` (Zod). Los datos **[VERIFICAR]** del brief nunca se hardcodean en la lógica.
- Colores siempre desde `@pizarra/ui` (tokens). La dificultad 1–5 se muestra con color + etiqueta + icono. Contraste AA verificado en `tokens.test.ts`.
- Commits: Conventional Commits, pequeños y atómicos.
- Textos visibles en español por defecto. i18n (es/en) llega en la Fase 1.
- Marca centralizada: `apps/mobile/app.config.ts` (`BRAND`) y `apps/web/src/app.config.ts`.

## Decisiones (ADR resumidos; detalle en `docs/adr/`)

- **0001 Backend = Supabase**: RLS, auth anónima y Postgres gestionados; lógica en `core`. Ingest = workers Node con cron de GitHub Actions. Región UE.
- **0002 ORM = Drizzle**, schema-first; migraciones SQL generadas en `supabase/migrations`, RLS con `pgPolicy`.
- **0003 Auth**: Supabase anónimo (+ Apple/Google opcional). Token de LALIGA solo en el dispositivo (`expo-secure-store`). Al backend solo llega el HMAC del id de proveedor.
- **0004 UI**: web y móvil comparten lógica y tokens, no componentes (sin react-native-web en Next).
- **0005 Toolchain**: TS 6.0.3 (typescript-eslint aún no soporta TS 7). Tailwind 3.4 (NativeWind 4 no soporta Tailwind 4). React fijado a la versión del SDK de Expo.
- Licencia propietaria (`UNLICENSED`). Bundle id provisional `com.edrider.pizarra`, se confirma antes de la Fase 5.

## Cosas que NO hacer

- No copiar código, nombre, logo, capturas ni textos de FantasyStats ni de LALIGA. No usar logos de clubes ni de LALIGA.
- No inventar endpoints de LALIGA Fantasy: `packages/data/src/fantasy/endpoints.ts` se rellena solo desde un HAR real (Fase 2).
- No enviar ni guardar credenciales o tokens de LALIGA en el backend. No commitear `.env` ni ficheros `.har`.
- No reutilizar código GPL.
- No subir versiones de React/RN/paquetes `expo-*` a mano: usar las de `node_modules/expo/bundledNativeModules.json`. `expo install` no funciona en este entorno porque el proxy bloquea la API de Expo.
- No usar lenguaje de apuestas. Las estimaciones siempre se etiquetan como orientativas.
- No añadir un paso de build a los paquetes internos sin un ADR.
