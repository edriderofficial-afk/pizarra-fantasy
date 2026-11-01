import { z } from 'zod';

/** Minimal subset of the HAR 1.2 format that we need. Unknown fields are ignored. */
const Header = z.object({ name: z.string(), value: z.string() });
const HarEntrySchema = z.object({
  request: z.object({
    method: z.string(),
    url: z.string(),
    headers: z.array(Header).default([]),
  }),
  response: z.object({
    status: z.number(),
    headers: z.array(Header).default([]),
    content: z
      .object({
        mimeType: z.string().optional(),
        text: z.string().optional(),
        encoding: z.string().optional(),
      })
      .default({}),
  }),
});
const HarSchema = z.object({ log: z.object({ entries: z.array(HarEntrySchema) }) });

export type RawHarEntry = z.infer<typeof HarEntrySchema>;

/**
 * Sanitized view of a request/response pair. Request bodies (which may contain passwords)
 * are never kept; we only remember whether the request carried credentials.
 */
export interface HarEntry {
  readonly method: string;
  readonly host: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly hadCredentials: boolean;
  readonly status: number;
  readonly json: unknown;
}

export function parseHar(input: unknown): RawHarEntry[] {
  return HarSchema.parse(input).log.entries;
}

export function decodeBody(content: RawHarEntry['response']['content']): string | null {
  if (content.text === undefined) return null;
  return content.encoding === 'base64'
    ? Buffer.from(content.text, 'base64').toString('utf8')
    : content.text;
}
