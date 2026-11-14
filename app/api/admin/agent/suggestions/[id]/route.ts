import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { validateItems, type DateItem } from '@/lib/activity-dates';
import { AGENT, isPast } from '@/lib/date-agent-logic';
import { seattleToday } from '@/lib/activity-dates';
import { TEAM_EMAIL } from '@/lib/notify';

// Add a suggested program as a real listing, or dismiss it.
//
// "Add" creates an approved, unowned `submissions` row — live on Discover
// right away, and claimable by the provider later through the normal claim
// flow (it's a pre-account listing). Its dates, if any, are published too.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { action } = await request.json().catch(() => ({}));
  if (action !== 'add' && action !== 'dismiss') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: s } = await supabaseAdmin.from('suggested_listings').select('*').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (s.status !== 'pending') return NextResponse.json({ error: `Already ${s.status}.` }, { status: 409 });

  const reviewed = { reviewed_by: admin.email || 'admin', reviewed_at: new Date().toISOString() };

  if (action === 'dismiss') {
    await supabaseAdmin.from('suggested_listings').update({ status: 'dismissed', ...reviewed }).eq('id', s.id);
    return NextResponse.json({ success: true });
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('submissions')
    .insert({
      status: 'approved',
      provider_id: null,
      contact_name: s.business, // pre-account listings use the business as the contact (claim flow groups by it)
      contact_email: TEAM_EMAIL,
      title: s.title,
      category: s.category,
      subcategory: s.subcategory,
      description: s.description,
      age_min: s.age_min,
      age_max: s.age_max,
      price: s.price,
      price_unit: s.price_unit,
      neighborhood: s.neighborhood,
      website: s.website,
      reviewed_at: reviewed.reviewed_at,
      reviewed_by: reviewed.reviewed_by,
      admin_notes: 'Added from a date-agent suggestion',
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('add suggestion error:', insertError);
    return NextResponse.json({ error: 'Could not create the listing.' }, { status: 500 });
  }
  const activityId = `sub_${created.id}`;

  const upcoming = ((s.items ?? []) as DateItem[]).filter((i) => !isPast(i, seattleToday()));
  const checked = validateItems(upcoming);
  if ('items' in checked && checked.items.length) {
    const { error } = await supabaseAdmin.rpc('replace_activity_dates', {
      p_activity_id: activityId,
      p_items: checked.items,
      p_source_url: s.website ?? '',
      p_approved_by: `${AGENT}·${admin.email || 'admin'}`,
    });
    if (error) console.error('suggestion dates error:', error);
  }

  await supabaseAdmin
    .from('suggested_listings')
    .update({ status: 'added', added_activity_id: activityId, ...reviewed })
    .eq('id', s.id);
  return NextResponse.json({ success: true, activityId });
}
