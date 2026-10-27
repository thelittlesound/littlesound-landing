import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireProvider } from '@/lib/provider-auth';
import { resolveListings } from '@/lib/claimable';
import { sendEmail, emailShell, esc, TEAM_EMAIL } from '@/lib/notify';
import { CLAIM_ROLES } from '@/lib/claim-roles';

const MAX_LISTINGS_PER_CLAIM = 25;

// Create a claim request: a signed-in provider asks to take ownership of one
// or more existing listings. Nothing is transferred here — the team reviews
// and approves in /admin (app/api/admin/claims/[id]).
export async function POST(request: NextRequest) {
  try {
    const provider = await requireProvider();
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Any signed-in Supabase user passes requireProvider(), including family
    // accounts. Claiming a business's listing needs a real provider account.
    const { data: profile } = await supabaseAdmin
      .from('provider_profiles')
      .select('first_name, last_name, email, business_name, website, phone')
      .eq('id', provider.id)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json(
        { error: 'Claiming a listing needs a provider account. Sign out and create one at /providers/signup.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawIds: unknown = body.activityIds;
    const role = typeof body.role === 'string' ? body.role.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: 'Pick at least one listing to claim.' }, { status: 400 });
    }
    const activityIds = Array.from(new Set(rawIds.filter((x): x is string => typeof x === 'string' && x.length > 0)));
    if (activityIds.length === 0 || activityIds.length > MAX_LISTINGS_PER_CLAIM) {
      return NextResponse.json({ error: 'Invalid listing selection.' }, { status: 400 });
    }
    if (!CLAIM_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Tell us your role at the business.' }, { status: 400 });
    }

    // ── Every listing must exist and still be unowned, right now ────────────
    const resolved = await resolveListings(activityIds);
    for (const id of activityIds) {
      const listing = resolved.get(id);
      if (!listing) {
        return NextResponse.json({ error: 'One of those listings no longer exists.' }, { status: 404 });
      }
      if (!listing.claimable) {
        const yours = listing.ownerId === provider.id;
        return NextResponse.json(
          {
            error: yours
              ? `"${listing.title}" is already yours — it's on your dashboard.`
              : `"${listing.title}" has already been claimed. If that's a mistake, email ${TEAM_EMAIL}.`,
          },
          { status: 409 }
        );
      }
    }

    // ── No duplicate pending requests from the same provider ────────────────
    const { data: pending } = await supabaseAdmin
      .from('listing_claims')
      .select('activity_ids')
      .eq('provider_id', provider.id)
      .eq('status', 'pending');
    const alreadyPending = new Set(((pending ?? []) as { activity_ids: string[] }[]).flatMap((c) => c.activity_ids));
    const overlap = activityIds.find((id) => alreadyPending.has(id));
    if (overlap) {
      return NextResponse.json(
        { error: `You already have a claim in review for "${resolved.get(overlap)!.title}".` },
        { status: 409 }
      );
    }

    const listings = activityIds.map((id) => resolved.get(id)!);
    const businessName = listings[0].business;

    const { error: insertError } = await supabaseAdmin.from('listing_claims').insert({
      provider_id: provider.id,
      activity_ids: activityIds,
      business_name: businessName,
      role,
      message: message || null,
    });
    if (insertError) {
      console.error('Claim insert error:', insertError);
      return NextResponse.json({ error: 'Could not submit your claim. Please try again.' }, { status: 500 });
    }

    // ── Tell the team ───────────────────────────────────────────────────────
    const claimant = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
    await sendEmail({
      to: TEAM_EMAIL,
      subject: `Listing claim: ${businessName} (${listings.length} listing${listings.length === 1 ? '' : 's'})`,
      replyTo: profile.email ?? undefined,
      html: emailShell(
        'New listing claim to review',
        `<p><strong>${esc(claimant)}</strong> (${esc(role)}) at <strong>${esc(profile.business_name)}</strong> &lt;${esc(profile.email)}&gt; wants to claim:</p>
         <ul>${listings.map((l) => `<li>${esc(l.title)} — ${esc(l.business)}${l.website ? ` (${esc(l.website)})` : ''}</li>`).join('')}</ul>
         ${message ? `<p style="background:#F5EFE0;border-radius:12px;padding:12px 16px;">${esc(message)}</p>` : ''}`,
        { label: 'Review in admin', href: 'https://thelittlesound.com/admin' }
      ),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Claim request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
