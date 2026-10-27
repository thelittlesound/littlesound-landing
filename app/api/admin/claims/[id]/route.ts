import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveListings, getSeed, seedToSubmissionRow } from '@/lib/claimable';
import { sendEmail, emailShell, esc } from '@/lib/notify';

// Approve or reject a listing claim.
//
// Approve = transfer ownership of every listing in the claim to the claimant:
//   • seed listing → copied into `submissions` (status approved, seed_id set,
//     owned by the claimant). The unique index on seed_id makes a second
//     import impossible even if two approvals race.
//   • pre-account submission → provider_id set, but only while it's still
//     null (a conditional update, so it can't overwrite another owner).
//
// Ownership is re-checked here, at approval time. Listings already owned by
// THIS claimant are skipped, so retrying a partly-failed approval is safe.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action;
  const adminNotes = typeof body.admin_notes === 'string' && body.admin_notes.trim() ? body.admin_notes.trim() : null;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: claim } = await supabaseAdmin
    .from('listing_claims')
    .select('id, provider_id, activity_ids, business_name, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }
  if (claim.status !== 'pending') {
    return NextResponse.json({ error: `This claim was already ${claim.status}.` }, { status: 409 });
  }

  const { data: profile } = await supabaseAdmin
    .from('provider_profiles')
    .select('first_name, last_name, email, phone')
    .eq('id', claim.provider_id)
    .maybeSingle();

  const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: admin.email || 'admin', admin_notes: adminNotes };
  const activityIds = claim.activity_ids as string[];

  // ── Reject ────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('listing_claims')
      .update({ status: 'rejected', ...reviewed })
      .eq('id', claim.id);
    if (error) {
      console.error('Claim reject error:', error);
      return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
    }
    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: `About your Little Sound listing claim`,
        html: emailShell(
          'We couldn’t approve your claim yet',
          `<p>Thanks for claiming ${esc(claim.business_name)} on Little Sound. We weren’t able to verify this one yet.</p>
           ${adminNotes ? `<p style="background:#F5EFE0;border-radius:12px;padding:12px 16px;">${esc(adminNotes)}</p>` : ''}
           <p>Just reply to this email and we’ll get it sorted out.</p>`
        ),
      });
    }
    return NextResponse.json({ success: true, status: 'rejected' });
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  if (!profile) {
    return NextResponse.json(
      { error: 'The claimant no longer has a provider profile, so there is no one to transfer these listings to.' },
      { status: 409 }
    );
  }

  const resolved = await resolveListings(activityIds);
  const blockers = activityIds.filter((id) => {
    const l = resolved.get(id);
    return !l || (!l.claimable && l.ownerId !== claim.provider_id);
  });
  if (blockers.length) {
    return NextResponse.json(
      {
        error: `Can't approve: ${blockers
          .map((id) => `"${resolved.get(id)?.title ?? id}"`)
          .join(', ')} ${blockers.length === 1 ? 'is' : 'are'} already owned by another provider or no longer exist. Reject this claim and ask them to resubmit without ${blockers.length === 1 ? 'it' : 'those'}.`,
      },
      { status: 409 }
    );
  }

  const owner = {
    id: claim.provider_id as string,
    contactName: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || null,
    contactEmail: profile.email ?? null,
    phone: profile.phone ?? null,
  };
  const failures: string[] = [];

  for (const id of activityIds) {
    const l = resolved.get(id)!;
    if (!l.claimable) continue; // already the claimant's (retry) — nothing to do

    if (l.source === 'seed') {
      const seed = getSeed(id);
      if (!seed) { failures.push(l.title); continue; }
      const { error } = await supabaseAdmin.from('submissions').insert(seedToSubmissionRow(seed, owner));
      if (error) {
        console.error('Seed import error:', id, error);
        failures.push(error.code === '23505' ? `${l.title} (claimed by someone else a moment ago)` : l.title);
      }
    } else {
      const uuid = id.slice('sub_'.length);
      const { data: updated, error } = await supabaseAdmin
        .from('submissions')
        .update({ provider_id: owner.id })
        .eq('id', uuid)
        .is('provider_id', null)
        .select('id');
      if (error || !updated || updated.length === 0) {
        console.error('Submission assign error:', id, error);
        failures.push(l.title);
      }
    }
  }

  if (failures.length) {
    // Claim stays pending. Anything that did transfer is now the claimant's,
    // and a retry skips it.
    return NextResponse.json(
      { error: `Some listings couldn't be transferred: ${failures.join(', ')}. The claim is still pending — try again, or reject it.` },
      { status: 500 }
    );
  }

  const { error: claimError } = await supabaseAdmin
    .from('listing_claims')
    .update({ status: 'approved', ...reviewed })
    .eq('id', claim.id);
  if (claimError) {
    console.error('Claim approve error:', claimError);
    return NextResponse.json({ error: 'Listings transferred, but the claim status failed to save. Refresh and try again.' }, { status: 500 });
  }

  if (profile.email) {
    const titles = activityIds.map((id) => resolved.get(id)?.title).filter(Boolean) as string[];
    await sendEmail({
      to: profile.email,
      toName: owner.contactName ?? undefined,
      subject: `You’re verified — ${claim.business_name ?? 'your listing'} is yours on Little Sound`,
      html: emailShell(
        'Your listing is yours',
        `<p>Good news: we’ve verified your claim. ${titles.length === 1 ? 'This listing is' : 'These listings are'} now in your provider dashboard:</p>
         <ul>${titles.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
         <p>Take a minute to check the details — prices, ages, and dates — so families see exactly what you offer.</p>`,
        { label: 'Open your dashboard', href: 'https://thelittlesound.com/providers/dashboard' }
      ),
    });
  }

  return NextResponse.json({ success: true, status: 'approved' });
}
