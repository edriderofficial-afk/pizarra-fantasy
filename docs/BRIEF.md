> **Actualización (ADR 0007):** el proyecto es de **uso personal**. Las secciones de monetización (§6), Premium y lanzamiento en tiendas (Fase 5) quedan fuera de alcance.

# PROMPT PARA CLAUDE CODE — Asistente LaLiga Fantasy (inspirado en FantasyStats, mejorado)

> Cómo usarlo: crea una carpeta vacía, abre Claude Code dentro y pega este documento completo como primer mensaje (o guárdalo como `docs/BRIEF.md` y di: *"Lee docs/BRIEF.md y empieza por la Fase 0"*). Recomendado: activar **Plan Mode** (Shift+Tab) para la Fase 0.

---

## 0. Rol y modo de trabajo

Eres un **ingeniero full-stack senior y data scientist deportivo**. Vas a construir desde cero una app móvil + web que funciona como **asistente analítico para LALIGA Fantasy**, partiendo del análisis de la app de referencia *FantasyStats* (descrito abajo) y **superándola** en precisión, transparencia y experiencia de uso.

Reglas de trabajo obligatorias:
1. **Planifica antes de programar.** Para cada fase: propón plan → espera mi OK → implementa → test → resumen corto.
2. Crea y mantén un `CLAUDE.md` en la raíz con: stack, comandos, convenciones, decisiones de arquitectura (ADR breves) y "cosas que NO hacer".
3. **TypeScript estricto** en todo (`strict: true`, sin `any` salvo justificado). Lógica de negocio en funciones puras con tests.
4. Commits pequeños y atómicos con Conventional Commits. Nunca subas secretos; usa `.env.example`.
5. Si un dato de dominio no está confirmado (marcado **[VERIFICAR]**), **no lo inventes**: déjalo configurable en `packages/core/src/rules/` y avísame.
6. No copies código, nombre, logo, capturas ni textos de FantasyStats ni de LALIGA. Replicamos *funcionalidades*, con marca propia.
7. Si algo es ambiguo y caro de deshacer, pregúntame. Si es barato, decide, documenta en `CLAUDE.md` y sigue.

---

## 1. Análisis de la app de referencia: FantasyStats (estado a 1-nov-2026)

**Ficha:** app independiente (no oficial) para usuarios de LALIGA Fantasy. Desarrollador: Guillermo Fernández Cano ("StatsFantasy"), España. Android `com.guillefc.fantasystats`, iOS id6771101817. Landing en Vercel (`ffantasystats.vercel.app`) + página web de estadísticas.
**Tracción publicada (sept-2026, Firebase):** ~25,8k MAU, ~7,7k DAU tras 47 días. Google Play: +10k descargas, ~4,6–4,8★ (~100 reseñas).
**Modelo:** Gratis con anuncios + análisis avanzados desbloqueables viendo vídeos (rewarded) · Premium (sin anuncios, funciones avanzadas, seguimiento en radar, estimación de precios). Precios no públicos.
**Login:** con la cuenta de LALIGA Fantasy del usuario (lee su liga, plantilla, mercado).

