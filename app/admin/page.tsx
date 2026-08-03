import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import AdminClient from './AdminClient';

// Always render fresh — avoids ever serving a router-cached snapshot from
// before a sign-in.
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Defense in depth — middleware.ts already gates this route the same way,
  // but this server component checks independently rather than trusting
  // middleware alone.
  const { data: adminRow } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!adminRow) {
    redirect('/admin/login?error=not_admin');
  }

  return <AdminClient adminEmail={user.email ?? ''} />;
}
