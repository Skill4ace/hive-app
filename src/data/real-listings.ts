import type { Listing } from '@/components/hive/listing';
import type { MoveInPreference, SearchPreferences } from '@/lib/hive-state';
import { getSupabaseClient } from '@/lib/supabase';

type CampusRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type ListingSearchRow = {
  property_id: string;
  campus_id: string;
  source_id: string;
  source_url: string;
  title: string;
  slug: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_photo_url: string | null;
  storage_photo_path: string | null;
  min_rent: number | null;
  max_rent: number | null;
  min_beds: number | null;
  max_beds: number | null;
  min_baths: number | null;
  max_baths: number | null;
  available_unit_count: number;
  total_unit_count: number;
  earliest_move_in: string | null;
  walk_seconds: number | null;
  bike_seconds: number | null;
  drive_seconds: number | null;
  transit_seconds: number | null;
  distance_meters: number | null;
  promotion_badge: string | null;
  manager_display_name: string | null;
  active: boolean;
  quality_score: number;
  updated_at: string;
};

type PropertyRow = {
  id: string;
  name: string;
  slug: string;
  property_type: string | null;
  description: string | null;
  address: string | null;
  manager_display_name: string | null;
  source_url: string;
};

type PhotoRow = {
  property_id?: string;
  source_url: string;
  storage_bucket: string | null;
  storage_path: string | null;
  display_order: number;
  download_status: string;
};

export type UnitRow = {
  id: string;
  listing_type: string | null;
  title: string | null;
  rent_monthly: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_occupants: number | null;
  available: boolean | null;
  availability_status: 'available_now' | 'available_on' | 'not_available' | 'unknown';
  move_in: string | null;
  lease_term_months: number | null;
  security_deposit: number | null;
  parking_spots: number | null;
  description: string | null;
};

type PromotionRow = {
  badge: string | null;
  description: string | null;
};

export type FaqRow = {
  question: string;
  answer: string;
  display_order: number;
};

export type ListingDetail = {
  listing: Listing;
  property: PropertyRow;
  units: UnitRow[];
  photos: string[];
  promotion: PromotionRow | null;
  faqs: FaqRow[];
};

const LISTING_SEARCH_SELECT = [
  'property_id',
  'campus_id',
  'source_id',
  'source_url',
  'title',
  'slug',
  'address',
  'latitude',
  'longitude',
  'primary_photo_url',
  'storage_photo_path',
  'min_rent',
  'max_rent',
  'min_beds',
  'max_beds',
  'min_baths',
  'max_baths',
  'available_unit_count',
  'total_unit_count',
  'earliest_move_in',
  'walk_seconds',
  'bike_seconds',
  'drive_seconds',
  'transit_seconds',
  'distance_meters',
  'promotion_badge',
  'manager_display_name',
  'active',
  'quality_score',
  'updated_at',
].join(',');

