import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generate } from './generate';
import { inferShape, mergeShapes, renderZod } from './infer';
import { parseHar } from './parse';
import { isIdSegment, schemaName, templatePath } from './paths';
import { redactValue, sanitizeEntries } from './sanitize';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXNpZ25hdHVyZQ';
const json = (body: unknown) => ({ mimeType: 'application/json', text: JSON.stringify(body) });

const har = {
  log: {
    entries: [
      {
        request: {
          method: 'POST',
          url: 'https://auth.example.test/login?redirect=x',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          postData: { text: '{"password":"hunter2"}' },
        },
        response: {
          status: 200,
          headers: [{ name: 'Set-Cookie', value: 'sid=abc' }],
          content: json({ access_token: JWT, email: 'me@example.com' }),
        },
      },
      {
        request: {
          method: 'GET',
          url: 'https://api.example.test/v3/players/123?token=abc&x=1',
          headers: [],
        },
        response: {
          status: 200,
          headers: [],
          content: json({ id: 123, name: 'A', points: 10, price: 1.5, team: null }),
        },
      },
      {
        request: {
          method: 'GET',
          url: 'https://api.example.test/v3/players/456',
          headers: [{ name: 'Authorization', value: `Bearer ${JWT}` }],
        },
        response: {
          status: 200,
          headers: [],
          content: json({ id: 456, name: 'B', points: 7, price: 2, team: { id: 1 }, extra: true }),
        },
      },
      {
        request: {
          method: 'GET',
          url: 'https://api.example.test/v3/leagues/987654/ranking',
          headers: [{ name: 'Authorization', value: `Bearer ${JWT}` }],
        },
        response: {
          status: 200,
          headers: [],
          content: {
            mimeType: 'application/json',
            encoding: 'base64',
            text: Buffer.from(JSON.stringify([{ manager: 'x', pts: 3 }])).toString('base64'),
          },
        },
      },
      {
        request: { method: 'GET', url: 'https://api.example.test/v3/broken', headers: [] },
        response: {
          status: 200,
          headers: [],
          content: { mimeType: 'application/json', text: '{not json' },
        },
      },
      {
        request: { method: 'GET', url: 'https://cdn.example.test/logo.png', headers: [] },
        response: { status: 200, headers: [], content: { mimeType: 'image/png', text: 'xx' } },
      },
      {
        request: { method: 'GET', url: 'not a url', headers: [] },
        response: { status: 200, headers: [], content: json({}) },
      },
      {
        request: { method: 'GET', url: 'https://api.example.test/v3/empty', headers: [] },
        response: { status: 204, headers: [], content: {} },
      },
    ],
  },
};

describe('HAR sanitizing', () => {
  const entries = sanitizeEntries(parseHar(har));
  const dump = JSON.stringify(entries);

  it('never leaks tokens, cookies, passwords or emails', () => {
    expect(dump).not.toContain(JWT);
    expect(dump).not.toContain('hunter2');
    expect(dump).not.toContain('sid=abc');
    expect(dump).not.toContain('me@example.com');
    expect(dump).not.toMatch(/token=abc|"abc"/);
  });

  it('keeps only parseable JSON responses and records credential use', () => {
    expect(entries.map((e) => e.path)).toEqual([
      '/login',
      '/v3/players/123',
      '/v3/players/456',
      '/v3/leagues/987654/ranking',
    ]);
    expect(entries[1]?.hadCredentials).toBe(false);
    expect(entries[2]?.hadCredentials).toBe(true);
    expect(entries[1]?.query).toEqual({ token: '<redacted>', x: '1' });
  });

  it('filters by host', () => {
    expect(sanitizeEntries(parseHar(har), 'api.example.test')).toHaveLength(3);
  });

  it('redacts nested values by key and pattern', () => {
    expect(redactValue({ user: { phone: 600000000, note: `x ${JWT}` } })).toEqual({
      user: { phone: '<redacted>', note: 'x <jwt>' },
    });
  });
});

describe('paths', () => {
  it('detects id segments and templates paths', () => {
    expect(isIdSegment('123')).toBe(true);
    expect(isIdSegment('0b9a8f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(true);
    expect(isIdSegment('abcdef0123456789abcd')).toBe(true);
    expect(isIdSegment('players')).toBe(false);
    expect(templatePath('/v3/leagues/123/teams/456')).toBe('/v3/leagues/{id}/teams/{id2}');
    expect(schemaName('GET', '/v3/leagues/{id}')).toBe('GetV3LeaguesId');
  });
});

describe('shape inference', () => {
  it('merges int/number, optional and nullable fields', () => {
    const shape = mergeShapes(inferShape({ a: 1, b: null, c: 'x' }), inferShape({ a: 1.5, b: 2 }));
    const code = renderZod(shape);
    expect(code).toContain('a: z.number(),');
    expect(code).toContain('b: z.number().int().nullable(),');
    expect(code).toContain('c: z.string().optional(),');
  });
  it('handles arrays, unions, empty objects and odd keys', () => {
    expect(renderZod(inferShape([]))).toBe('z.array(z.unknown())');
    expect(renderZod(mergeShapes(inferShape('a'), inferShape(true)))).toBe(
      'z.union([z.string(), z.boolean()])',
    );
    expect(renderZod(inferShape({}))).toBe('z.looseObject({})');
    expect(renderZod(inferShape({ 'my-key': 1 }))).toContain('"my-key": z.number().int()');
    expect(renderZod(mergeShapes(inferShape([1]), inferShape([])))).toBe(
      'z.array(z.number().int())',
    );
    expect(renderZod(mergeShapes(null, null))).toBe('z.unknown()');
    expect(renderZod(inferShape(undefined))).toBe('z.unknown()');
  });
});

describe('generate', () => {
  const result = generate(sanitizeEntries(parseHar(har), 'api.example.test'));

  it('summarises endpoints and whether they work without a session', () => {
    const players = result.endpoints.find((e) => e.path === '/v3/players/{id}');
    expect(players).toMatchObject({
      method: 'GET',
      samples: 2,
      worksWithoutAuth: true,
      queryParams: ['token', 'x'],
    });
    const ranking = result.endpoints.find((e) => e.path === '/v3/leagues/{id}/ranking');
    expect(ranking?.worksWithoutAuth).toBe(false);
  });

  it('emits Zod schemas that validate the captured samples', async () => {
    const file = join(import.meta.dirname, `.generated-${process.pid}.test-tmp.ts`);
    writeFileSync(file, result.schemasSource);
    try {
      const mod = (await import(file)) as Record<
        string,
        { safeParse: (v: unknown) => { success: boolean } }
      >;
      const players = mod.GetV3PlayersIdResponse;
      expect(
        players?.safeParse({ id: 1, name: 'A', points: 1, price: 1, team: null }).success,
      ).toBe(true);
      expect(
        players?.safeParse({ id: 'x', name: 'A', points: 1, price: 1, team: null }).success,
      ).toBe(false);
      expect(mod.GetV3LeaguesIdRankingResponse?.safeParse([{ manager: 'y', pts: 1 }]).success).toBe(
        true,
      );
    } finally {
      unlinkSync(file);
    }
  });
});
