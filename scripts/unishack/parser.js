const { createHash } = require('node:crypto');
const cheerio = require('cheerio');
const { z } = require('zod');

const UNISHACK_BASE_URL = 'https://www.unishack.com';
const UCLA_APARTMENTS_URL = `${UNISHACK_BASE_URL}/ucla/apartments`;
const PLACEHOLDER_IMAGE_RE = /\/placeholder\.svg(?:$|\?)/i;
const CAMPUS_CONFIGS = {
  ucla: {
    slug: 'ucla',
    name: 'University of California, Los Angeles',
    shortName: 'UCLA',
    address: 'Los Angeles, CA 90095, USA',
    latitude: 34.0689,
    longitude: -118.4452,
    timezone: 'America/Los_Angeles',
  },
  usc: {
    slug: 'usc',
    name: 'University of Southern California',
    shortName: 'USC',
    address: 'Los Angeles, CA 90007, USA',
    latitude: 34.0224,
    longitude: -118.2851,
    timezone: 'America/Los_Angeles',
  },
  sdsu: {
    slug: 'sdsu',
    name: 'San Diego State University',
    shortName: 'SDSU',
    address: 'San Diego, CA 92182, USA',
    latitude: 32.7757,
    longitude: -117.0719,
    timezone: 'America/Los_Angeles',
  },
  ucsb: {
    slug: 'ucsb',
    name: 'University of California, Santa Barbara',
    shortName: 'UCSB',
    address: 'Santa Barbara, CA 93106, USA',
    latitude: 34.414,
    longitude: -119.8489,
    timezone: 'America/Los_Angeles',
  },
  ucsd: {
    slug: 'ucsd',
    name: 'University of California, San Diego',
    shortName: 'UCSD',
    address: 'La Jolla, CA 92093, USA',
    latitude: 32.8801,
    longitude: -117.234,
    timezone: 'America/Los_Angeles',
  },
  berkeley: {
    slug: 'berkeley',
    name: 'University of California, Berkeley',
    shortName: 'Berkeley',
    address: 'Berkeley, CA 94720, USA',
    latitude: 37.8719,
    longitude: -122.2585,
    timezone: 'America/Los_Angeles',
  },
};
const SUPPORTED_CAMPUS_SLUGS = Object.keys(CAMPUS_CONFIGS);

const nullableNumber = z.number().finite().nullable();
const nullableInteger = z.number().int().nullable();

const imageSchema = z.object({
  sourceUrl: z.string().url(),
  storageBucket: z.string().nullable().default(null),
  storagePath: z.string().nullable().default(null),
  displayOrder: z.number().int().nonnegative(),
  contentType: z.string().nullable().default(null),
  byteSize: nullableInteger.default(null),
  sha256: z.string().nullable().default(null),
  downloadStatus: z.enum(['pending', 'mirrored', 'failed', 'skipped']).default('pending'),
  errorMessage: z.string().nullable().default(null),
});

const unitSchema = z.object({
  sourceUnitId: z.string().min(1),
  listingType: z.string().nullable(),
  title: z.string().nullable(),
  rentMonthly: nullableInteger,
  bedrooms: nullableNumber,
  bathrooms: nullableNumber,
  maxOccupants: nullableInteger,
  available: z.boolean().nullable(),
  availabilityStatus: z.enum(['available_now', 'available_on', 'not_available', 'unknown']),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  leaseTermMonths: nullableInteger,
  securityDeposit: nullableInteger,
  parkingSpots: nullableInteger,
  description: z.string().nullable(),
  sourcePayload: z.record(z.string(), z.unknown()).default({}),
});

