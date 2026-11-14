import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDatesByActivity } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';
import { sessionKey, upcomingSessions } from '@/lib/family-calendar';

export const dynamic = 'force-dynamic';

const MAX_PICKS = 200;

// "Add to my calendar" / "Remove" for one session of a saved activity.
// The browser only says which session (activity + session key); the session
// itself is looked up here from the listing's current dates, so nothing the
// browser sends ends up in a calendar.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const activityId = typeof body.activityId === 'string' ? body.activityId.slice(0, 80) : '';
  const key = typeof body.sessionKey === 'string' ? body.sessionKey.slice(0, 200) : '';
  const action = body.action;
  if (!activityId || !key || (action !== 'add' && action !== 'remove')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (action === 'remove') {
    const { error } = await supabaseAdmin
      .from('calendar_picks')
      .delete()
      .eq('user_id', user.id)
      .eq('activity_id', activityId)
      .eq('session_key', key);
    if (error) {
      console.error('calendar_picks delete error:', error);
      return NextResponse.json({ error: 'Could not remove it. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Only for something this family has saved.
  const { data: saved } = await supabaseAdmin
    .from('saved_activities')
    .select('title, provider')
    .eq('user_id', user.id)
    .eq('activity_id', activityId)
    .maybeSingle();
  if (!saved) return NextResponse.json({ error: 'Save this activity first.' }, { status: 404 });

  const dates = await getDatesByActivity([activityId]);
  const item = upcomingSessions(dates.get(activityId) ?? [], seattleToday()).find((i) => sessionKey(i) === key);
  if (!item) {
    return NextResponse.json({ error: 'That session is no longer listed. Refresh to see the current dates.' }, { status: 409 });
  }

  const { count } = await supabaseAdmin.from('calendar_picks').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) >= MAX_PICKS) {
    return NextResponse.json({ error: 'Your calendar is full. Remove a session first.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('calendar_picks').upsert(
    {
      user_id: user.id,
      activity_id: activityId,
      session_key: key,
      item,
      title: saved.title,
      provider: saved.provider,
      status: 'active',
      change_note: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,activity_id,session_key' }
  );
  if (error) {
    console.error('calendar_picks upsert error:', error);
    return NextResponse.json({ error: 'Could not add it. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
