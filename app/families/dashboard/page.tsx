import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDatesByActivity, getDateLines } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';
import { describeItem } from '@/lib/date-agent-logic';
import { sessionKey, upcomingSessions } from '@/lib/family-calendar';
import { feedUrl, getOrCreateFeedToken, getPicks } from '@/lib/family-calendar-server';
import { supabaseAdmin } from '@/lib/supabase';
import DashboardClient, { type CalendarData, type Profile, type SavedActivity } from './DashboardClient';

// Always render fresh — avoids ever serving a router-cached snapshot from
// before a profile update or sign-in.
export const dynamic = 'force-dynamic';

export default async function FamilyDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this route, but redirect defensively in case
  // the page is ever reached without a session (e.g. cookie edge cases).
  if (!user) {
    redirect('/families/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, neighborhood, kids, preferences')
    .eq('id', user.id)
    .maybeSingle();

  // Activities this family has saved from Discover. RLS scopes this to the
  // signed-in user's own rows. Newest first.
  const { data: savedRows } = await supabase
    .from('saved_activities')
    .select('activity_id, title, provider, category, neighborhood, age_min, age_max, price, price_unit, website, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const initialProfile: Profile = {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    email: profile?.email ?? user.email ?? '',
    neighborhood: profile?.neighborhood ?? '',
    kids: profile?.kids ?? [],
    preferences: profile?.preferences ?? [],
  };

  const savedActivities: SavedActivity[] = (savedRows as SavedActivity[]) ?? [];

  // Upcoming registration / session dates for what they've saved.
  const savedIds = savedActivities.map((s) => s.activity_id);
  const dateLines = await getDateLines(savedIds);

  const calendar = await loadCalendar(user.id, savedIds);

  return <DashboardClient profile={initialProfile} savedActivities={savedActivities} dateLines={dateLines} calendar={calendar} />;
}

// Calendar data (service-role reads, scoped to this user). If the calendar
// tables haven't been created yet, the page still works without it.
async function loadCalendar(userId: string, savedIds: string[]): Promise<CalendarData | null> {
  const token = await getOrCreateFeedToken(userId);
  if (!token) return null;
  const today = seattleToday();
  const [dates, picks, alertsRow] = await Promise.all([
    getDatesByActivity(savedIds),
    getPicks(userId),
    supabaseAdmin.from('profiles').select('email_alerts').eq('id', userId).maybeSingle(),
  ]);
  const sessions: CalendarData['sessions'] = {};
  for (const id of savedIds) {
    const list = upcomingSessions(dates.get(id) ?? [], today);
    if (list.length) sessions[id] = list.map((item) => ({ key: sessionKey(item), text: describeItem(item, today), item }));
  }
  return {
    feedUrl: feedUrl(token),
    emailAlerts: alertsRow.data?.email_alerts !== false,
    today,
    sessions,
    picks: picks
      .filter((p) => savedIds.includes(p.activity_id))
      .map((p) => ({
        activityId: p.activity_id,
        key: p.session_key,
        status: p.status,
        changeNote: p.change_note,
        text: describeItem(p.item, today),
      })),
  };
}
