import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadClaimContext } from './loadClaimContext';
import ClaimClient from './ClaimClient';

// Live ownership data — never serve a cached list.
export const dynamic = 'force-dynamic';

// /providers/claim — search every unowned listing and claim yours.
export default async function ClaimSearchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/providers/login?next=/providers/claim');
  }

  const ctx = await loadClaimContext(user.id);

  return <ClaimClient {...ctx} initialId={null} notice={null} />;
}
