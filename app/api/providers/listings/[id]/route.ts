import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireProvider } from '@/lib/provider-auth';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const NOTIFY_EMAIL = 'hello@thelittlesound.com';

// Edit an existing listing. Requires the logged-in provider to OWN the listing
// (submissions.provider_id === their id). Content fields only — contact name /
// email are account-level (from provider_profiles), not editable per listing.
//
// Status handling:
//   approved  → stays 'approved' (stays LIVE on Discover), reapproval_needed=true
//               so the team re-reviews the change in /admin.
//   rejected  → back to 'pending' (resubmitted); stale rejection note cleared.
//   pending   → stays 'pending'.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await requireProvider();
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // ── Ownership check ─────────────────────────────────────────────────────
    // Fetch the row first and confirm it belongs to this provider. Don't leak
    // whether an id exists to someone who doesn't own it — 404 either way.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, provider_id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Listing fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to load listing' }, { status: 500 });
    }
    if (!existing || existing.provider_id !== provider.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title, category, subcategory, description,
      ageMin, ageMax, price, priceUnit,
      neighborhood, website, phone,
    } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // ── Content update (never touches contact_name / contact_email) ─────────
    const update: Record<string, unknown> = {
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
      phone: phone || null,
      edited_at: new Date().toISOString(),
    };

    // ── Status transition ───────────────────────────────────────────────────
    let resultStatus = existing.status as 'pending' | 'approved' | 'rejected';
    let reapprovalNeeded = false;

    if (existing.status === 'approved') {
      // Keep it live; flag for re-review.
      update.reapproval_needed = true;
      reapprovalNeeded = true;
      resultStatus = 'approved';
    } else if (existing.status === 'rejected') {
      // Resubmit for review; wipe the stale rejection note.
      update.status = 'pending';
      update.reapproval_needed = false;
      update.admin_notes = null;
      update.reviewed_at = null;
      update.reviewed_by = null;
      resultStatus = 'pending';
    } else {
      // pending → still pending; nothing extra to flag.
      update.reapproval_needed = false;
      resultStatus = 'pending';
    }

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(update)
      .eq('id', id);

    if (updateError) {
      console.error('Listing update error:', updateError);
      return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
    }

    // ── Notify the team when they need to act (re-approval or a resubmit) ────
    const needsTeamAction = reapprovalNeeded || resultStatus === 'pending';
    if (BREVO_API_KEY && needsTeamAction) {
      const label = reapprovalNeeded
        ? 'Listing edited — needs re-approval (still live)'
        : 'Listing edited & resubmitted for review';
      await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'Little Sound Providers', email: NOTIFY_EMAIL },
          to: [{ email: NOTIFY_EMAIL, name: 'Little Sound Team' }],
          subject: `${label}: ${title}`,
          htmlContent: buildEditEmail({
            title,
            label,
            category: [category, subcategory].filter(Boolean).join(' › '),
            ages: ageMin != null && ageMax != null ? `${ageMin}–${ageMax} years` : '—',
            price: price != null ? `$${price} / ${priceUnit || ''}` : '—',
            neighborhood: neighborhood || '—',
            website: website || '—',
            description: description || '',
          }),
        }),
      }).catch((e) => console.error('Brevo notify failed:', e));
    }

    return NextResponse.json(
      { success: true, status: resultStatus, reapprovalNeeded },
      { status: 200 }
    );
  } catch (error) {
    console.error('Provider listing update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Email builder ──────────────────────────────────────────────────────────

function buildEditEmail(data: {
  title: string;
  label: string;
  category: string;
  ages: string;
  price: string;
  neighborhood: string;
  website: string;
  description: string;
}) {
  const row = (label: string, value: string) => `<tr>
    <td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">${label}</td>
    <td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${value || '—'}</td>
  </tr>`;

  return `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 4px;">${data.label}</h2>
  <p style="color:#3A5A6A;font-size:14px;margin:0 0 24px;">A provider updated a listing. Review the current version below.</p>
  <table style="width:100%;border-collapse:collapse;background:#F5EFE0;border-radius:12px;overflow:hidden;">
    ${row('Title', data.title)}
    ${row('Category', data.category)}
    ${row('Ages', data.ages)}
    ${row('Price', data.price)}
    ${row('Neighborhood', data.neighborhood)}
    ${row('Website', data.website)}
  </table>
  <div style="margin-top:16px;background:#fff;border:1px solid #E8DFC8;border-radius:12px;padding:16px 20px;">
    <p style="font-size:12px;font-weight:600;color:#7A9AAA;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Description</p>
    <p style="font-size:14px;color:#1C3A4A;line-height:1.6;margin:0;">${data.description}</p>
  </div>
  <p style="font-size:13px;color:#7A9AAA;margin-top:24px;">
    <a href="https://thelittlesound.com/admin" style="color:#1A7A8A;font-weight:600;">Review in admin →</a>
  </p>
</div>`;
}
