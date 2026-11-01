# ADR 0006 — Fuente de datos del ingest

- Estado: aceptado (Fase 2A). Se confirma con el HAR en la Fase 2B.

## Contexto

El ingest necesita precios diarios, stats por jornada, calendario y estado médico de **todos** los
jugadores. La API de LALIGA Fantasy no es pública y el backend nunca puede usar credenciales de
usuarios (ADR 0003).

## Decisión

1. **Estrategia A (preferente): endpoints que funcionan sin sesión.** `scripts/har-to-types.ts`
   marca en `ENDPOINTS.md` qué endpoints respondieron 2xx sin credenciales (`Sin sesión: sí`). El ingest
   solo usa esos.
2. **Estrategia B (plan B): una cuenta de servicio dedicada del proyecto**, propiedad del responsable
   del proyecto, con su token como secret de GitHub Actions. Nunca la cuenta de un usuario.
3. **Descartado por ahora: datos aportados por los usuarios** (crowdsourcing desde la app), por la
   complejidad de privacidad e integridad.

El proveedor del ingest se elige con `INGEST_PROVIDER` (`mock` hoy). El workflow solo corre con
`INGEST_ENABLED=true`.

## Consecuencias

- Usar una API no pública puede ir contra los términos del servicio. El responsable del proyecto asume y
  revisa ese riesgo.
- El kill switch `remote_config.fantasy_provider_enabled` permite apagar el proveedor en las apps sin
  publicar una versión nueva.
