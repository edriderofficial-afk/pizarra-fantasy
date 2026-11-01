/**
 * Generates Zod schemas + an endpoint report from a HAR captured by the project owner.
 *
 *   pnpm har:types <capture.har> [--host api.example.com] [--out packages/data/src/fantasy/generated]
 *
 * Safety: request bodies, credential headers and sensitive query params are dropped; secrets and
 * personal data in responses are redacted; NO samples are written. The HAR itself must never be
 * committed (*.har is gitignored). As a last guard, output that still looks like a token or an
 * email address is refused.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { generate, parseHar, sanitizeEntries } from '@pizarra/data/har';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const file = process.argv[2];
if (!file || file.startsWith('--')) {
  console.error('Usage: pnpm har:types <capture.har> [--host api.example.com] [--out dir]');
  process.exit(1);
}
const host = arg('--host');
const outDir = resolve(arg('--out') ?? 'packages/data/src/fantasy/generated');

const entries = sanitizeEntries(parseHar(JSON.parse(readFileSync(file, 'utf8'))), host);
const result = generate(entries);

const report = [
  '# Endpoints detectados en el HAR',
  '',
  'Generado por `scripts/har-to-types.ts`. Sin muestras ni credenciales.',
  '',
  '| Método | Host | Ruta | Muestras | Status | Sin sesión | Query | Schema |',
  '|---|---|---|---|---|---|---|---|',
  ...result.endpoints.map(
    (e) =>
      `| ${e.method} | ${e.host} | \`${e.path}\` | ${e.samples} | ${e.statuses.join(', ')} | ${e.worksWithoutAuth ? 'sí' : 'no'} | ${e.queryParams.join(', ')} | ${e.schemaName} |`,
  ),
  '',
].join('\n');

const LEAK = /eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}|[\w.+-]+@[\w-]+\.[\w.-]+/;
for (const [name, text] of [
  ['schemas', result.schemasSource],
  ['report', report],
] as const) {
  if (LEAK.test(text)) {
    console.error(
      `Refusing to write ${name}: output still contains something that looks like a token or email.`,
    );
    process.exit(2);
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'schemas.generated.ts'), result.schemasSource);
writeFileSync(join(outDir, 'ENDPOINTS.md'), report);
console.log(
  `${entries.length} JSON responses -> ${result.endpoints.length} endpoints. Written to ${outDir}`,
);
console.log(`Public (no session): ${result.endpoints.filter((e) => e.worksWithoutAuth).length}`);
