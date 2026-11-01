import { defineConfig } from 'drizzle-kit';

/** Migrations are generated into supabase/migrations and applied with the Supabase CLI. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: '../../supabase/migrations',
  entities: { roles: { provider: 'supabase' } },
});
