import type { Listing } from '@/components/hive/listing';
import type { ListingDetail } from '@/data/real-listings';
import type { HiveGroup } from '@/lib/group-state';
import type { SearchPreferences } from '@/lib/hive-state';
import { getSupabaseClient } from '@/lib/supabase';

type SubmitListingLeadRequestInput = {
  listing: Listing;
  detail: ListingDetail;
  preferences: SearchPreferences;
  group: HiveGroup | null;
  contactName: string;
  contactEmail: string;
  message: string;
};

export async function submitListingLeadRequest({
  listing,
  detail,
  preferences,
  group,
  contactName,
  contactEmail,
  message,
}: SubmitListingLeadRequestInput) {
  const supabase = getSupabaseClient();
  const user = await getOrCreateLeadUser();
  const normalizedName = contactName.trim() || preferences.username;
  const normalizedEmail = contactEmail.trim().toLowerCase();
  const normalizedMessage = message.trim();

  const { error: profileError } = await supabase
    .from('app_profiles')
    .upsert(
      {
        id: user.id,
        username: normalizeUsername(normalizedName),
        campus_slug: normalizeCampusSlug(preferences.campusSlug || preferences.campusName),
      },
      { onConflict: 'id' },
    );

  if (profileError) {
    throw new Error(`Unable to prepare your request: ${profileError.message}`);
  }

  const { error } = await supabase
    .from('lead_requests')
    .insert({
      submitted_by: user.id,
      group_id: group?.id ?? null,
      property_id: listing.id,
      campus_id: detail.property.campus_id,
      lead_type: 'listing_info',
      contact_name: normalizedName,
      contact_email: normalizedEmail,
      message: normalizedMessage,
      partner_share_consent: true,
      partner_share_consented_at: new Date().toISOString(),
      source_screen: 'listing_detail',
      preferences_snapshot: {
        campusSlug: preferences.campusSlug,
        campusName: preferences.campusName,
        budgetMin: preferences.budgetMin,
        budgetMax: preferences.budgetMax,
        moveIn: preferences.moveIn,
        distanceMiles: preferences.distanceMiles,
        bedrooms: preferences.bedrooms,
        bathrooms: preferences.bathrooms,
        commuteMode: preferences.commuteMode,
        parking: preferences.parking,
      },
      listing_snapshot: {
        title: listing.title,
        address: listing.address ?? null,
        price: listing.price,
        campus: listing.campus ?? null,
        campusDistance: listing.campusDistance ?? null,
        managerDisplayName: listing.managerDisplayName ?? null,
        sourceUrl: listing.sourceUrl ?? detail.property.source_url,
      },
      metadata: {
        groupId: group?.id ?? null,
        requestVersion: 1,
      },
    });

  if (error) {
    throw new Error(`Unable to send request: ${error.message}`);
  }
}

async function getOrCreateLeadUser() {
  const supabase = getSupabaseClient();
  const sessionResult = await supabase.auth.getSession();

  if (sessionResult.error) {
    throw new Error(`Unable to read Hive session: ${sessionResult.error.message}`);
  }

  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user;
  }

  const signInResult = await supabase.auth.signInAnonymously();

  if (signInResult.error) {
    throw new Error(`Unable to start a request session: ${signInResult.error.message}`);
  }

  if (!signInResult.data.user) {
    throw new Error('Unable to start a request session.');
  }

  return signInResult.data.user;
}

function normalizeUsername(value: string) {
  const normalized = value.trim().slice(0, 32);
  return normalized.length >= 2 ? normalized : 'Hive user';
}

function normalizeCampusSlug(value?: string) {
  const normalized = String(value || 'ucla')
    .trim()
    .toLowerCase();

  return normalized || 'ucla';
}