export async function fetchRealListings(preferences: SearchPreferences) {
  const supabase = getSupabaseClient();
  const campus = await fetchCampus(preferences.campusSlug);
  const { data, error } = await supabase
    .from('listing_search_index')
    .select(LISTING_SEARCH_SELECT)
    .eq('campus_id', campus.id)
    .eq('active', true)
    .gt('available_unit_count', 0)
    .not('primary_photo_url', 'is', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('quality_score', { ascending: false })
    .limit(220);

  if (error) {
    throw new Error(`Unable to load listings: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ListingSearchRow[];
  const photoMap = await fetchPhotoMap(rows.map((row) => row.property_id));

  return mapAndRankRows(rows, preferences, campus, photoMap);
}

export async function fetchListingsByIds(ids: string[], preferences: SearchPreferences) {
  if (ids.length === 0) return [];

  const supabase = getSupabaseClient();
  const campus = await fetchCampus(preferences.campusSlug);
  const { data, error } = await supabase
    .from('listing_search_index')
    .select(LISTING_SEARCH_SELECT)
    .eq('campus_id', campus.id)
    .in('property_id', ids);

  if (error) {
    throw new Error(`Unable to load saved listings: ${error.message}`);
  }

  const order = new Map(ids.map((id, index) => [id, index]));
  const rows = (data ?? []) as unknown as ListingSearchRow[];
  const photoMap = await fetchPhotoMap(rows.map((row) => row.property_id));

  return mapAndRankRows(rows, preferences, campus, photoMap).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

export async function fetchListingDetail(id: string, preferences: SearchPreferences): Promise<ListingDetail> {
  const supabase = getSupabaseClient();
  const campus = await fetchCampus(preferences.campusSlug);
  const searchPromise = supabase
    .from('listing_search_index')
    .select(LISTING_SEARCH_SELECT)
    .eq('property_id', id)
    .maybeSingle();
  const propertyPromise = supabase
    .from('properties')
    .select('id,name,slug,property_type,description,address,manager_display_name,source_url')
    .eq('id', id)
    .single();
  const photosPromise = supabase
    .from('listing_photos')
    .select('source_url,storage_bucket,storage_path,display_order,download_status')
    .eq('property_id', id)
    .order('display_order', { ascending: true });
  const unitsPromise = supabase
    .from('property_units')
    .select('id,listing_type,title,rent_monthly,bedrooms,bathrooms,max_occupants,available,availability_status,move_in,lease_term_months,security_deposit,parking_spots,description')
    .eq('property_id', id)
    .order('rent_monthly', { ascending: true, nullsFirst: false });
  const promotionPromise = supabase
    .from('property_promotions')
    .select('badge,description')
    .eq('property_id', id)
    .maybeSingle();
  const faqsPromise = supabase
    .from('property_faqs')
    .select('question,answer,display_order')
    .eq('property_id', id)
    .order('display_order', { ascending: true });

  const [searchResult, propertyResult, photosResult, unitsResult, promotionResult, faqsResult] =
    await Promise.all([searchPromise, propertyPromise, photosPromise, unitsPromise, promotionPromise, faqsPromise]);

  if (propertyResult.error) {
    throw new Error(`Unable to load listing detail: ${propertyResult.error.message}`);
  }
  if (searchResult.error) {
    throw new Error(`Unable to load listing summary: ${searchResult.error.message}`);
  }
  if (photosResult.error) {
    throw new Error(`Unable to load listing photos: ${photosResult.error.message}`);
  }
  if (unitsResult.error) {
    throw new Error(`Unable to load listing units: ${unitsResult.error.message}`);
  }
  if (promotionResult.error) {
    throw new Error(`Unable to load listing promotion: ${promotionResult.error.message}`);
  }
  if (faqsResult.error) {
    throw new Error(`Unable to load listing FAQs: ${faqsResult.error.message}`);
  }

  const property = propertyResult.data as PropertyRow;
  const units = ((unitsResult.data ?? []) as UnitRow[]).sort(sortUnits);
  const photos = mapPhotoUrls((photosResult.data ?? []) as PhotoRow[]);
  const searchRow = searchResult.data
    ? (searchResult.data as unknown as ListingSearchRow)
    : buildFallbackSearchRow(property, units, photos[0]);
  const listing = mapSearchRowToListing(searchRow, preferences, campus, {
    photos: photos.filter((photo): photo is string => Boolean(photo)),
    description: property.description,
    amenities: buildAmenities(searchRow, units, promotionResult.data as PromotionRow | null),
  });

  return {
    listing,
    property,
    units,
    photos,
    promotion: promotionResult.data as PromotionRow | null,
    faqs: (faqsResult.data ?? []) as FaqRow[],
  };
}

export function searchListings(listings: Listing[], query: string) {
  const normalized = normalizeText(query);
  if (!normalized || normalized === 'ucla') return listings;

  return listings.filter((listing) =>
    normalizeText(
      [
        listing.title,
        listing.address,
        listing.location,
        listing.managerDisplayName,
        listing.amenities.join(' '),
      ].join(' '),
    ).includes(normalized),
  );
}

export function formatMoney(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 'Contact';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatMoveIn(value: string | null | undefined) {
  if (!value) return 'Flexible';

  const date = parseDate(value);
  if (!date) return 'Flexible';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date <= today) return 'Available now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatSeconds(seconds: number | null | undefined, mode: 'walk' | 'bike' | 'drive' | 'transit') {
  if (!Number.isFinite(seconds)) return null;

  const minutes = Math.max(1, Math.round(Number(seconds) / 60));
  const label = mode === 'walk' ? 'walk' : mode === 'bike' ? 'bike' : mode === 'drive' ? 'drive' : 'transit';

  return `${minutes} min ${label}`;
}

function fetchCampus(slug: string) {
  const supabase = getSupabaseClient();

  return supabase
    .from('campuses')
    .select('id,slug,name,short_name,latitude,longitude')
    .eq('slug', slug)
    .single()
    .then(({ data, error }) => {
      if (error) throw new Error(`Unable to load campus: ${error.message}`);
      return data as CampusRow;
    });
}

async function fetchPhotoMap(propertyIds: string[]) {
  const ids = [...new Set(propertyIds)].filter(Boolean);
  const photoMap = new Map<string, string[]>();

  if (ids.length === 0) return photoMap;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('listing_photos')
    .select('property_id,source_url,storage_bucket,storage_path,display_order,download_status')
    .in('property_id', ids)
    .order('property_id', { ascending: true })
    .order('display_order', { ascending: true })
    .limit(5000);

  if (error) {
    return photoMap;
  }

  const groupedRows = new Map<string, PhotoRow[]>();
  for (const row of (data ?? []) as PhotoRow[]) {
    if (!row.property_id) continue;
    const current = groupedRows.get(row.property_id) ?? [];
    current.push(row);
    groupedRows.set(row.property_id, current);
  }

  for (const [propertyId, rows] of groupedRows) {
    photoMap.set(propertyId, mapPhotoUrls(rows).slice(0, 12));
  }

  return photoMap;
}

function mapAndRankRows(
  rows: ListingSearchRow[],
  preferences: SearchPreferences,
  campus: CampusRow,
  photoMap = new Map<string, string[]>(),
) {
  return rows
    .filter((row) => row.active && row.available_unit_count > 0 && row.primary_photo_url && row.latitude && row.longitude)
    .map((row) => mapSearchRowToListing(row, preferences, campus, { photos: photoMap.get(row.property_id) }))
    .sort((a, b) => {
      if (b.match !== a.match) return b.match - a.match;
      return (a.minRent ?? Number.MAX_SAFE_INTEGER) - (b.minRent ?? Number.MAX_SAFE_INTEGER);
    });
}

function mapSearchRowToListing(
  row: ListingSearchRow,
  preferences: SearchPreferences,
  campus: CampusRow,
  detail?: { photos?: string[]; description?: string | null; amenities?: string[] },
): Listing {
  const score = scoreListing(row, preferences);
  const photos = detail?.photos && detail.photos.length > 0
    ? detail.photos
    : [row.primary_photo_url].filter((photo): photo is string => Boolean(photo));
  const amenities = detail?.amenities ?? buildAmenities(row);
  const walkCommute = formatSeconds(row.walk_seconds, 'walk');
  const bikeCommute = formatSeconds(row.bike_seconds, 'bike');
  const preferredCommute = formatSeconds(getCommuteSeconds(row, preferences.commuteMode), preferences.commuteMode);

  return {
    id: row.property_id,
    title: row.title,
    price: formatPriceRange(row.min_rent, row.max_rent),
    priceShort: formatShortPrice(row.min_rent, row.max_rent),
    location: summarizeAddress(row.address),
    address: row.address ?? undefined,
    campus: campus.short_name ?? campus.name,
    campusDistance: formatDistance(row.distance_meters),
    campusCommute: preferredCommute ?? walkCommute ?? bikeCommute ?? 'Near campus',
    coordinates:
      Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
        ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
        : undefined,
    available: formatMoveIn(row.earliest_move_in),
    image: photos[0] ?? row.primary_photo_url ?? '',
    photos,
    beds: toDisplayNumber(row.max_beds ?? row.min_beds, 1),
    baths: toDisplayNumber(row.max_baths ?? row.min_baths, 1),
    bedsLabel: formatRange(row.min_beds, row.max_beds, 'Bed'),
    bathsLabel: formatRange(row.min_baths, row.max_baths, 'Bath'),
    amenities,
    match: score,
    overview: detail?.description ?? undefined,
    minRent: nullableNumber(row.min_rent),
    maxRent: nullableNumber(row.max_rent),
    minBeds: nullableNumber(row.min_beds),
    maxBeds: nullableNumber(row.max_beds),
    minBaths: nullableNumber(row.min_baths),
    maxBaths: nullableNumber(row.max_baths),
    distanceMiles: row.distance_meters ? Number(row.distance_meters) / 1609.344 : undefined,
    moveInDate: row.earliest_move_in ?? undefined,
    sourceUrl: row.source_url,
    managerDisplayName: row.manager_display_name ?? undefined,
    availableUnitCount: row.available_unit_count,
    totalUnitCount: row.total_unit_count,
    qualityScore: row.quality_score,
  };
}

function scoreListing(row: ListingSearchRow, preferences: SearchPreferences) {
  const budget = scoreBudget(row.min_rent, row.max_rent, preferences);
  const distance = scoreDistance(row.distance_meters, preferences.distanceMiles);
  const size = (scoreRange(row.min_beds, row.max_beds, preferences.bedrooms) + scoreRange(row.min_baths, row.max_baths, preferences.bathrooms)) / 2;
  const moveIn = scoreMoveIn(row.earliest_move_in, preferences.moveIn);
  const quality = scoreQuality(row);

  return Math.round((budget * 0.4 + distance * 0.25 + size * 0.15 + moveIn * 0.1 + quality * 0.1) * 100);
}

function scoreBudget(minRent: number | null, maxRent: number | null, preferences: SearchPreferences) {
  if (!Number.isFinite(minRent) && !Number.isFinite(maxRent)) return 0.45;

  const listingMin = Number.isFinite(minRent) ? Number(minRent) : Number(maxRent);
  const listingMax = Number.isFinite(maxRent) ? Number(maxRent) : listingMin;

  if (listingMax >= preferences.budgetMin && listingMin <= preferences.budgetMax) return 1;

  const gap = listingMax < preferences.budgetMin ? preferences.budgetMin - listingMax : listingMin - preferences.budgetMax;
  return clamp(1 - gap / 1300, 0, 0.82);
}

function scoreDistance(distanceMeters: number | null, maxMiles: number) {
  if (!Number.isFinite(distanceMeters)) return 0.55;

  const miles = Number(distanceMeters) / 1609.344;
  if (miles <= maxMiles) return 1;

  return clamp(1 - (miles - maxMiles) / Math.max(maxMiles, 0.85), 0, 0.86);
}

function scoreRange(min: number | null, max: number | null, target: number) {
  if (!Number.isFinite(min) && !Number.isFinite(max)) return 0.62;

  const low = Number.isFinite(min) ? Number(min) : Number(max);
  const high = Number.isFinite(max) ? Number(max) : low;

  if (target >= low && target <= high) return 1;
  if (target <= high) return 0.9;

  return clamp(1 - (target - high) * 0.22, 0.42, 0.8);
}

function scoreMoveIn(moveIn: string | null, preference: MoveInPreference) {
  if (preference === 'Flexible' || !moveIn) return 1;

  const date = parseDate(moveIn);
  if (!date) return 0.75;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date <= today) return 1;

  const preferredMonth = { Aug: 7, Sep: 8, Oct: 9 }[preference];
  const delta = Math.abs(date.getMonth() - preferredMonth);

  if (delta === 0) return 1;
  if (delta === 1) return 0.82;
  return 0.62;
}

function scoreQuality(row: ListingSearchRow) {
  const base = clamp((row.quality_score || 70) / 100, 0, 1);
  const photoBoost = row.primary_photo_url ? 0.15 : 0;
  const availabilityBoost = Math.min(row.available_unit_count, 4) * 0.035;

  return clamp(base * 0.78 + photoBoost + availabilityBoost, 0, 1);
}

function getCommuteSeconds(row: ListingSearchRow, mode: SearchPreferences['commuteMode']) {
  if (mode === 'bike') return row.bike_seconds;
  if (mode === 'drive') return row.drive_seconds;
  if (mode === 'transit') return row.transit_seconds;
  return row.walk_seconds;
}

function buildAmenities(row: ListingSearchRow, units: UnitRow[] = [], promotion?: PromotionRow | null) {
  const items = new Set<string>();
  const availableCount = row.available_unit_count;
  const walk = formatSeconds(row.walk_seconds, 'walk');
  const bike = formatSeconds(row.bike_seconds, 'bike');
  const hasParking = units.some((unit) => Number(unit.parking_spots) > 0);
  const shortestLease = minNumber(units.map((unit) => unit.lease_term_months));

  if (availableCount > 1) items.add(`${availableCount} units`);
  if (row.promotion_badge || promotion?.badge) items.add(row.promotion_badge ?? promotion?.badge ?? '');
  if (hasParking) items.add('Parking');
  if (shortestLease && shortestLease <= 6) items.add(`${shortestLease} mo lease`);
  if (walk && row.walk_seconds && row.walk_seconds <= 15 * 60) items.add(walk);
  else if (bike && row.bike_seconds && row.bike_seconds <= 15 * 60) items.add(bike);
  if (!items.size) items.add(formatMoveIn(row.earliest_move_in));

  return [...items].filter(Boolean).slice(0, 4);
}

function mapPhotoUrls(rows: PhotoRow[]) {
  const supabase = getSupabaseClient();

  return rows
    .filter((row) => row.download_status !== 'skipped' && (row.storage_path || row.source_url))
    .map((row) => {
      if (row.storage_bucket && row.storage_path) {
        return supabase.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data.publicUrl;
      }

      return row.source_url;
    });
}

function buildFallbackSearchRow(property: PropertyRow, units: UnitRow[], primaryPhotoUrl?: string): ListingSearchRow {
  const availableUnits = units.filter((unit) =>
    ['available_now', 'available_on'].includes(unit.availability_status),
  );

  return {
    property_id: property.id,
    campus_id: '',
    source_id: '',
    source_url: property.source_url,
    title: property.name,
    slug: property.slug,
    address: property.address,
    latitude: null,
    longitude: null,
    primary_photo_url: primaryPhotoUrl ?? null,
    storage_photo_path: null,
    min_rent: minNumber(availableUnits.map((unit) => unit.rent_monthly)),
    max_rent: maxNumber(availableUnits.map((unit) => unit.rent_monthly)),
    min_beds: minNumber(availableUnits.map((unit) => unit.bedrooms)),
    max_beds: maxNumber(availableUnits.map((unit) => unit.bedrooms)),
    min_baths: minNumber(availableUnits.map((unit) => unit.bathrooms)),
    max_baths: maxNumber(availableUnits.map((unit) => unit.bathrooms)),
    available_unit_count: availableUnits.length,
    total_unit_count: units.length,
    earliest_move_in: minDate(availableUnits.map((unit) => unit.move_in)),
    walk_seconds: null,
    bike_seconds: null,
    drive_seconds: null,
    transit_seconds: null,
    distance_meters: null,
    promotion_badge: null,
    manager_display_name: property.manager_display_name,
    active: availableUnits.length > 0,
    quality_score: 70,
    updated_at: new Date().toISOString(),
  };
}

function formatPriceRange(minRent: number | null, maxRent: number | null) {
  if (!Number.isFinite(minRent) && !Number.isFinite(maxRent)) return 'Contact';
  if (!Number.isFinite(minRent)) return formatMoney(maxRent);
  if (!Number.isFinite(maxRent) || minRent === maxRent) return formatMoney(minRent);

  return `${formatMoney(minRent)} - ${formatMoney(maxRent)}`;
}

function formatShortPrice(minRent: number | null, maxRent: number | null) {
  const value = Number.isFinite(minRent) ? Number(minRent) : Number(maxRent);
  if (!Number.isFinite(value)) return 'Contact';

  if (value < 1000) return formatMoney(value);

  const rounded = Math.round(value / 100) / 10;
  return `$${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k${maxRent && maxRent > value ? '+' : ''}`;
}

function formatDistance(distanceMeters: number | null) {
  if (!Number.isFinite(distanceMeters)) return 'Near campus';

  const miles = Number(distanceMeters) / 1609.344;
  const value = miles < 1 ? miles.toFixed(1) : miles.toFixed(1).replace(/\.0$/, '');

  return `${value} mi to campus`;
}

function formatRange(min: number | null, max: number | null, noun: string) {
  if (!Number.isFinite(min) && !Number.isFinite(max)) return noun;

  const low = nullableNumber(min ?? max) ?? 0;
  const high = nullableNumber(max ?? min) ?? low;
  const label = low === high ? formatCompactNumber(high) : `${formatCompactNumber(low)}-${formatCompactNumber(high)}`;

  return `${label} ${noun}${high === 1 ? '' : 's'}`;
}

function summarizeAddress(address: string | null) {
  if (!address) return 'Los Angeles';

  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1].replace(/\s+CA\s+\d+.*/, '');

  return parts[0] ?? 'Los Angeles';
}

function sortUnits(a: UnitRow, b: UnitRow) {
  const aAvailable = ['available_now', 'available_on'].includes(a.availability_status) ? 0 : 1;
  const bAvailable = ['available_now', 'available_on'].includes(b.availability_status) ? 0 : 1;
  if (aAvailable !== bAvailable) return aAvailable - bAvailable;

  return (a.rent_monthly ?? Number.MAX_SAFE_INTEGER) - (b.rent_monthly ?? Number.MAX_SAFE_INTEGER);
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function nullableNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function toDisplayNumber(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Number(value);
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function minNumber(values: (number | null)[]) {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

function maxNumber(values: (number | null)[]) {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  return valid.length ? Math.max(...valid) : null;
}

function minDate(values: (string | null)[]) {
  const valid = values.filter((value): value is string => Boolean(value)).sort();
  return valid[0] ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
