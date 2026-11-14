import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyUnsubscribe } from '@/lib/family-calendar-server';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const page = (heading: string, body: string) =>
  new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Little Sound</title></head>
<body style="margin:0;background:#F5EFE0;font-family:Helvetica,Arial,sans-serif;color:#1C3A4A;">
<div style="max-width:480px;margin:0 auto;padding:64px 24px;text-align:center;">
<h1 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;font-size:28px;margin:0 0 12px;">${heading}</h1>
<p style="font-size:16px;line-height:1.6;color:#3A5A6A;margin:0 0 28px;">${body}</p>
<a href="${SITE_URL}/families/dashboard" style="display:inline-block;background:#0D5C6E;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">Go to your dashboard</a>
</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

// One-click unsubscribe from the link in every alert email. The link is
// signed, so it works without signing in (and past the site password: see
// middleware.ts) but can't be forged for someone else's account.
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('u') ?? '';
  const sig = request.nextUrl.searchParams.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !verifyUnsubscribe(userId, sig)) {
    return page('That link didn’t work', 'You can turn email alerts off from your dashboard instead.');
  }
  const { error } = await supabaseAdmin.from('profiles').update({ email_alerts: false }).eq('id', userId);
  if (error) {
    console.error('unsubscribe error:', error);
    return page('Something went wrong', 'We couldn’t update your settings. You can turn email alerts off from your dashboard.');
  }
  return page('You’re unsubscribed', 'We won’t email you about registration dates or schedule changes. You can turn alerts back on from your dashboard anytime.');
}
