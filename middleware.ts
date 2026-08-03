import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Two portals share the same shape: some routes need a signed-in user,
// some routes (login/signup) should bounce a signed-in user straight to
// their dashboard instead.
const PORTALS = [
  {
    protectedRoutes: ['/families/dashboard'],
    authRoutes: ['/families/login', '/families/signup'],
    loginPath: '/families/login',
    dashboardPath: '/families/dashboard',
  },
  {
    protectedRoutes: ['/providers/dashboard', '/providers/listings/new'],
    authRoutes: ['/providers/login', '/providers/signup'],
    loginPath: '/providers/login',
    dashboardPath: '/providers/dashboard',
  },
];

// ── Site-wide password gate ─────────────────────────────────────────────────
// We're still building — real family/provider signups aren't live yet, so
// there's no funnel to protect by staying public. This gates the entire site
// behind a shared password until we're ready to launch publicly. Set
// SITE_ACCESS_PASSWORD in Vercel env vars; if it's unset in production, the
// site fails CLOSED (blocks everyone, including us) rather than leaking open.
const SITE_PASSWORD =
  process.env.SITE_ACCESS_PASSWORD ??
  (process.env.NODE_ENV !== 'production' ? 'dev-preview' : undefined);

const GATE_COOKIE = 'ls_site_access';
const GATE_EXEMPT_PATHS = ['/unlock', '/api/site-gate'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isGateExempt = GATE_EXEMPT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isGateExempt) {
    const cookie = request.cookies.get(GATE_COOKIE)?.value;
    if (!SITE_PASSWORD || cookie !== SITE_PASSWORD) {
      const url = new URL('/unlock', request.url);
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
  }

  // ── Family auth session refresh + route protection ─────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the session cookie if it's expired. Required for Server
  // Components to reliably read an authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const portal of PORTALS) {
    const isProtected = portal.protectedRoutes.some((route) => path.startsWith(route));
    const isAuthRoute = portal.authRoutes.some((route) => path.startsWith(route));

    if (isProtected && !user) {
      const redirectUrl = new URL(portal.loginPath, request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL(portal.dashboardPath, request.url));
    }
  }

  // ── Admin auth ───────────────────────────────────────────────────────────
  // Membership in admin_users (not just "is logged in") is what makes
  // someone an admin — checked with the service-role client since that
  // table has no client-facing RLS policies at all.
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  const isAdminLoginRoute = path === '/admin/login';

  if (isAdminRoute && !isAdminLoginRoute) {
    if (!user) {
      const redirectUrl = new URL('/admin/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }
    const { data: adminRow } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (!adminRow) {
      const redirectUrl = new URL('/admin/login', request.url);
      redirectUrl.searchParams.set('next', path);
      redirectUrl.searchParams.set('error', 'not_admin');
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isAdminLoginRoute && user) {
    const { data: adminRow } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (adminRow) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

export const config = {
  // Runs on everything except Next's internal static/image assets and the
  // favicon, so the gate covers pages, API routes, and the sitemap alike.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
