/**
 * Infers a structural shape from JSON samples and renders it as Zod source code.
 * Objects are rendered loose (unknown keys allowed): the API is unofficial and may add fields.
 */
export type Shape =
  | { readonly kind: 'string' | 'integer' | 'number' | 'boolean' | 'null' | 'unknown' }
  | { readonly kind: 'array'; readonly item: Shape | null }
  | {
      readonly kind: 'object';
      readonly fields: ReadonlyMap<string, { shape: Shape; optional: boolean }>;
    }
  | { readonly kind: 'union'; readonly options: readonly Shape[] };

export function inferShape(value: unknown): Shape {
  if (value === null) return { kind: 'null' };
  if (typeof value === 'string') return { kind: 'string' };
  if (typeof value === 'boolean') return { kind: 'boolean' };
  if (typeof value === 'number') return { kind: Number.isInteger(value) ? 'integer' : 'number' };
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      item: value.reduce<Shape | null>((acc, v) => mergeShapes(acc, inferShape(v)), null),
    };
  }
  if (typeof value === 'object') {
    const fields = new Map<string, { shape: Shape; optional: boolean }>();
    for (const [k, v] of Object.entries(value))
      fields.set(k, { shape: inferShape(v), optional: false });
    return { kind: 'object', fields };
  }
  return { kind: 'unknown' };
}

function options(s: Shape): readonly Shape[] {
  return s.kind === 'union' ? s.options : [s];
}

/** Least upper bound of two shapes (null = no information yet). */
export function mergeShapes(a: Shape | null, b: Shape | null): Shape {
  if (a === null) return b ?? { kind: 'unknown' };
  if (b === null) return a;
  if (a.kind === 'integer' && b.kind === 'number') return b;
  if (a.kind === 'number' && b.kind === 'integer') return a;
  if (a.kind === 'array' && b.kind === 'array')
    return {
      kind: 'array',
      item: a.item && b.item ? mergeShapes(a.item, b.item) : (a.item ?? b.item),
    };
  if (a.kind === 'object' && b.kind === 'object') {
    const fields = new Map<string, { shape: Shape; optional: boolean }>();
    for (const key of new Set([...a.fields.keys(), ...b.fields.keys()])) {
      const fa = a.fields.get(key);
      const fb = b.fields.get(key);
      fields.set(key, {
        shape: mergeShapes(fa?.shape ?? null, fb?.shape ?? null),
        optional: !fa || !fb || fa.optional || fb.optional,
      });
    }
    return { kind: 'object', fields };
  }
  if (a.kind === b.kind && a.kind !== 'union') return a;
  // union: merge into a compatible member when possible
  const merged: Shape[] = [...options(a)];
  for (const opt of options(b)) {
    const idx = merged.findIndex(
      (m) =>
        m.kind === opt.kind ||
        (['integer', 'number'].includes(m.kind) && ['integer', 'number'].includes(opt.kind)),
    );
    if (idx >= 0) merged[idx] = mergeShapes(merged[idx] as Shape, opt);
    else merged.push(opt);
  }
  return merged.length === 1 ? (merged[0] as Shape) : { kind: 'union', options: merged };
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function renderZod(shape: Shape, indent = ''): string {
  const next = `${indent}  `;
  switch (shape.kind) {
    case 'string':
      return 'z.string()';
    case 'integer':
      return 'z.number().int()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'null':
      return 'z.null()';
    case 'unknown':
      return 'z.unknown()';
    case 'array':
      return `z.array(${shape.item ? renderZod(shape.item, indent) : 'z.unknown()'})`;
    case 'object': {
      if (shape.fields.size === 0) return 'z.looseObject({})';
      const lines = [...shape.fields.entries()].map(([k, f]) => {
        const key = IDENT.test(k) ? k : JSON.stringify(k);
        return `${next}${key}: ${renderZod(f.shape, next)}${f.optional ? '.optional()' : ''},`;
      });
      return `z.looseObject({\n${lines.join('\n')}\n${indent}})`;
    }
    case 'union': {
      const nonNull = shape.options.filter((o) => o.kind !== 'null');
      const nullable = nonNull.length !== shape.options.length;
      const base =
        nonNull.length === 1
          ? renderZod(nonNull[0] as Shape, indent)
          : `z.union([${nonNull.map((o) => renderZod(o, indent)).join(', ')}])`;
      return nullable ? `${base}.nullable()` : base;
    }
  }
}
