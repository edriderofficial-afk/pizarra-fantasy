# supabase/

Proyecto Supabase (ADR 0001). Región UE al crear el proyecto remoto.

- `migrations/`: SQL **generado** por Drizzle desde `packages/db/src/schema.ts`
  (`pnpm --filter @pizarra/db db:generate`). No editar a mano salvo migraciones `--custom` (seed).
- `config.toml`: configuración local de la CLI (auth anónima activada).

Comandos (con la Supabase CLI y Docker):

```bash
npx supabase start          # stack local
npx supabase db reset       # aplica migrations/ desde cero
npx supabase link --project-ref <ref> && npx supabase db push   # remoto (Fase 2B)
```

Los tests de RLS (`packages/db/src/rls.test.ts`) no necesitan la CLI: crean una base de datos temporal en
cualquier Postgres (`TEST_DATABASE_URL`) con un shim de roles y `auth.uid()` equivalente al de Supabase.
