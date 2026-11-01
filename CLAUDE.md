# CLAUDE.md — Pizarra

Asistente analítico (no oficial) para LALIGA Fantasy. Brief completo: `docs/BRIEF.md`.
Fase actual: **2A completada** (BD + RLS, ingest, esqueleto FantasyProvider, herramientas HAR, cuenta anónima). Siguiente: **2B**, que necesita el HAR del responsable del proyecto: endpoints, mapeadores y login oficial.

## Stack

- Monorepo **pnpm 10 + Turborepo 2**. Node 22 (`.nvmrc`).
- `apps/mobile`: Expo SDK 58, Expo Router, NativeWind 4 (Tailwind 3.4), React 19.3.0 / RN 0.88.
- `apps/web`: Next.js 16 (App Router), Tailwind 3.4.
- `packages/core`: lógica pura (TS + Zod), Vitest con umbral de cobertura 90 %.
- `packages/data`: interfaz `DataProvider` + adaptadores (`mock`, `fantasy`).
- `packages/ui`: tokens de diseño + preset Tailwind compartido (web y móvil).
- `packages/api-client`: cliente Supabase (sesión anónima, remote config).
- `packages/db`: schema Drizzle + RLS, migraciones en `supabase/migrations`, harness de tests contra Postgres.
- `services/ingest`: jobs idempotentes que escriben en la BD desde un `DataProvider`.
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

## Mapa del código (Fase 1)

- `packages/core/src/domain/schemas.ts`: modelo de dominio (Zod). Todo proveedor devuelve estos tipos.
- `packages/core/src/rules/`: reglas por temporada. Las secciones `verified: false` son [VERIFICAR]; los valores desconocidos son `null`.
- `packages/core/src/xpts/`: xPts v1 (`expectedPoints`) y su configuración (`DEFAULT_XPTS_CONFIG`). Devuelve media, p10–p90 y `reasons` con impacto cuantificado.
- `packages/core/src/projection/`: `projectMatchday` (todas las proyecciones de una jornada, sin fugas de datos futuros) y `upcomingFixtures`.
- `packages/core/src/optimizer/`: `optimizeLineup` (búsqueda exhaustiva por formación + capitán) y `evaluateLineup`.
- `packages/core/src/difficulty/`, `ratings/`, `compare/`, `stats/`.
- `packages/data/src/mock/`: `MockProvider` + fixtures JSON **ficticios** generados por `scripts/generate-mocks.ts`. Reloj fijo (`meta.json.now`).
- `apps/mobile/src/lib/queries.ts`: hooks de TanStack Query. `useProjections` calcula xPts una vez por competición; `useLineupPlan` calcula el once recomendado frente al del usuario.
- `apps/mobile/src/i18n/`: `es.ts` es la fuente; `en.ts` está tipado contra ella (no puede faltar ninguna clave).
- Cambios en el modelo → subir `MODEL_VERSION` (`packages/core/src/model-version.ts`).

## Mapa del código (Fase 2A)

- `packages/db/src/schema.ts`: tablas + RLS. Los datos de juego son de lectura pública y solo se escriben con `service_role`; los datos de usuario solo los ve su dueño. `entitlements` es de solo lectura para los clientes e `ingest_runs` solo existe para el servidor.
- `packages/db/src/testing.ts`: crea una BD temporal con un shim de Supabase (roles, `auth.users`, `auth.uid()`) y aplica las migraciones. Con `as(role, sub, fn)` se ejecuta código como un rol concreto.
- `supabase/`: `config.toml` (auth anónima activada) y migraciones generadas. Las migraciones `--custom` (seed) se escriben a mano.
- `services/ingest/src/jobs/`: `catalog`, `fixtures`, `stats`, `prices` (snapshot diario) y `predictions` (xPts versionado + evaluación de jornadas jugadas). `run.ts` registra cada ejecución en `ingest_runs`.
- `packages/data/src/fantasy/`: `http.ts` (rate limit, reintentos con backoff, Retry-After, un refresh tras 401, caché GET, Zod), `session.ts` (token solo en el dispositivo, refresh single-flight, estado `expired`), `fantasy-provider.ts` (mapeadores `defineMapper` + validación de salida contra el dominio + kill switch) y `endpoints.ts` (**vacío** hasta el HAR).
- `packages/data/src/har/` + `scripts/har-to-types.ts`: saneado del HAR, inferencia de schemas e informe de endpoints públicos.
- `apps/mobile/src/lib/`: `backend.ts` (Supabase opcional), `fantasy-session.ts` (SecureStore), `remote-config.ts`. La pantalla `app/account.tsx` permite conectar y reconectar la cuenta.

