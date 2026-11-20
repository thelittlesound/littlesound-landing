// Location check (2026-11-20): reads a provider's own website for where a
// program meets (street address, or "several locations"), so discovery
// suggestions held as "location not found" can be placed. Reads only; the
// admin approves before anything is added. Same API shape as the ages agent.
import { modelOptions } from '@/lib/extract-dates';
import { neighborhoodFromAddress } from '@/lib/discovery-logic';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const TIME_LIMIT_MS = 50_000;

export type LocateResult =
  | { found: true; address: string; neighborhood: string | null; multiple: boolean; evidence: string; sourceUrl: string; note: string }
  | { found: false; note: string }
  | { error: string };

const TOOL = {
  name: 'record_location',
  description: 'Record where this program meets, as stated on the provider\'s own website. Call exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean' },
      address: { type: 'string', description: 'Street address with city and ZIP, exactly as the site gives it. For several sites, the main one.' },
      multiple: { type: 'boolean', description: 'true if it runs at several sites around the area (schools, parks, gyms)' },
      evidence: { type: 'string', description: 'The exact words on the site (under 25 words).' },
      source_url: { type: 'string' },
      note: { type: 'string', description: 'One short line: what you found, or why not found.' },
    },
    required: ['found', 'note'],
  },
};

const SYSTEM = `You find where a children's program meets, using only the provider's own website.
Fetch the website you're given; if the location isn't there, fetch up to 3 more pages linked from it on the same site (contact, locations, schedule, about, registration).
Rules:
- Only what the provider's site states. Never use directories, maps or reviews, and never guess from the business name.
- Give the street address with ZIP exactly as written. A PO box or mailing address alone doesn't count.
- If it runs at several sites (schools, parks, gyms), set multiple = true and give the main address if there is one.
Always finish by calling record_location exactly once.`;

export async function findLocation(input: { title: string; provider: string; website: string }): Promise<LocateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY is not set.' };
  if (!/^https?:\/\//i.test(input.website || '')) return { error: 'No website.' };
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const started = Date.now();
  const messages: { role: string; content: unknown }[] = [
    { role: 'user', content: `Program: ${input.title}\nProvider: ${input.provider}\nWebsite: ${input.website}\nWhere does it meet?` },
  ];
  const request: Record<string, unknown> = {
    model,
    max_tokens: 3000,
    system: SYSTEM,
    tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 4, max_content_tokens: 8000 }, TOOL],
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
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'web-fetch-2025-09-10', 'content-type': 'application/json' },
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
  const use = (body?.content ?? []).find((c: { type: string; name?: string }) => c.type === 'tool_use' && c.name === TOOL.name);
  const r = use?.input as { found?: boolean; address?: string; multiple?: boolean; evidence?: string; source_url?: string; note?: string } | undefined;
  if (!r) return { error: 'Finished without an answer; try again.' };
  if (r.found && (r.address || r.multiple)) {
    const address = String(r.address ?? '').slice(0, 200);
    return {
      found: true,
      address,
      neighborhood: neighborhoodFromAddress(address) ?? (r.multiple ? 'Citywide' : null),
      multiple: !!r.multiple,
      evidence: String(r.evidence ?? '').slice(0, 300),
      sourceUrl: String(r.source_url ?? input.website),
      note: String(r.note ?? '').slice(0, 200),
    };
  }
  return { found: false, note: String(r.note ?? 'No location on their site.').slice(0, 200) };
}
