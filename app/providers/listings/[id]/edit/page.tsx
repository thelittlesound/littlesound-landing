import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import ListingForm from '../../new/ListingForm';

// Always render fresh — the form is seeded from the current listing row, which
// changes as the provider edits and the team reviews. Never a cached snapshot.
export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/providers/login?next=/providers/listings/${params.id}/edit`);
  }

  // Load the listing and confirm this provider owns it. If it doesn't exist or
  // belongs to someone else, send them back to their dashboard rather than
  // revealing anything about the row.
  const { data: listing } = await supabaseAdmin
    .from('submissions')
    .select('id, provider_id, status, title, category, subcategory, description, age_min, age_max, price, price_unit, neighborhood, website, phone')
    .eq('id', params.id)
    .maybeSingle();

  if (!listing || listing.provider_id !== user.id) {
    redirect('/providers/dashboard');
  }

  const { data: profile } = await supabaseAdmin
    .from('provider_profiles')
    .select('first_name, last_name, email, business_name, category')
    .eq('id', user.id)
    .maybeSingle();

  // Map the DB row (nullable, numeric) into the form's string-based shape.
  const initial = {
    title: listing.title ?? '',
    category: listing.category ?? '',
    subcategory: listing.subcategory ?? '',
    description: listing.description ?? '',
    ageMin: listing.age_min != null ? String(listing.age_min) : '',
    ageMax: listing.age_max != null ? String(listing.age_max) : '',
    price: listing.price != null ? String(listing.price) : '',
    priceUnit: listing.price_unit ?? 'week',
    neighborhood: listing.neighborhood ?? '',
    website: listing.website ?? '',
    phone: listing.phone ?? '',
  };

  return (
    <ListingForm
      mode="edit"
      listingId={listing.id}
      currentStatus={listing.status as 'pending' | 'approved' | 'rejected'}
      initial={initial}
      contactName={
        profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : ''
      }
      contactEmail={profile?.email ?? user.email ?? ''}
      businessName={profile?.business_name ?? ''}
      defaultCategory={profile?.category ?? ''}
    />
  );
}
