# services/

Se crean en la Fase 2 (ver `docs/adr/0001-backend.md`):

- `supabase/` (o `services/api`): migraciones SQL generadas por Drizzle, Edge Functions, `seed.sql`.
- `ingest/`: workers Node/TS (snapshots diarios de precios, stats por jornada, alineaciones probables, lesiones).
- `ml/`: (Fase 4) entrenamiento opcional en Python; exporta coeficientes JSON que consume `packages/core`.
