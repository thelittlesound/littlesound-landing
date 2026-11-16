import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDatesByActivity, getDateLines } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';
import { describeItem } from '@/lib/date-agent-logic';
import { sessionKey, upcomingSessions } from '@/lib/family-calendar';
import { feedUrl, getKids, getOrCreateFeedToken, getPicks } from '@/lib/family-calendar-server';
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

  // Activities this family has saved from Discover. RLS scopes this to the
  // signed-in user's own rows. Newest first.
  const { data: savedRows } = await supabase
    .from('saved_activities')
    .select('activity_id, title, provider, category, neighborhood, age_min, age_max, price, price_unit, website, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const savedActivities: SavedActivity[] = (savedRows as SavedActivity[]) ?? [];

  // Upcoming registration / session dates for what they've saved.
  const savedIds = savedActivities.map((s) => s.activity_id);
  const dateLines = await getDateLines(savedIds);

  // The calendar first: it gives older profiles' kids stable ids and saves
  // them, so the profile read below (and the editor) uses those same ids.
  const calendar = await loadCalendar(user.id, savedIds);

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, neighborhood, kids, preferences')
    .eq('id', user.id)
    .maybeSingle();

  const initialProfile: Profile = {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    email: profile?.email ?? user.email ?? '',
    neighborhood: profile?.neighborhood ?? '',
    kids: profile?.kids ?? [],
    preferences: profile?.preferences ?? [],
  };


  return <DashboardClient profile={initialProfile} savedActivities={savedActivities} dateLines={dateLines} calendar={calendar} />;
}

// Calendar data (service-role reads, scoped to this user). If the calendar
// tables haven't been created yet, the page still works without it.
async function loadCalendar(userId: string, savedIds: string[]): Promise<CalendarData | null> {
  const token = await getOrCreateFeedToken(userId);
  if (!token) return null;
  const today = seattleToday();
  const [dates, picks, alertsRow, kids, reminderRows] = await Promise.all([
    getDatesByActivity(savedIds),
    getPicks(userId),
    supabaseAdmin.from('profiles').select('email_alerts').eq('id', userId).maybeSingle(),
    getKids(userId, true), // gives older profiles' kids stable ids, so items can be assigned to them
    supabaseAdmin.from('signup_reminders').select('activity_id, open_date').eq('user_id', userId), // empty if the table isn't there yet
  ]);
  const sessions: CalendarData['sessions'] = {};
  const registrations: CalendarData['registrations'] = {};
  for (const id of savedIds) {
    const all = dates.get(id) ?? [];
    const list = upcomingSessions(all, today);
    if (list.length) sessions[id] = list.map((item) => ({ key: sessionKey(item), text: describeItem(item, today), item }));
    const regs = all.filter((i) => i.kind === 'registration' && ((i.start_date ?? '') >= today || (i.end_date ?? '') >= today));
    if (regs.length) registrations[id] = regs;
  }
  // Seattle hour, for "Good morning/afternoon/evening" (the server runs in UTC).
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return {
    hour,
    feedUrl: feedUrl(token),
    emailAlerts: alertsRow.data?.email_alerts !== false,
    today,
    sessions,
    registrations,
    kids,
    reminders: ((reminderRows.data ?? []) as { activity_id: string; open_date: string }[]).map(
      (r) => `${r.activity_id}|${String(r.open_date).slice(0, 10)}`
    ),
    picks: picks
      .filter((p) => savedIds.includes(p.activity_id))
      .map((p) => ({
        activityId: p.activity_id,
        key: p.session_key,
        status: p.status,
        changeNote: p.change_note,
        text: describeItem(p.item, today),
        kidId: p.kid_id ?? null,
        anchor: p.created_at.slice(0, 10),
      })),
  };
}
