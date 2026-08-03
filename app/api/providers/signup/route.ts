import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const NOTIFY_EMAIL = 'hello@thelittlesound.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      businessName,
      category,
      website,
      phone,
    }: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      businessName: string;
      category?: string;
      website?: string;
      phone?: string;
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
    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    // ── 1. Create the auth account ──────────────────────────────────────────
    // Cookie-aware server client — if the Supabase project has email
    // confirmations disabled, the session lands straight in cookies and the
    // provider goes right into creating their first listing.
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

    // ── 2. Create the provider profile row ──────────────────────────────────
    const { error: profileError } = await supabaseAdmin.from('provider_profiles').upsert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      business_name: businessName,
      category: category || null,
      website: website || null,
      phone: phone || null,
    });

    if (profileError) {
      console.error('Provider profile upsert error:', profileError);
      // Account exists even if this fails — not worth blocking signup over.
    }

    // ── 3. Add to Brevo provider list ────────────────────────────────────────
    const PROVIDER_LIST_ID = Number(process.env.BREVO_PROVIDER_LIST_ID) || 5;

    if (BREVO_API_KEY) {
      await fetch(`${BREVO_API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          attributes: {
            FIRSTNAME: firstName,
            LASTNAME: lastName,
            COMPANY: businessName,
          },
          listIds: [PROVIDER_LIST_ID],
          updateEnabled: true,
        }),
      });

      // ── 4. Notify hello@ ────────────────────────────────────────────────────
      const htmlContent = `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 4px;">New provider account</h2>
  <p style="color:#3A5A6A;font-size:14px;margin:0 0 24px;">Someone just created a provider account on <a href="https://thelittlesound.com/providers/signup" style="color:#1A7A8A;">thelittlesound.com</a></p>
  <table style="width:100%;border-collapse:collapse;background:#F5EFE0;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Name</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${firstName} ${lastName}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Email</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${email}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Business</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${businessName}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Category</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${category || '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Website</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${website || '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">Phone</td><td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${phone || '—'}</td></tr>
  </table>
  <p style="font-size:13px;color:#7A9AAA;margin-top:24px;">They'll be prompted to create their first listing next.</p>
</div>`;

      await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Little Sound Providers', email: NOTIFY_EMAIL },
          to: [{ email: NOTIFY_EMAIL, name: 'Little Sound Team' }],
          replyTo: { email, name: `${firstName} ${lastName}` },
          subject: `New provider signup: ${businessName}`,
          htmlContent,
        }),
      });
    }

    return NextResponse.json(
      {
        success: true,
        confirmedImmediately: !!data.session,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Provider signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
