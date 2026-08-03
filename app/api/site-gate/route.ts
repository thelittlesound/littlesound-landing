import { NextRequest, NextResponse } from 'next/server';

const SITE_PASSWORD =
  process.env.SITE_ACCESS_PASSWORD ??
  (process.env.NODE_ENV !== 'production' ? 'dev-preview' : undefined);

const GATE_COOKIE = 'ls_site_access';

export async function POST(request: NextRequest) {
  if (!SITE_PASSWORD) {
    return NextResponse.json(
      { error: 'Site access isn’t configured yet — set SITE_ACCESS_PASSWORD in Vercel.' },
      { status: 500 }
    );
  }

  const { password } = await request.json();

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(GATE_COOKIE, SITE_PASSWORD, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