const propertySchema = z.object({
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  slug: z.string().min(1),
  name: z.string().min(1),
  propertyType: z.string().nullable(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  latitude: nullableNumber,
  longitude: nullableNumber,
  managerDisplayName: z.string().nullable(),
  dataQualityWarnings: z.array(z.string()).default([]),
});

const normalizedRecordSchema = z.object({
  source: z.object({
    slug: z.literal('unishack'),
    name: z.literal('UniShack'),
    baseUrl: z.string().url(),
    sourceType: z.literal('permitted_scrape'),
    externalId: z.string().min(1),
    sourceUrl: z.string().url(),
  }),
  campus: z.object({
    slug: z.enum(SUPPORTED_CAMPUS_SLUGS),
    name: z.string().min(1),
    shortName: z.string().min(1),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.literal('America/Los_Angeles'),
  }),
  property: propertySchema,
  images: z.array(imageSchema),
  units: z.array(unitSchema),
  promotion: z
    .object({
      badge: z.string().nullable(),
      description: z.string().nullable(),
    })
    .nullable(),
  faqs: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      displayOrder: z.number().int().nonnegative(),
    }),
  ),
  reviews: z.array(
    z.object({
      reviewerName: z.string().nullable(),
      yearsText: z.string().nullable(),
      rating: nullableNumber,
      body: z.string().nullable(),
      wouldRecommend: z.boolean().nullable(),
      sourceHash: z.string().min(1),
    }),
  ),
  campusMetrics: z.array(
    z.object({
      campusSlug: z.enum(SUPPORTED_CAMPUS_SLUGS),
      distanceMeters: nullableInteger,
      distanceMiles: nullableNumber,
      walkSeconds: nullableInteger,
      bikeSeconds: nullableInteger,
      driveSeconds: nullableInteger,
      transitSeconds: nullableInteger,
    }),
  ),
  pointsOfInterest: z.array(
    z.object({
      sourceExternalId: z.string().nullable(),
      name: z.string().min(1),
      address: z.string().nullable(),
      latitude: nullableNumber,
      longitude: nullableNumber,
      distanceMeters: nullableInteger,
      distanceMiles: nullableNumber,
      walkSeconds: nullableInteger,
      bikeSeconds: nullableInteger,
      driveSeconds: nullableInteger,
      transitSeconds: nullableInteger,
    }),
  ),
  sourceSummary: z.record(z.string(), z.unknown()).default({}),
});

function parseApartmentList(html, options = {}) {
  const { baseUrl, campusSlug } = normalizeParserOptions(options);
  const apartmentPathRe = campusApartmentPathRe(campusSlug);
  const jsonLdBlocks = parseJsonLdBlocks(html);
  const itemList = jsonLdBlocks.find((block) => block && block['@type'] === 'ItemList');

  if (!itemList || !Array.isArray(itemList.itemListElement)) {
    throw new Error('Unable to find UniShack apartment ItemList JSON-LD');
  }

  const seen = new Set();
  const apartments = [];

  for (const item of itemList.itemListElement) {
    const rawUrl = item?.item?.url || item?.url;
    if (!rawUrl) continue;

    const url = new URL(rawUrl, baseUrl);
    if (url.origin !== UNISHACK_BASE_URL) continue;
    if (!apartmentPathRe.test(url.pathname)) continue;
    if (seen.has(url.href)) continue;

    const slug = url.pathname.split('/').filter(Boolean).pop();
    seen.add(url.href);
    apartments.push({
      position: Number.isInteger(item.position) ? item.position : apartments.length + 1,
      name: normalizeText(item?.item?.name || item.name || slug),
      slug,
      url: url.href,
    });
  }

  return apartments;
}

function parsePropertyPage(html, sourceUrl, options = {}) {
  const sourceDate = options.sourceDate ? dateOnly(options.sourceDate) : dateOnly(new Date());
  const campusSlug = normalizeCampusSlug(options.campusSlug || campusSlugFromUrl(sourceUrl) || 'ucla');
  const flightText = decodeReactFlightText(html);
  const entityJson = extractBalancedJsonAfterKey(flightText, '"entity":');

  if (!entityJson) {
    throw new Error(`Unable to extract React Flight entity payload for ${sourceUrl}`);
  }

  const entity = JSON.parse(entityJson);
  const warnings = [];
  const faqRows = parseFaqs(html);
  const reviews = parseVisibleReviews(html);
  const units = normalizeUnits(entity.listings || [], sourceDate, warnings);
  const imageUrls = Array.isArray(entity.images) && entity.images.length > 0
    ? entity.images
    : parseDomImageUrls(html, entity.name);
  const images = normalizeImages(imageUrls, warnings);
  const rawSourceExternalId = asText(entity.id) || slugFromUrl(sourceUrl);
  const rawPropertySlug = asText(entity.slug) || slugFromUrl(sourceUrl);
  const sourceExternalId = campusScopedValue(campusSlug, rawSourceExternalId);
  const propertySlug = campusScopedSlug(campusSlug, rawPropertySlug);

  if (!entity.address) warnings.push('missing_address');
  if (finiteOrNull(entity.latitude) === null || finiteOrNull(entity.longitude) === null) {
    warnings.push('missing_coordinates');
  }
  if (images.length === 0) warnings.push('missing_images');
  if (units.length === 0) warnings.push('missing_units');

  const record = {
    source: {
      slug: 'unishack',
      name: 'UniShack',
      baseUrl: UNISHACK_BASE_URL,
      sourceType: 'permitted_scrape',
      externalId: sourceExternalId,
      sourceUrl,
    },
    campus: campusForSlug(campusSlug),
    property: {
      sourceId: sourceExternalId,
      sourceUrl,
      slug: propertySlug,
      name: asText(entity.name) || slugFromUrl(sourceUrl),
      propertyType: asText(entity.shack_type),
      description: normalizeText(entity.description),
      address: normalizeText(entity.address),
      latitude: finiteOrNull(entity.latitude),
      longitude: finiteOrNull(entity.longitude),
      managerDisplayName: normalizeManagerDisplayName(entity.contact_name),
      dataQualityWarnings: uniqueStrings(warnings),
    },
    images,
    units,
    promotion: normalizePromotion(entity.promotion),
    faqs: faqRows,
    reviews,
    campusMetrics: normalizeCampusMetrics(entity.shackCampuses || [], campusSlug),
    pointsOfInterest: normalizePointsOfInterest(entity.shackCampuses || [], entity.shackCampusLandmarks || [], campusSlug),
    sourceSummary: {
      sourceHash: hashObject(redactedEntitySummary(entity)),
      rawSourceExternalId,
      rawPropertySlug,
      campusSlug,
      listUnitCount: Array.isArray(entity.listings) ? entity.listings.length : 0,
      imageCount: Array.isArray(entity.images) ? entity.images.length : 0,
      faqCount: faqRows.length,
      reviewCount: reviews.length,
    },
  };

  return normalizedRecordSchema.parse(record);
}

function parseJsonLdBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const scriptText = $(element).contents().text().trim();
    if (!scriptText) return;

    try {
      const parsed = JSON.parse(scriptText);
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed && Array.isArray(parsed['@graph'])) {
        blocks.push(...parsed['@graph']);
      } else {
        blocks.push(parsed);
      }
    } catch {
      // JSON-LD is a fallback source. Bad blocks should not hide the React payload.
    }
  });

  return blocks;
}

function parseFaqs(html) {
  const jsonLdBlocks = parseJsonLdBlocks(html);
  const faqPage = jsonLdBlocks.find((block) => block && block['@type'] === 'FAQPage');
  const entities = Array.isArray(faqPage?.mainEntity) ? faqPage.mainEntity : [];

  return entities
    .map((entity, index) => ({
      question: normalizeText(entity?.name),
      answer: normalizeText(entity?.acceptedAnswer?.text),
      displayOrder: index,
    }))
    .filter((faq) => faq.question && faq.answer);
}

function parseVisibleReviews(html) {
  const $ = cheerio.load(html);
  const reviews = [];

  $('[itemprop="review"], [data-review-id]').each((_, element) => {
    const node = $(element);
    const reviewerName = normalizeText(
      node.find('[itemprop="author"], [data-reviewer-name]').first().text(),
    );
    const body = normalizeText(node.find('[itemprop="reviewBody"], [data-review-body]').first().text());
    const yearsText = normalizeText(node.find('[data-review-years]').first().text());
    const ratingValue = Number(node.find('[itemprop="ratingValue"]').attr('content'));

    if (!body && !reviewerName) return;

    reviews.push({
      reviewerName,
      yearsText,
      rating: isFiniteNumber(ratingValue) ? ratingValue : null,
      body,
      wouldRecommend: /would recommend/i.test(node.text()) ? true : null,
      sourceHash: hashObject({ reviewerName, yearsText, body }),
    });
  });

  return reviews;
}

function parseDomImageUrls(html, propertyName) {
  const $ = cheerio.load(html);
  const name = normalizeText(propertyName);
  const urls = [];

  $('img[src]').each((_, element) => {
    const src = $(element).attr('src');
    const alt = normalizeText($(element).attr('alt'));
    const isPropertyPhoto = alt && /photo:\d+/i.test(alt) && (!name || alt.startsWith(name));

    if (isPropertyPhoto) {
      urls.push(src);
    }
  });

  return urls;
}

function decodeReactFlightText(html) {
  const parts = [];
  const marker = 'self.__next_f.push([1,"';
  let searchFrom = 0;

  while (true) {
    const start = html.indexOf(marker, searchFrom);
    if (start === -1) break;

    let i = start + marker.length;
    let raw = '';
    let escaped = false;

    for (; i < html.length; i += 1) {
      const char = html[i];

      if (escaped) {
        raw += `\\${char}`;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"' && html.slice(i, i + 3) === '"])') {
        break;
      }

      raw += char;
    }

    try {
      parts.push(JSON.parse(`"${raw}"`));
    } catch (error) {
      throw new Error(`Unable to decode React Flight chunk: ${error.message}`);
    }

    searchFrom = i + 3;
  }

  return parts.join('');
}

