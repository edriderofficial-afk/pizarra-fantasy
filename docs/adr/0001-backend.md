# ADR 0001 — Backend: Supabase

- Estado: aceptado (Fase 0)

## Contexto

Necesitamos Postgres (histórico de precios, predicciones, precisión), auth sin fricción, **Row Level Security por usuario** (lo exige el brief), push tokens, alertas y jobs programados. El equipo es pequeño y no queremos operar servidores.

## Opciones

1. **Supabase**: Postgres gestionado + Auth (incluida anónima) + RLS nativo + Edge Functions (Deno) + Storage.
2. **Fastify en Fly.io** + Postgres gestionado: control total, pero hay que implementar auth, autorización, despliegue, escalado y observabilidad.

## Decisión

Supabase, en una región de la UE (Frankfurt) por RGPD.

- La lógica de negocio vive en `packages/core`, que es portable. Las Edge Functions son delgadas (validan con Zod y delegan).
- **Ingest** (`services/ingest`): workers Node/TS que reutilizan `packages/data` y `core`, lanzados por un cron de GitHub Actions y escribiendo con la service role. Si hace falta más control (colas, ejecuciones largas), se mueven a Fly.io o Railway sin cambiar la lógica.
- Desarrollo local con la Supabase CLI hasta la Fase 2.

## Consecuencias

- (+) RLS, auth y API REST sin código propio. Coste inicial bajo.
- (−) Dependencia de proveedor, mitigada porque es Postgres estándar y las migraciones son SQL. Las Edge Functions usan Deno y no pueden importar directamente paquetes que dependan de APIs de Node.
