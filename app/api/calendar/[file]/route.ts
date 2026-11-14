import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildFamilyFeed, TOKEN_RE } from '@/lib/family-calendar-server';

export const dynamic = 'force-dynamic';

// A family's calendar subscription feed: /api/calendar/<token>.ics
//
// Calendar apps (Google, Apple, Outlook) fetch this on their own schedule and
// can't sign in, so the long random token in the link is the only key. That's
// why middleware.ts lets /api/calendar past the site password. An unknown
// token gets a plain 404 (nothing about whether it ever existed).
export async function GET(_request: NextRequest, { params }: { params: { file: string } }) {
  const token = params.file.replace(/\.ics$/i, '');
  if (!TOKEN_RE.test(token)) return new NextResponse('Not found', { status: 404 });

  const { data } = await supabaseAdmin.from('family_calendar_feeds').select('user_id').eq('token', token).maybeSingle();
  if (!data?.user_id) return new NextResponse('Not found', { status: 404 });

  const ics = await buildFamilyFeed(data.user_id as string);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="little-sound.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}