function extractBalancedJsonAfterKey(text, key) {
  const keyIndex = text.indexOf(key);
  if (keyIndex === -1) return null;

  const start = text.indexOf('{', keyIndex + key.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function normalizeImages(imageUrls, warnings) {
  const seen = new Set();
  const images = [];

  for (const rawUrl of imageUrls) {
    const sourceUrl = asUrl(rawUrl);
    if (!sourceUrl) continue;
    if (PLACEHOLDER_IMAGE_RE.test(sourceUrl)) {
      warnings.push('placeholder_image_skipped');
      continue;
    }
    if (seen.has(sourceUrl)) continue;

    seen.add(sourceUrl);
    images.push({
      sourceUrl,
      storageBucket: null,
      storagePath: null,
      displayOrder: images.length,
      contentType: null,
      byteSize: null,
      sha256: null,
      downloadStatus: 'pending',
      errorMessage: null,
    });
  }

  return images;
}

function normalizeUnits(units, sourceDate, warnings) {
  const normalized = [];
  const seenIds = new Set();

  for (const unit of units) {
    const sourceUnitId = asText(unit.id) || hashObject(unit);
    if (seenIds.has(sourceUnitId)) {
      warnings.push(`duplicate_unit_id:${sourceUnitId}`);
      continue;
    }
    seenIds.add(sourceUnitId);

    let rentMonthly = integerOrNull(unit.rent);
    if (rentMonthly === 0) {
      rentMonthly = null;
      warnings.push(`unit_zero_rent_treated_as_null:${sourceUnitId}`);
    }

    const available = typeof unit.available === 'boolean' ? unit.available : null;
    const moveInDate = parseSourceDate(unit.move_in);

    normalized.push({
      sourceUnitId,
      listingType: normalizeText(unit.listing_type),
      title: normalizeText(unit.title),
      rentMonthly,
      bedrooms: finiteOrNull(unit.bedrooms),
      bathrooms: finiteOrNull(unit.bathrooms),
      maxOccupants: integerOrNull(unit.max_occupants),
      available,
      availabilityStatus: computeAvailabilityStatus(available, moveInDate, sourceDate),
      moveInDate,
      leaseTermMonths: integerOrNull(unit.lease_term),
      securityDeposit: integerOrNull(unit.security_deposit),
      parkingSpots: integerOrNull(unit.parking_spots),
      description: normalizeText(unit.description),
      sourcePayload: redactedUnitPayload(unit),
    });
  }

  return normalized;
}

function normalizePromotion(promotion) {
  if (!promotion || typeof promotion !== 'object') return null;

  const badge = normalizeText(promotion.badge || promotion.title || promotion.name);
  const description = normalizeText(promotion.description || promotion.details || promotion.text);

  if (!badge && !description) return null;

  return { badge, description };
}

function normalizeCampusMetrics(shackCampuses, campusSlug) {
  return shackCampuses
    .filter((row) => row?.campus_slug === campusSlug)
    .map((row) => ({
      campusSlug,
      distanceMeters: integerOrNull(row.distance_meters),
      distanceMiles: metersToMiles(row.distance_meters),
      walkSeconds: integerOrNull(row.walk_time),
      bikeSeconds: integerOrNull(row.bike_time),
      driveSeconds: integerOrNull(row.drive_time),
      transitSeconds: integerOrNull(row.transit_time),
    }));
}

function normalizePointsOfInterest(shackCampuses, directLandmarks, campusSlug) {
  const rows = [];

  for (const campus of shackCampuses) {
    if (campus?.campus_slug !== campusSlug) continue;
    if (Array.isArray(campus.shackCampusLandmarks)) {
      rows.push(...campus.shackCampusLandmarks);
    }
  }

  if (rows.length === 0 && Array.isArray(directLandmarks)) {
    rows.push(...directLandmarks);
  }

  const seen = new Set();
  const pois = [];

  for (const row of rows) {
    const landmark = row?.landmark || row;
    const name = normalizeText(landmark?.name);
    if (!name) continue;

    const address = normalizeText(landmark?.address);
    const key = `${name}|${address || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    pois.push({
      sourceExternalId: normalizeText(landmark?.id || row?.id),
      name,
      address,
      latitude: finiteOrNull(landmark?.latitude),
      longitude: finiteOrNull(landmark?.longitude),
      distanceMeters: integerOrNull(row?.distance_meters),
      distanceMiles: metersToMiles(row?.distance_meters),
      walkSeconds: integerOrNull(row?.walk_time),
      bikeSeconds: integerOrNull(row?.bike_time),
      driveSeconds: integerOrNull(row?.drive_time),
      transitSeconds: integerOrNull(row?.transit_time),
    });
  }

  return pois;
}

function redactedUnitPayload(unit) {
  const allowedKeys = [
    'id',
    'listing_type',
    'rent',
    'bedrooms',
    'bathrooms',
    'max_occupants',
    'available',
    'move_in',
    'parking_spots',
    'title',
    'lease_term',
    'security_deposit',
  ];

  return Object.fromEntries(allowedKeys.filter((key) => key in unit).map((key) => [key, unit[key]]));
}

function redactedEntitySummary(entity) {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    address: entity.address,
    latitude: entity.latitude,
    longitude: entity.longitude,
    images: Array.isArray(entity.images) ? entity.images : [],
    unitIds: Array.isArray(entity.listings) ? entity.listings.map((unit) => unit.id) : [],
    promotion: entity.promotion || null,
    campusSlugs: Array.isArray(entity.shackCampuses)
      ? entity.shackCampuses.map((campus) => campus.campus_slug)
      : [],
  };
}

function computeAvailabilityStatus(available, moveInDate, sourceDate) {
  if (available === false) return 'not_available';
  if (available !== true) return 'unknown';
  if (!moveInDate) return 'available_now';
  return moveInDate <= sourceDate ? 'available_now' : 'available_on';
}

function normalizeManagerDisplayName(name) {
  const displayName = normalizeText(name);
  return displayName || null;
}

function parseSourceDate(value) {
  if (!value) return null;
  if (value instanceof Date) return dateOnly(value);
  const raw = String(value).replace(/^\$D/, '');
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateOnly(parsed);
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function metersToMiles(value) {
  const meters = finiteOrNull(value);
  if (meters === null) return null;
  return Number((meters / 1609.344).toFixed(3));
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function asText(value) {
  return normalizeText(value);
}

function asUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    return new URL(text, UNISHACK_BASE_URL).href;
  } catch {
    return null;
  }
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  const number = finiteOrNull(value);
  return number === null ? null : Math.trunc(number);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function slugFromUrl(sourceUrl) {
  return new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
}

function hashObject(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeParserOptions(options) {
  if (typeof options === 'string') {
    return { baseUrl: options, campusSlug: 'ucla' };
  }

  return {
    baseUrl: options.baseUrl || UNISHACK_BASE_URL,
    campusSlug: normalizeCampusSlug(options.campusSlug || 'ucla'),
  };
}

function normalizeCampusSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!SUPPORTED_CAMPUS_SLUGS.includes(slug)) {
    throw new Error(`Unsupported UniShack campus slug: ${value}`);
  }
  return slug;
}

function campusForSlug(slug) {
  return { ...CAMPUS_CONFIGS[normalizeCampusSlug(slug)] };
}

function apartmentsUrlForCampus(slug) {
  return `${UNISHACK_BASE_URL}/${normalizeCampusSlug(slug)}/apartments`;
}

function campusSlugFromUrl(sourceUrl) {
  try {
    const [slug] = new URL(sourceUrl, UNISHACK_BASE_URL).pathname.split('/').filter(Boolean);
    return SUPPORTED_CAMPUS_SLUGS.includes(slug) ? slug : null;
  } catch {
    return null;
  }
}

function campusApartmentPathRe(slug) {
  return new RegExp(`^/${escapeRegExp(normalizeCampusSlug(slug))}/apartment/[^/?#]+$`);
}

function campusScopedValue(campusSlug, value) {
  const text = asText(value) || 'unknown';
  return campusSlug === 'ucla' ? text : `${campusSlug}:${text}`;
}

function campusScopedSlug(campusSlug, slug) {
  const text = asText(slug) || 'unknown';
  return campusSlug === 'ucla' ? text : `${campusSlug}-${text}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  CAMPUS_CONFIGS,
  SUPPORTED_CAMPUS_SLUGS,
  UCLA_APARTMENTS_URL,
  UNISHACK_BASE_URL,
  apartmentsUrlForCampus,
  campusForSlug,
  campusSlugFromUrl,
  normalizedRecordSchema,
  parseApartmentList,
  parsePropertyPage,
  parseJsonLdBlocks,
  decodeReactFlightText,
  extractBalancedJsonAfterKey,
  hashObject,
  parseSourceDate,
  computeAvailabilityStatus,
};
