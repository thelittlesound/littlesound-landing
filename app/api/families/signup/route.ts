import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface Kid {
  age: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      neighborhood,
      kids,
      preferences,
    }: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      neighborhood?: string;
      kids?: Kid[];
      preferences?: string[];
    } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }
    if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // ── 1. Create the auth account ──────────────────────────────────────────
    // Uses the cookie-aware server client so that if the Supabase project has
    // email confirmations disabled, the resulting session is written straight
    // to cookies and the family lands in their dashboard already signed in.
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });

    if (error) {
      const status = error.status === 422 ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (!data.user) {
      return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
    }

    // ── 2. Create the family profile row ────────────────────────────────────
    // Uses the service-role client so this succeeds even when email
    // confirmation is required and no session exists yet.
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      neighborhood: neighborhood || null,
      kids: Array.isArray(kids) ? kids.filter((k) => Number.isFinite(k.age)) : [],
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Account exists even if the profile write failed — don't block the
      // family, they can fill it in from the dashboard.
    }

    return NextResponse.json(
      {
        success: true,
        // If Supabase auto-confirmed the account, data.session is set and
        // the browser already has a valid cookie — client can go straight
        // to the dashboard instead of showing a "check your email" screen.
        confirmedImmediately: !!data.session,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Family signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
