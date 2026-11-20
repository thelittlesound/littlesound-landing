// Ages agent (2026-11-19): reads a listing's own website to find the ages
// (or school grades) its program serves, so "ages unknown" listings can get
// real ranges. Never writes: it returns what it found plus the exact words
// it found it in, and an admin approves before anything is saved.
//
// Same API shape as the discovery agent (lib/discovery.ts), with web_fetch
// only: facts come from the provider's own site, never directories.
import { modelOptions } from '@/lib/extract-dates';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const TIME_LIMIT_MS = 50_000; // Vercel stops the function at 60s

export interface AgesInput {
  title: string;
  provider: string;
  website: string;
  description?: string | null;
}
export type AgesResult =
  | { found: true; ageMin: number; ageMax: number; openEnded: boolean; scope: 'program' | 'provider'; evidence: string; sourceUrl: string; note: string }
  | { found: false; note: string; sourceUrl?: string }
  | { error: string };

const RECORD_TOOL = {
  name: 'record_ages',
  description: 'Record the ages this program serves, as stated on the provider\'s own website. Call exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'true only if the site states ages or grades for this program' },
      age_min: { type: ['integer', 'null'] },
      age_max: { type: ['integer', 'null'] },
      evidence: { type: 'string', description: 'The exact words on the site that state the ages or grades (under 25 words).' },
      source_url: { type: 'string', description: 'The page those words are on.' },
      open_ended: { type: 'boolean', description: 'true when the site gives only a lower age ("5 and up", "7+"); then age_max = 18' },
      scope: { type: 'string', enum: ['program', 'provider'], description: 'program = stated for this program; provider = one age line the provider gives for all its kids programs' },
      note: { type: 'string', description: 'One short line: how you got the range (e.g. "Grades 1–12 → 6–18"), or why not found.' },
    },
    required: ['found', 'note'],
  },
};

const SYSTEM = `You find the ages a children's program serves, using only the provider's own website.

Fetch the website you're given. If the ages aren't on that page, fetch up to 3 more pages linked from it on the same site (programs, classes, camps, registration, FAQ, schedule) or the provider's own registration/booking pages linked from it.

Rules:
- Only use what the provider's site states. Never guess from the type of program, and never use directories, reviews or news.
- Ages for THIS program. If the site lists several sessions or levels for it, give the overall range they cover.
- Grades → ages: Pre-K = 4, K = 5, grade N = age N+5 at the low end and N+6 at the high end (Grades 1–12 → 6–18; K–5 → 5–11; middle school → 11–14; high school → 14–18).
- Open-ended ages count: "5 and up", "ages 7+", "5 and older" → age_min 5, age_max 18, open_ended true.
- If this program's pages give no ages but the provider states one age range for all its kids programs (home page, FAQ), use it with scope "provider". Otherwise scope "program".
- "Teens", "tweens", "youth" or "kids" alone are not enough: found = false.
- Adults-and-kids programs: give the youth range only.
- Quote the exact words in evidence.
Always finish by calling record_ages exactly once.`;

export async function findAges(input: AgesInput): Promise<AgesResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY is not set.' };
  if (!/^https?:\/\//i.test(input.website || '')) return { error: 'This listing has no website.' };
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const started = Date.now();
  const messages: { role: string; content: unknown }[] = [
    {
      role: 'user',
      content: `Program: ${input.title}\nProvider: ${input.provider}\nWebsite: ${input.website}\n${input.description ? `Listing description: ${input.description.slice(0, 600)}\n` : ''}What ages does this program serve?`,
    },
  ];
  const request: Record<string, unknown> = {
    model,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 4, max_content_tokens: 8000 }, RECORD_TOOL],
    ...modelOptions(model),
  };
  request.tool_choice = { type: 'auto' };

  let body: any = null;
  for (let turn = 0; turn < 3; turn++) {
    const left = TIME_LIMIT_MS - (Date.now() - started);
    if (left < 8_000) break;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-fetch-2025-09-10',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ...request, messages }),
        signal: AbortSignal.timeout(Math.max(5_000, left)),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) return { error: `AI request failed: ${json?.error?.message ?? `HTTP ${res.status}`}` };
      body = json;
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { error: timedOut ? 'Took too long; try again.' : 'Could not reach the AI service.' };
    }
    if (body?.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: body.content });
  }

  const use = (body?.content ?? []).find((c: { type: string; name?: string }) => c.type === 'tool_use' && c.name === RECORD_TOOL.name);
  const r = use?.input as { found?: boolean; age_min?: number | null; age_max?: number | null; open_ended?: boolean; scope?: string; evidence?: string; source_url?: string; note?: string } | undefined;
  if (!r) return { error: body?.stop_reason === 'pause_turn' ? 'Ran out of time; try again.' : 'Finished without an answer; try again.' };
  const ok = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 21;
  if (r.found && ok(r.age_min) && ok(r.age_max) && (r.age_min as number) <= (r.age_max as number)) {
    return {
      found: true,
      ageMin: r.age_min as number,
      ageMax: r.open_ended ? 18 : Math.min(18, r.age_max as number),
      openEnded: !!r.open_ended,
      scope: r.scope === 'provider' ? 'provider' : 'program',
      evidence: String(r.evidence ?? '').slice(0, 300),
      sourceUrl: String(r.source_url ?? input.website),
      note: String(r.note ?? '').slice(0, 200),
    };
  }
  return { found: false, note: String(r.note ?? 'Ages not stated on their site.').slice(0, 200), sourceUrl: r.source_url };
}
