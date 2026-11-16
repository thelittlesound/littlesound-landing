import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDatesByActivity } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';

export const dynamic = 'force-dynamic';

// "Remind me" on the Signup radar: turn the day-before + morning-of email on
// or off for one registration opening of a saved activity.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const activityId = typeof body.activityId === 'string' ? body.activityId.slice(0, 80) : '';
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : '';
  if (!activityId || !date || typeof body.on !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body.on) {
    const { error } = await supabaseAdmin.from('signup_reminders').delete().eq('user_id', user.id).eq('activity_id', activityId).eq('open_date', date);
    if (error) {
      console.error('signup_reminders delete error:', error);
      return NextResponse.json({ error: 'Could not change that. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, on: false });
  }

  const { data: saved } = await supabaseAdmin
    .from('saved_activities')
    .select('activity_id')
    .eq('user_id', user.id)
    .eq('activity_id', activityId)
    .maybeSingle();
  if (!saved) return NextResponse.json({ error: 'Save this activity first.' }, { status: 404 });

  const today = seattleToday();
  const items = (await getDatesByActivity([activityId])).get(activityId) ?? [];
  if (date < today || !items.some((i) => i.kind === 'registration' && i.start_date === date)) {
    return NextResponse.json({ error: 'That registration date isn’t listed anymore. Refresh to see the latest.' }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from('signup_reminders')
    .upsert({ user_id: user.id, activity_id: activityId, open_date: date }, { onConflict: 'user_id,activity_id,open_date', ignoreDuplicates: true });
  if (error) {
    console.error('signup_reminders upsert error:', error);
    return NextResponse.json({ error: 'Could not set the reminder. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, on: true });
}