## Decisiones (ADR resumidos; detalle en `docs/adr/`)

- **0001 Backend = Supabase**: RLS, auth anónima y Postgres gestionados; lógica en `core`. Ingest = workers Node con cron de GitHub Actions. Región UE.
- **0002 ORM = Drizzle**, schema-first; migraciones SQL generadas en `supabase/migrations`, RLS con `pgPolicy`.
- **0003 Auth**: Supabase anónimo (+ Apple/Google opcional). Token de LALIGA solo en el dispositivo (`expo-secure-store`). Al backend solo llega el HMAC del id de proveedor.
- **0004 UI**: web y móvil comparten lógica y tokens, no componentes (sin react-native-web en Next).
- **0005 Toolchain**: TS 6.0.3 (typescript-eslint aún no soporta TS 7). Tailwind 3.4 (NativeWind 4 no soporta Tailwind 4). React fijado a la versión del SDK de Expo.
- Licencia propietaria (`UNLICENSED`). Bundle id provisional `com.edrider.pizarra`, se confirma antes de la Fase 5.
- Datos mock ficticios (equipos, jugadores y mánagers inventados) para evitar datos reales desactualizados y problemas de marca.
- La dificultad 1–5 es general (fuerza del rival + campo), no depende de la posición. El ajuste por posición está en xPts y se ve en los motivos.
- Gráficas de la Fase 1 en SVG simple. Victory Native + Skia se añaden cuando hagan falta gráficas ricas (Fase 3).
- El comparador se rellena desde la ficha del jugador o con pulsación larga en las listas. El estado vive en Zustand, no persistido.
- **0006 Ingest**: estrategia A (endpoints sin sesión) con la B como plan B (cuenta de servicio dedicada). Workflow `ingest.yml` bloqueado por `INGEST_ENABLED`.
- Los tests de BD corren contra Postgres real (servicio `postgres:17` en CI). El servidor local de PostgreSQL vale para desarrollo; no hace falta Docker.

## Cosas que NO hacer

- No copiar código, nombre, logo, capturas ni textos de FantasyStats ni de LALIGA. No usar logos de clubes ni de LALIGA.
- No inventar endpoints de LALIGA Fantasy: `packages/data/src/fantasy/endpoints.ts` se rellena solo desde un HAR real (Fase 2).
- No enviar ni guardar credenciales o tokens de LALIGA en el backend. No commitear `.env` ni ficheros `.har`.
- No reutilizar código GPL.
- No subir versiones de React/RN/paquetes `expo-*` a mano: usar las de `node_modules/expo/bundledNativeModules.json`. `expo install` no funciona en este entorno porque el proxy bloquea la API de Expo.
- No usar lenguaje de apuestas. Las estimaciones siempre se etiquetan como orientativas.
- No añadir un paso de build a los paquetes internos sin un ADR.
- No commitear muestras de respuestas de la API ni HAR: contienen datos personales (nombres de rivales, ligas). `har-to-types` solo escribe schemas e informe.
- No editar a mano `supabase/migrations/*.sql` generadas: cambiar `schema.ts` y regenerar.
- No escribir datos de juego desde los clientes: solo `service_role` (ingest).