### 1.1 Funcionalidades actuales (lo que debemos igualar como mínimo)
| Módulo | Qué hace |
|---|---|
| Ligas / Clasificación | Ver ligas del usuario y clasificación |
| Plantilla y ofertas | Equipo, evolución de jugadores, ofertas recibidas |
| Mercado y fichajes | Jugadores disponibles, momento de forma, encaje en tu equipo; recomendaciones según calidad, titularidad, calendario y necesidades reales de la plantilla |
| 11 ideal | Once sobre un campo, capitán, alternativas, **puntos estimados** próxima jornada; comparar tu alineación vs once recomendado |
| Predicción de jornada | Ranking de opciones con estimación de rendimiento y **dificultad** del partido (código de colores) |
| Comparativa múltiple | 2–4 jugadores; tu once ideal vs el de un rival |
| Espía rival | Plantilla, precios y once ideal de cualquier rival |
| Clausulazos | Oportunidades de cláusula en equipos rivales + **oferta máxima** recomendada |
| Evolución de precios | Tendencia diaria de valor (jugador y mercado); Premium: predicción de precio |
| Radar | Secciones *Suben / Bajan / Cambios*; seguir jugadores (Premium); avisos de cambio de tendencia |
| Alertas configurables | Cierre de mercado, activación de cláusulas, cambios de titularidad, lesiones/sanciones/recuperaciones |
| Planificador | Organizar movimientos de la jornada |
| Lanzadores | Especialistas a balón parado (penaltis, faltas, córners) |
| Web de estadísticas | Tabla pública sin login: filtros por posición y precio máx. (3/5/10/15/25/50M), ordenación por columna, comparador 2–4. Columnas: Pts, Media, Última jornada, Goles, Asist., Tiros, Paradas, Despejes, Duelos ganados, Pérdidas, Goles encajados, TA, TR, Minutos, Precio, Estado |
| UX | Tema oscuro (#080b16), navegación por swipe entre Plantilla · Fichajes · Radar · Rivales, tarjetas modulares |
| Legal | Aviso de no afiliación, privacidad, soporte, eliminación de cuenta y datos, restaurar compras |

### 1.2 Debilidades detectadas (oportunidades)
- Las estimaciones son una **caja negra**: no explica *por qué* recomienda.
- No publica **precisión histórica** de sus predicciones.
- La web de stats avisa que puede incluir datos históricos y no confirma temporada → datos poco fiables/actualizados.
- Changelog con errores recurrentes de **login** y rehacer clausulazos/oferta máxima → fragilidad en integración y lógica.
- Sin mención de soporte a **LALIGA HYPERMOTION** (novedad oficial 2026/27).
- Ficha de Play con información de seguridad de datos contradictoria → oportunidad de diferenciarse en privacidad.

---

## 2. Dominio: LALIGA Fantasy temporada 2026/27

Confirmado por fuentes oficiales:
- Juego oficial de LALIGA; puntuación basada en estadísticas oficiales. Desde 2024/25 hay un componente algorítmico 100% objetivo (antes "Puntos Relevo", en 2025/26 "Puntos DAZN") que añade **0–4 puntos extra por jornada** a cada jugador.
- **2026/27: se incorpora LALIGA HYPERMOTION** (Segunda División) al juego.
- Se mantienen **Recompensa Diaria** (presupuesto extra por actividad) y **Blindaje** (proteger jugadores clave de clausulazos).
- Ligas privadas, Ligas Públicas (divisiones por rendimiento) y Ligas Fantásticas patrocinadas.
- Premium de liga: entrenador, banquillo, capitán, formaciones extra, cesiones, recompensa por 11 ideal, blindaje.
- Escala: récord de 1,3M usuarios únicos diarios, +1,5M ligas privadas y +50M clausulazos la temporada pasada.

**[VERIFICAR] — modelar como configuración, no hardcodear:**
- Plantilla inicial (14 jugadores en 2025/26) y presupuesto (100M en 2025/26).
- Tabla de puntuación por acción y posición; multiplicador del capitán.
- Fórmula de cláusula, coste/duración/límites del blindaje, periodo de protección tras fichar.
- Horarios de cierre de mercado, reglas de pujas, saldo negativo y penalizaciones.
- Formaciones permitidas.

Todo esto vive en `packages/core/src/rules/season-2026-27.ts` tipado con Zod, para poder actualizar por temporada sin tocar lógica.

---

## 3. Producto objetivo: igualar + mejorar

Nombre de trabajo: **"Pizarra"** (placeholder; centralizado en `app.config.ts`).

### 3.1 Mejoras diferenciales (prioridad descendente)
1. **Recomendaciones explicables**: cada sugerencia muestra 2–4 motivos cuantificados ("+1,8 pts esperados vs. tu actual · rival 18º en goles encajados · 92% prob. titular · 1,2M por punto esperado").
2. **Panel de precisión público**: tras cada jornada, comparar predicho vs real (MAE, % aciertos del once, calibración). Transparencia = confianza.
3. **Soporte HYPERMOTION** desde el día 1 (filtro competición en todo).
4. **Simulador de mercado**: "si vendo A y ficho B con puja X, ¿cómo queda mi saldo, mi once y mis puntos esperados?" + aviso de saldo negativo antes del cierre.
5. **Economía de la liga**: estimar saldo de cada rival a partir de movimientos visibles → riesgo de que te hagan clausulazo y a quién blindar.
6. **Optimizador de blindaje y cláusulas**: qué jugador proteger según riesgo × valor × coste.
7. **Puja óptima**: rango recomendado según demanda estimada, tendencia de precio y competidores con saldo.
8. **Live de jornada**: puntos en directo de tu once y rivales, proyección de clasificación de la jornada.
9. **Recordatorio de Recompensa Diaria** y de alineación incompleta (jugador lesionado/sancionado/no convocado).
10. **Asistente conversacional** (Premium, fase final): "¿a quién ficho con 8M para el lateral?" usando la API de Claude con *tool use* sobre nuestros endpoints internos — respuestas siempre basadas en datos, con fuentes.
11. **Widgets** iOS/Android (puntos jornada, cierre de mercado, top subidas) y **web app con paridad** completa (no solo tabla).
12. Multi-liga: vista unificada si el usuario juega en varias ligas.

### 3.2 Pantallas (navegación por tabs + swipe)
`Inicio` (resumen jornada, alertas, cuenta atrás de mercado) · `Plantilla` · `Mercado` · `Once` · `Radar` · `Rivales` · `Jugador` (ficha: histórico de puntos, precio, calendario próximo con dificultad, minutos, lanzador, estado médico) · `Comparador` · `Clausulazos` · `Simulador` · `Precisión` · `Alertas` · `Ajustes/Premium/Cuenta`.

---

## 4. Arquitectura y stack

Monorepo **pnpm + Turborepo**:

```
apps/
  mobile/        Expo SDK (última estable) + Expo Router + TypeScript
                 NativeWind (Tailwind), TanStack Query, Zustand, Reanimated,
                 react-native-svg (campo de fútbol), Victory Native/Skia (gráficas)
  web/           Next.js (App Router) — landing, web de estadísticas pública (SSR/ISR, SEO) y web app
packages/
  core/          Lógica pura: reglas por temporada, modelo de puntos, optimizador de once,
                 recomendador, cláusulas, precios. 100% testeado (Vitest).
  data/          Interfaz DataProvider + adaptadores (fantasy, stats externas, mock)
  ui/            Design system compartido (tokens, componentes)
  api-client/    Cliente tipado del backend (generado desde OpenAPI o tRPC)
services/
  api/           Backend: Supabase (Postgres + Auth + Edge Functions) o Fastify en Fly.io — decide y justifica en ADR
  ingest/        Jobs programados: snapshots diarios de precios, stats por jornada, alineaciones probables, lesiones
  ml/            (Fase 4) Python opcional para entrenar modelos; exporta coeficientes JSON que consume core
```

Servicios: **Expo Notifications** (push), **RevenueCat** (suscripciones iOS/Android + restaurar), **AdMob** (banner + rewarded, con consentimiento UMP/GDPR), **PostHog** o Firebase Analytics, **Sentry** (errores).

### 4.1 Capa de datos (crítico — aquí falló la referencia)
- Interfaz `DataProvider` con métodos: `getLeagues`, `getStandings`, `getSquad`, `getMarket`, `getOffers`, `getPlayer`, `getPlayerHistory`, `getPriceHistory`, `getFixtures`, `getRivalSquad`, `getMatchdayLive`.
- **`MockProvider` con fixtures JSON realistas** para desarrollar todo sin red. Toda la app debe funcionar en modo mock.
- **`FantasyProvider`**: la API de LALIGA Fantasy **no es pública**. Requisitos:
  - El usuario inicia sesión en el **flujo oficial** dentro de un WebView/AuthSession; el token se guarda **solo en el dispositivo** (`expo-secure-store`). El backend **nunca** recibe ni almacena credenciales.
  - No hardcodees endpoints supuestos. Crea `packages/data/src/fantasy/endpoints.ts` vacío con tipos, y un script `scripts/har-to-types.ts` que genere tipos Zod a partir de un fichero HAR que yo capture. Valida toda respuesta con Zod y falla de forma controlada.
  - Rate limiting, caché (TanStack Query + persistencia), reintentos con backoff, y un **feature flag remoto** para desactivar el proveedor si cambia la API.
  - Refresco de token robusto + pantalla clara de "reconectar cuenta" (evitar los fallos de login de la referencia).
- Datos agregados (precios diarios, stats por jornada) se almacenan en **nuestro** Postgres vía `ingest`, para histórico, radar y precisión.
- Licencias: no reutilices código de proyectos GPL (p. ej. clientes no oficiales en GitHub) salvo que decidamos licenciar GPL; solo como referencia conceptual.

### 4.2 Esquema de BD (mínimo)
`players`, `teams`, `competitions` (Primera/Hypermotion), `fixtures`, `player_match_stats`, `player_price_daily`, `predictions` (jugador, jornada, versión modelo, xPts, p_titular), `prediction_results`, `users` (anónimo + id de proveedor hasheado), `follows`, `alert_rules`, `push_tokens`, `entitlements`. Row Level Security por usuario.

---

## 5. Motor analítico (`packages/core`)

Implementa como funciones puras, versionadas (`modelVersion`), con tests y backtesting.

1. **Puntos esperados (xPts)** por jugador y jornada:
   `xPts = P(titular) × E[pts | titular] + P(suplente con minutos) × E[pts | entra]`
   - Forma: media exponencial (EWMA) de puntos de las últimas N jornadas, ajustada por minutos.
   - Ajuste por rival: rating ofensivo/defensivo del oponente (goles a favor/en contra ponderados recientes) y local/visitante.
   - Bonus: lanzador de penaltis/faltas, componente algorítmico 0–4 estimado por historial.
   - `P(titular)` desde alineaciones probables + minutos recientes + estado médico/sanción.
   - Salida: media y rango (p10–p90) → mostrar incertidumbre.
2. **Dificultad de partido**: escala 1–5 con colores accesibles (no depender solo del color).
3. **Optimizador de once**: programación lineal entera (o búsqueda exhaustiva por formación, el espacio es pequeño) maximizando Σ xPts + capitán, respetando formaciones válidas y jugadores disponibles. Devuelve once + 3 alternativas.
4. **Recomendador de fichajes**: ganancia marginal = mejora de xPts del once en próximas K jornadas (con descuento) / coste; penaliza posiciones ya cubiertas; respeta saldo y reglas de saldo negativo.
5. **Precio**: tendencia por regresión sobre snapshots diarios + señales (forma, titularidad, demanda). Clasificación *sube / estable / baja* con probabilidad. Marcar siempre como orientativo.
6. **Clausulazos**: oportunidad = (valor esperado futuro − coste cláusula) considerando blindaje y periodo de protección [VERIFICAR]; **oferta máxima** por jugador.
7. **Riesgo de clausulazo propio** usando saldo estimado de rivales.
8. **Backtesting**: script que re-ejecuta el modelo sobre jornadas pasadas y publica métricas en la pantalla `Precisión`.

---

## 6. Monetización
- **Gratis**: liga, plantilla, mercado, once básico, alertas urgentes, web de stats. Anuncios (banner) + **rewarded** para desbloquear 1 análisis avanzado puntual.
- **Premium** (mensual / temporada): sin anuncios, radar con seguimiento, predicción de precio, simulador, economía de liga, blindaje óptimo, live avanzado, widgets, asistente IA (con cuota).
- Paywall con prueba gratuita; restaurar compras; precios definidos en RevenueCat (no en código).

## 7. Requisitos no funcionales
- Cold start < 2 s en gama media; listas virtualizadas (FlashList); imágenes cacheadas.
- Offline: última sincronización visible con timestamp.
- Accesibilidad: contraste AA, tamaños dinámicos, lectores de pantalla, colores + iconos.
- i18n: es (por defecto) y en.
- Tema oscuro por defecto + claro.
- **Privacidad/RGPD**: consentimiento de anuncios (UMP), política clara, "Eliminar cuenta y datos" in-app + página web, ficha de seguridad de datos de Play/App Store coherente con la realidad.
- Aviso visible: *app independiente, no afiliada ni respaldada por LALIGA*. Sin logos ni marcas oficiales de clubes/LALIGA; usar nombres en texto.
- Estimaciones siempre etiquetadas como orientativas; nada de lenguaje de apuestas.
- CI: GitHub Actions (lint, typecheck, test, build). EAS Build/Submit para tiendas.

---

## 8. Plan por fases (con criterios de aceptación)

**Fase 0 — Setup y plan (Plan Mode)**
Monorepo, `CLAUDE.md`, ADRs (backend elegido, ORM, auth), lint/format, Vitest, CI, `.env.example`, tokens de diseño.
✅ `pnpm dev` arranca mobile (Expo) y web; CI en verde.

**Fase 1 — Núcleo con datos mock**
`packages/core` (reglas 26/27 configurables, xPts v1, optimizador, dificultad) + `MockProvider` + pantallas Inicio, Plantilla, Mercado, Once (campo SVG), Jugador, Comparador.
✅ Toda la navegación funciona offline con mocks; cobertura de `core` ≥ 90%.

**Fase 2 — Datos reales**
Login oficial vía WebView/AuthSession, `FantasyProvider` validado con Zod desde HAR, servicio `ingest` (precios diarios, stats, fixtures, lesiones), BD + RLS.
✅ Con mi cuenta veo mi liga, plantilla y mercado reales; snapshots diarios se guardan; sesión sobrevive a reinicios y expira con aviso claro.

**Fase 3 — Paridad con FantasyStats**
Rivales/espía, Clausulazos + oferta máxima, Radar (suben/bajan/cambios, seguir), Evolución de precios, Alertas configurables + push, Lanzadores, Planificador, web de estadísticas pública (filtros, ordenación, comparador, SEO).
✅ Checklist de la tabla 1.1 completa al 100%.

**Fase 4 — Diferenciales**
Explicabilidad, pantalla Precisión + backtesting, Hypermotion, Simulador de mercado, Economía de liga, Blindaje óptimo, Live de jornada, recordatorios.
✅ Cada recomendación muestra motivos; métricas de precisión publicadas para ≥ 3 jornadas.

**Fase 5 — Monetización y lanzamiento**
RevenueCat, AdMob + UMP, paywall, analítica, Sentry, widgets, asistente IA (Premium), páginas legales, fichas de tienda, EAS Submit.
✅ Build de producción aprobada en TestFlight y pista interna de Play.

---

## 9. Entregable inmediato
Empieza por la **Fase 0**: muéstrame (1) el árbol de carpetas propuesto, (2) los ADR con tu decisión de backend justificada, (3) la lista de dependencias con versiones, y (4) dudas bloqueantes. **No escribas código hasta que apruebe el plan.**
