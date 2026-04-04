import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TranslateSchema } from '@/lib/validation';
import { rateLimit, getIp } from '@/lib/rateLimit';

const client = new Anthropic();
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!rateLimit(`${getIp(req)}:translate`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TranslateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 422 });
  }

  const fields = parsed.data.fields as Record<string, string>;
  const { targetLang } = parsed.data;
  if (targetLang === 'en') return NextResponse.json(fields);

  const entries = Object.entries(fields).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return NextResponse.json(fields);

  const numbered = entries.map(([k, v], i) => `[${i + 1}] KEY:${k}\n${v}`).join('\n\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate each numbered block below into French (Canadian). Keep medical terminology accurate. Return ONLY the translations in the exact same numbered format: [N] KEY:keyname followed by the translated text. No explanations.\n\n${numbered}`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text;
  const result: Record<string, string> = { ...fields };

  for (const block of raw.split(/\n(?=\[\d+\])/)) {
    const m = block.match(/^\[(\d+)\]\s*KEY:(\S+)\n([\s\S]+)$/);
    if (m) {
      const idx = parseInt(m[1]) - 1;
      const key = m[2];
      if (idx >= 0 && idx < entries.length && entries[idx][0] === key) {
        result[key] = m[3].trim();
      }
    }
  }

  return NextResponse.json(result);
}
