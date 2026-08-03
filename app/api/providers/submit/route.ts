import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireProvider } from '@/lib/provider-auth';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const NOTIFY_EMAIL = 'hello@thelittlesound.com';

// Listing submissions only — account creation happens in
// /api/providers/signup. This route requires an authenticated provider and
// tags the submission with their id so it shows up on their dashboard.
export async function POST(request: NextRequest) {
  try {
    const provider = await requireProvider();
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contactName, contactEmail,
      title, category, subcategory, description,
      ageMin, ageMax,
      price, priceUnit,
      neighborhood, website, phone,
    } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // ── 1. Save to Supabase, tagged with the provider who submitted it ──────
    const { error: dbError } = await supabaseAdmin
      .from('submissions')
      .insert({
        provider_id: provider.id,
        contact_name: contactName || null,
        contact_email: contactEmail || provider.email || null,
        phone: phone || null,
        title,
        category: category || null,
        subcategory: subcategory || null,
        description: description || null,
        age_min: ageMin ? Number(ageMin) : null,
        age_max: ageMax ? Number(ageMax) : null,
        price: price ? Number(price) : null,
        price_unit: priceUnit || null,
        neighborhood: neighborhood || null,
        website: website || null,
        status: 'pending',
      });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 });
    }

    // ── 2. Send notification email ────────────────────────────────────────────
    if (BREVO_API_KEY) {
      const htmlContent = buildListingEmail({
        name: contactName, email: contactEmail,
        title, category, subcategory, description,
        ageMin, ageMax, price, priceUnit,
        neighborhood, website, phone,
      });

      await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Little Sound Providers', email: NOTIFY_EMAIL },
          to: [{ email: NOTIFY_EMAIL, name: 'Little Sound Team' }],
          replyTo: { email: contactEmail || provider.email || NOTIFY_EMAIL, name: contactName || '' },
          subject: `New listing submission: ${title}`,
          htmlContent,
        }),
      });
    }

    return NextResponse.json(
      { success: true, message: 'Submission received' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Provider submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Email builder ──────────────────────────────────────────────────────────

function row(label: string, value: string | number | null | undefined) {
  return `<tr>
    <td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">${label}</td>
    <td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${value || '—'}</td>
  </tr>`;
}

function buildListingEmail(data: Record<string, string | number | null | undefined>) {
  return `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 4px;">New listing submission</h2>
  <p style="color:#3A5A6A;font-size:14px;margin:0 0 24px;">Ready to review and approve.</p>
  <table style="width:100%;border-collapse:collapse;background:#F5EFE0;border-radius:12px;overflow:hidden;">
    ${row('Title', data.title)}
    ${row('Category', [data.category, data.subcategory].filter(Boolean).join(' › '))}
    ${row('Ages', `${data.ageMin}–${data.ageMax} years`)}
    ${row('Price', `$${data.price} / ${data.priceUnit}`)}
    ${row('Neighborhood', data.neighborhood)}
    ${row('Website', data.website)}
    ${row('Contact', data.name)}
    ${row('Email', data.email)}
    ${row('Phone', data.phone)}
  </table>
  <div style="margin-top:16px;background:#fff;border:1px solid #E8DFC8;border-radius:12px;padding:16px 20px;">
    <p style="font-size:12px;font-weight:600;color:#7A9AAA;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Description</p>
    <p style="font-size:14px;color:#1C3A4A;line-height:1.6;margin:0;">${data.description || ''}</p>
  </div>
  <p style="font-size:13px;color:#7A9AAA;margin-top:24px;">
    <a href="https://thelittlesound.com/admin" style="color:#1A7A8A;font-weight:600;">Review &amp; approve in admin →</a>
  </p>
</div>`;
}
