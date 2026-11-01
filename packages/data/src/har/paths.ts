/**
 * Normalises concrete paths into templates: /leagues/123/team/abc-uuid -> /leagues/{id}/team/{id2}.
 * Numeric, UUID, long hex and digit-heavy segments are treated as ids.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isIdSegment(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (UUID.test(segment)) return true;
  if (/^[0-9a-f]{16,}$/i.test(segment)) return true;
  return (segment.match(/\d/g)?.length ?? 0) >= 4;
}

export function templatePath(path: string): string {
  let n = 0;
  return path
    .split('/')
    .map((seg) => {
      if (!seg || !isIdSegment(seg)) return seg;
      n++;
      return n === 1 ? '{id}' : `{id${n}}`;
    })
    .join('/');
}

/** PascalCase name for a schema, e.g. GET /api/v3/leagues/{id} -> GetApiV3LeaguesId. */
export function schemaName(method: string, template: string): string {
  const words = [method.toLowerCase(), ...template.split(/[^A-Za-z0-9]+/)].filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
