import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { validateItems } from '@/lib/activity-dates';
import { AGENT } from '@/lib/date-agent-logic';

// Approve (publish) or dismiss one item in the agent's review inbox.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { action } = await request.json().catch(() => ({}));
  if (action !== 'approve' && action !== 'dismiss') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: draft } = await supabaseAdmin
    .from('date_drafts')
    .select('id, activity_id, items, source_urls, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.status !== 'pending') return NextResponse.json({ error: `Already ${draft.status}.` }, { status: 409 });

  const reviewed = { reviewed_by: admin.email || 'admin', reviewed_at: new Date().toISOString() };

  if (action === 'dismiss') {
    await supabaseAdmin.from('date_drafts').update({ status: 'dismissed', ...reviewed }).eq('id', draft.id);
    return NextResponse.json({ success: true });
  }

  const checked = validateItems(draft.items);
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  // Tagged agent·<email>: still agent-sourced, so later site changes can be
  // auto-published. (Dates typed in the Dates tab are tagged with the plain
  // email and are never overwritten automatically.)
  const { error } = await supabaseAdmin.rpc('replace_activity_dates', {
    p_activity_id: draft.activity_id,
    p_items: checked.items,
    p_source_url: (draft.source_urls ?? [])[0] ?? '',
    p_approved_by: `${AGENT}·${admin.email || 'admin'}`,
  });
  if (error) {
    console.error('approve draft error:', error);
    return NextResponse.json({ error: 'Could not publish these dates.' }, { status: 500 });
  }
  await supabaseAdmin.from('date_drafts').update({ status: 'approved', ...reviewed }).eq('id', draft.id);
  await supabaseAdmin
    .from('listing_sources')
    .update({ last_status: 'published', last_message: `Approved from the inbox by ${admin.email || 'admin'}` })
    .eq('activity_id', draft.activity_id);
  return NextResponse.json({ success: true, published: checked.items.length });
}
