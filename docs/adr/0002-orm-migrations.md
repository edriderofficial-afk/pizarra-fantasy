# ADR 0002 — ORM y migraciones: Drizzle (schema-first)

- Estado: aceptado (Fase 0; se implementa en la Fase 2)

## Decisión

- Schema en TypeScript con Drizzle (`drizzle-orm` 0.45, `drizzle-kit` 0.31).
- `drizzle-kit generate` escribe SQL en `supabase/migrations/` y la Supabase CLI lo aplica (local y remoto).
- Políticas RLS declaradas en el schema (`pgPolicy`), junto a cada tabla.
- Los clientes (app y web) usan `supabase-js` con tipos generados. Drizzle se usa en ingest y en scripts.

## Alternativas descartadas

- **Prisma**: binario/engine más pesado, RLS fuera del schema, peor encaje con Edge y workers.
- **Solo SQL + `supabase gen types`**: viable, pero perdemos tipos al escribir consultas en el ingest.
