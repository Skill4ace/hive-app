#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const {
  UCLA_APARTMENTS_URL,
  UNISHACK_BASE_URL,
  hashObject,
  parseApartmentList,
  parsePropertyPage,
} = require('./parser');

const DEFAULT_DETAIL_CONCURRENCY = 4;
const DEFAULT_IMAGE_CONCURRENCY = 3;
const DEFAULT_STORAGE_BUCKET = 'listing-media';
const DEFAULT_OUT_ROOT = 'scrape-output';
const USER_AGENT = 'HiveUniShackScraper/0.1 (+permitted local import)';
const DEFAULT_ALLOWED_IMAGE_HOSTS = ['pub-7d06f3a918484c85ad3619162fd1046e.r2.dev'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function main() {
  const { command, args } = parseCliArgs(process.argv.slice(2));

  switch (command) {
    case 'discover':
      await discoverCommand(args);
      break;
    case 'scrape':
    case 'extract':
      await scrapeCommand(args);
      break;
    case 'mirror-images':
      await mirrorImagesCommand(args);
      break;
    case 'import':
      await importCommand(args);
      break;
    default:
      printUsage();
      process.exitCode = command ? 1 : 0;
  }
}

async function discoverCommand(args) {
  const outDir = await prepareOutDir(args.out);
  const html = await fetchText(UCLA_APARTMENTS_URL);
  const apartments = parseApartmentList(html);

  if (args.expectCount && apartments.length !== Number(args.expectCount)) {
    throw new Error(`Expected ${args.expectCount} apartments, discovered ${apartments.length}`);
  }

  await writeJson(path.join(outDir, 'discovered.json'), {
    sourceUrl: UCLA_APARTMENTS_URL,
    discoveredAt: new Date().toISOString(),
    count: apartments.length,
    apartments,
  });

  console.log(`Discovered ${apartments.length} UCLA apartment URLs`);
  console.log(`Wrote ${path.join(outDir, 'discovered.json')}`);
}

async function scrapeCommand(args) {
  const outDir = await prepareOutDir(args.out);
  const limit = args.limit ? Number(args.limit) : null;
  const concurrency = args.concurrency ? Number(args.concurrency) : DEFAULT_DETAIL_CONCURRENCY;
  const sourceDate = args.sourceDate || new Date().toISOString();

  const html = await fetchText(UCLA_APARTMENTS_URL);
  const discovered = parseApartmentList(html);
  const apartments = limit ? discovered.slice(0, limit) : discovered;

  await writeJson(path.join(outDir, 'discovered.json'), {
    sourceUrl: UCLA_APARTMENTS_URL,
    discoveredAt: new Date().toISOString(),
    count: discovered.length,
    selectedCount: apartments.length,
    apartments,
  });

  const parseErrors = [];
  const records = [];

  await mapWithConcurrency(apartments, concurrency, async (apartment, index) => {
    try {
      const detailHtml = await fetchText(apartment.url);
      const record = parsePropertyPage(detailHtml, apartment.url, { sourceDate });
      records[index] = record;
      console.log(`Parsed ${index + 1}/${apartments.length}: ${record.property.slug}`);
    } catch (error) {
      parseErrors.push({
        url: apartment.url,
        slug: apartment.slug,
        message: error.message,
      });
      console.warn(`Failed ${index + 1}/${apartments.length}: ${apartment.slug}: ${error.message}`);
    }
  });

  const normalized = records.filter(Boolean);
  const validationReport = buildValidationReport(discovered, normalized, parseErrors);
  const summary = {
    sourceUrl: UCLA_APARTMENTS_URL,
    outDir,
    startedAt: sourceDate,
    finishedAt: new Date().toISOString(),
    discoveredCount: discovered.length,
    selectedCount: apartments.length,
    normalizedCount: normalized.length,
    parseErrorCount: parseErrors.length,
    warningCount: validationReport.warningCount,
  };

  await writeJson(path.join(outDir, 'normalized.json'), normalized);
  await writeJson(path.join(outDir, 'validation-report.json'), validationReport);
  await writeJson(path.join(outDir, 'summary.json'), summary);

  console.log(`Scraped ${normalized.length}/${apartments.length} selected UCLA apartments`);
  console.log(`Wrote ${path.join(outDir, 'normalized.json')}`);
  if (parseErrors.length > 0) process.exitCode = 1;
}

async function mirrorImagesCommand(args) {
  const inputPath = args.input || (await findLatestRunFile('normalized.json'));
  const outDir = await prepareOutDir(args.out || path.dirname(inputPath), { timestamped: false });
  const bucket = args.bucket || process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
  const concurrency = args.concurrency ? Number(args.concurrency) : DEFAULT_IMAGE_CONCURRENCY;
  const supabase = getSupabaseClient();
  const records = await readJson(inputPath);

  await ensurePublicBucket(supabase, bucket);

  const imageJobs = [];
  for (const record of records) {
    for (const image of record.images) {
      imageJobs.push({ record, image });
    }
  }

  const report = {
    inputPath,
    bucket,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    totalImages: imageJobs.length,
    mirrored: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  await mapWithConcurrency(imageJobs, concurrency, async ({ record, image }) => {
    const result = await mirrorOneImage(supabase, bucket, record, image);
    report[result.status === 'mirrored' ? 'mirrored' : result.status === 'skipped' ? 'skipped' : 'failed'] += 1;
    report.items.push(result);
  });

  report.finishedAt = new Date().toISOString();

  const mirroredPath = path.join(outDir, 'normalized.mirrored.json');
  const reportPath = path.join(outDir, 'image-mirror-report.json');
  await writeJson(mirroredPath, records);
  await writeJson(reportPath, report);

  console.log(`Mirrored ${report.mirrored}/${report.totalImages} images to ${bucket}`);
  console.log(`Wrote ${mirroredPath}`);
  if (report.failed > 0) process.exitCode = 1;
}

async function importCommand(args) {
  const inputPath = args.input || (await findLatestRunFile('normalized.mirrored.json', 'normalized.json'));
  const outDir = await prepareOutDir(args.out || path.dirname(inputPath), { timestamped: false });
  const bucket = args.bucket || process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
  const records = await readJson(inputPath);
  const dryRun = Boolean(args.dryRun);

  if (dryRun) {
    const dryRunSummary = buildImportPlan(records, inputPath);
    await writeJson(path.join(outDir, 'import-summary.json'), dryRunSummary);
    console.log(`Dry-run import plan covers ${records.length} properties`);
    return;
  }

  const supabase = getSupabaseClient();
  const dataSource = await upsertDataSource(supabase);
  const campus = await upsertCampus(supabase, records[0]?.campus);
  const run = await createIngestionRun(supabase, dataSource.id, inputPath, records.length);

  const summary = {
    inputPath,
    runId: run.id,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    recordsSeen: records.length,
    recordsImported: 0,
    recordsFailed: 0,
    failures: [],
  };

  try {
    for (const record of records) {
      try {
        await importRecord(supabase, record, { dataSource, campus, bucket });
        summary.recordsImported += 1;
      } catch (error) {
        summary.recordsFailed += 1;
        summary.failures.push({
          sourceUrl: record?.property?.sourceUrl,
          sourceId: record?.property?.sourceId,
          message: error.message,
        });
        console.warn(`Import failed for ${record?.property?.slug || record?.property?.sourceUrl}: ${error.message}`);
      }
    }

    summary.finishedAt = new Date().toISOString();
    await updateIngestionRun(supabase, run.id, {
      status: summary.recordsFailed > 0 ? 'partial' : 'succeeded',
      finished_at: summary.finishedAt,
      records_seen: records.length,
      records_created: summary.recordsImported,
      records_failed: summary.recordsFailed,
      error_summary: summary.failures.length ? JSON.stringify(summary.failures.slice(0, 10)) : null,
    });
  } catch (error) {
    summary.finishedAt = new Date().toISOString();
    await updateIngestionRun(supabase, run.id, {
      status: 'failed',
      finished_at: summary.finishedAt,
      records_seen: records.length,
      records_failed: summary.recordsFailed || records.length,
      error_summary: error.message,
    });
    throw error;
  } finally {
    await writeJson(path.join(outDir, 'import-summary.json'), summary);
  }

  console.log(`Imported ${summary.recordsImported}/${records.length} properties`);
  console.log(`Wrote ${path.join(outDir, 'import-summary.json')}`);
  if (summary.recordsFailed > 0) process.exitCode = 1;
}

async function importRecord(supabase, record, context) {
  const { dataSource, campus, bucket } = context;
  const now = new Date().toISOString();
  const property = await upsertSingle(
    supabase
      .from('properties')
      .upsert(
        {
          campus_id: campus.id,
          source_id: dataSource.id,
          source_external_id: record.property.sourceId,
          source_url: record.property.sourceUrl,
          name: record.property.name,
          slug: record.property.slug,
          property_type: record.property.propertyType,
          description: record.property.description,
          address: record.property.address,
          latitude: record.property.latitude,
          longitude: record.property.longitude,
          location: pointWkt(record.property),
          manager_display_name: record.property.managerDisplayName,
          is_active: true,
          is_quality_approved: true,
          data_quality_warnings: record.property.dataQualityWarnings,
          source_last_seen_at: now,
        },
        { onConflict: 'source_id,source_external_id' },
      )
      .select('id')
      .single(),
    'upsert property',
  );

  await upsertSingle(
    supabase.from('source_listing_records').upsert(
      {
        source_id: dataSource.id,
        external_id: record.property.sourceId,
        source_url: record.property.sourceUrl,
        property_id: property.id,
        raw_hash: hashObject(record.sourceSummary),
        last_seen_at: now,
        last_status: 'active',
        payload_summary: record.sourceSummary,
      },
      { onConflict: 'source_id,external_id' },
    ),
    'upsert source listing record',
  );

  await upsertUnits(supabase, property.id, record.units);
  await upsertPhotos(supabase, property.id, record.images, bucket);
  await upsertPromotion(supabase, property.id, record.promotion);
  await upsertFaqs(supabase, property.id, record.faqs);
  await upsertReviews(supabase, property.id, record.reviews);
  await upsertCampusMetrics(supabase, property.id, campus.id, record.campusMetrics);
  await upsertPois(supabase, property.id, record.pointsOfInterest);
  await upsertListingSearchIndex(supabase, property.id, record, { dataSource, campus, bucket });
}

async function upsertDataSource(supabase) {
  return upsertSingle(
    supabase
      .from('data_sources')
      .upsert(
        {
          slug: 'unishack',
          name: 'UniShack',
          source_type: 'permitted_scrape',
          base_url: UNISHACK_BASE_URL,
          robots_url: `${UNISHACK_BASE_URL}/robots.txt`,
          allowed_use: 'Permissioned scrape for Hive UCLA apartment discovery',
          attribution_text: 'Property data from UniShack',
          rate_limit_per_minute: 60,
          active: true,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single(),
    'upsert data source',
  );
}

async function upsertCampus(supabase, campus) {
  const row = campus || {
    slug: 'ucla',
    name: 'University of California, Los Angeles',
    shortName: 'UCLA',
    address: 'Los Angeles, CA 90095, USA',
    latitude: 34.0689,
    longitude: -118.4452,
    timezone: 'America/Los_Angeles',
  };

  return upsertSingle(
    supabase
      .from('campuses')
      .upsert(
        {
          slug: row.slug,
          name: row.name,
          short_name: row.shortName,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          location: pointWkt(row),
          timezone: row.timezone,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single(),
    'upsert campus',
  );
}

async function createIngestionRun(supabase, sourceId, manifestPath, recordsSeen) {
  return upsertSingle(
    supabase
      .from('ingestion_runs')
      .insert({
        source_id: sourceId,
        campus_slug: 'ucla',
        run_type: 'unishack_ucla_apartments',
        status: 'running',
        records_seen: recordsSeen,
        manifest_path: manifestPath,
      })
      .select('id')
      .single(),
    'create ingestion run',
  );
}

async function updateIngestionRun(supabase, runId, patch) {
  await assertNoSupabaseError(
    supabase.from('ingestion_runs').update(patch).eq('id', runId),
    'update ingestion run',
  );
}

async function upsertUnits(supabase, propertyId, units) {
  if (!units.length) return;

  const rows = units.map((unit) => ({
    property_id: propertyId,
    source_unit_id: unit.sourceUnitId,
    listing_type: unit.listingType,
    title: unit.title,
    rent_monthly: unit.rentMonthly,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    max_occupants: unit.maxOccupants,
    available: unit.available,
    availability_status: unit.availabilityStatus,
    move_in: unit.moveInDate,
    lease_term_months: unit.leaseTermMonths,
    security_deposit: unit.securityDeposit,
    parking_spots: unit.parkingSpots,
    description: unit.description,
    source_payload: unit.sourcePayload,
  }));

  await assertNoSupabaseError(
    supabase.from('property_units').upsert(rows, { onConflict: 'property_id,source_unit_id' }),
    'upsert units',
  );
}

async function upsertPhotos(supabase, propertyId, images, bucket) {
  if (!images.length) return;

  const rows = images.map((image) => ({
    property_id: propertyId,
    source_url: image.sourceUrl,
    storage_bucket: image.storageBucket || bucket,
    storage_path: image.storagePath,
    display_order: image.displayOrder,
    content_type: image.contentType,
    byte_size: image.byteSize,
    sha256: image.sha256,
    download_status: image.downloadStatus,
    error_message: image.errorMessage,
  }));

  await assertNoSupabaseError(
    supabase.from('listing_photos').upsert(rows, { onConflict: 'property_id,source_url' }),
    'upsert photos',
  );
}

async function upsertPromotion(supabase, propertyId, promotion) {
  if (!promotion) return;

  await assertNoSupabaseError(
    supabase.from('property_promotions').upsert(
      {
        property_id: propertyId,
        badge: promotion.badge,
        description: promotion.description,
      },
      { onConflict: 'property_id' },
    ),
    'upsert promotion',
  );
}

async function upsertFaqs(supabase, propertyId, faqs) {
  if (!faqs.length) return;

  await assertNoSupabaseError(
    supabase.from('property_faqs').upsert(
      faqs.map((faq) => ({
        property_id: propertyId,
        question: faq.question,
        answer: faq.answer,
        display_order: faq.displayOrder,
      })),
      { onConflict: 'property_id,question' },
    ),
    'upsert faqs',
  );
}

async function upsertReviews(supabase, propertyId, reviews) {
  if (!reviews.length) return;

  await assertNoSupabaseError(
    supabase.from('property_reviews').upsert(
      reviews.map((review) => ({
        property_id: propertyId,
        reviewer_name: review.reviewerName,
        years_text: review.yearsText,
        rating: review.rating,
        body: review.body,
        would_recommend: review.wouldRecommend,
        source_hash: review.sourceHash,
      })),
      { onConflict: 'property_id,source_hash' },
    ),
    'upsert reviews',
  );
}

async function upsertCampusMetrics(supabase, propertyId, campusId, metrics) {
  const metric = metrics.find((row) => row.campusSlug === 'ucla');
  if (!metric) return;

  await assertNoSupabaseError(
    supabase.from('listing_campus_metrics').upsert(
      {
        property_id: propertyId,
        campus_id: campusId,
        distance_meters: metric.distanceMeters,
        distance_miles: metric.distanceMiles,
        walk_seconds: metric.walkSeconds,
        bike_seconds: metric.bikeSeconds,
        drive_seconds: metric.driveSeconds,
        transit_seconds: metric.transitSeconds,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'property_id,campus_id' },
    ),
    'upsert campus metrics',
  );
}

async function upsertPois(supabase, propertyId, pointsOfInterest) {
  for (const poi of pointsOfInterest) {
    const poiRow = await upsertSingle(
      supabase
        .from('points_of_interest')
        .upsert(
          {
            source_external_id: poi.sourceExternalId,
            name: poi.name,
            address: poi.address,
            latitude: poi.latitude,
            longitude: poi.longitude,
            location: pointWkt(poi),
          },
          { onConflict: 'name,address' },
        )
        .select('id')
        .single(),
      'upsert point of interest',
    );

    await assertNoSupabaseError(
      supabase.from('property_poi_metrics').upsert(
        {
          property_id: propertyId,
          poi_id: poiRow.id,
          distance_meters: poi.distanceMeters,
          distance_miles: poi.distanceMiles,
          walk_seconds: poi.walkSeconds,
          bike_seconds: poi.bikeSeconds,
          drive_seconds: poi.driveSeconds,
          transit_seconds: poi.transitSeconds,
        },
        { onConflict: 'property_id,poi_id' },
      ),
      'upsert poi metrics',
    );
  }
}

async function upsertListingSearchIndex(supabase, propertyId, record, context) {
  const { dataSource, campus, bucket } = context;
  const availableUnits = record.units.filter((unit) =>
    ['available_now', 'available_on'].includes(unit.availabilityStatus),
  );
  const rentUnits = availableUnits.filter((unit) => Number.isInteger(unit.rentMonthly));
  const bedUnits = availableUnits.filter((unit) => unit.bedrooms !== null);
  const bathUnits = availableUnits.filter((unit) => unit.bathrooms !== null);
  const primaryImage = record.images.find((image) => image.downloadStatus === 'mirrored') || record.images[0] || null;
  const primaryPhotoUrl =
    primaryImage?.storagePath && primaryImage?.storageBucket
      ? getPublicStorageUrl(supabase, primaryImage.storageBucket, primaryImage.storagePath)
      : primaryImage?.sourceUrl || null;
  const campusMetric = record.campusMetrics.find((row) => row.campusSlug === 'ucla') || {};

  await assertNoSupabaseError(
    supabase.from('listing_search_index').upsert(
      {
        property_id: propertyId,
        campus_id: campus.id,
        source_id: dataSource.id,
        source_url: record.property.sourceUrl,
        title: record.property.name,
        slug: record.property.slug,
        address: record.property.address,
        latitude: record.property.latitude,
        longitude: record.property.longitude,
        location: pointWkt(record.property),
        primary_photo_url: primaryPhotoUrl,
        storage_photo_path: primaryImage?.storagePath || null,
        min_rent: minNumber(rentUnits.map((unit) => unit.rentMonthly)),
        max_rent: maxNumber(rentUnits.map((unit) => unit.rentMonthly)),
        min_beds: minNumber(bedUnits.map((unit) => unit.bedrooms)),
        max_beds: maxNumber(bedUnits.map((unit) => unit.bedrooms)),
        min_baths: minNumber(bathUnits.map((unit) => unit.bathrooms)),
        max_baths: maxNumber(bathUnits.map((unit) => unit.bathrooms)),
        available_unit_count: availableUnits.length,
        total_unit_count: record.units.length,
        earliest_move_in: minDate(availableUnits.map((unit) => unit.moveInDate)),
        walk_seconds: campusMetric.walkSeconds || null,
        bike_seconds: campusMetric.bikeSeconds || null,
        drive_seconds: campusMetric.driveSeconds || null,
        transit_seconds: campusMetric.transitSeconds || null,
        distance_meters: campusMetric.distanceMeters || null,
        promotion_badge: record.promotion?.badge || null,
        manager_display_name: record.property.managerDisplayName,
        active: availableUnits.length > 0,
        quality_score: Math.max(0, 100 - record.property.dataQualityWarnings.length * 10),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'property_id' },
    ),
    'upsert listing search index',
  );
}

async function mirrorOneImage(supabase, bucket, record, image) {
  const baseResult = {
    propertySourceId: record.property.sourceId,
    propertySlug: record.property.slug,
    sourceUrl: image.sourceUrl,
    storagePath: image.storagePath || null,
    status: image.downloadStatus,
    errorMessage: null,
  };

  if (image.downloadStatus === 'mirrored' && image.storagePath) {
    return { ...baseResult, status: 'skipped' };
  }

  if (/\/placeholder\.svg(?:$|\?)/i.test(image.sourceUrl)) {
    image.downloadStatus = 'skipped';
    image.errorMessage = 'placeholder image skipped';
    return { ...baseResult, status: 'skipped', errorMessage: image.errorMessage };
  }

  try {
    assertTrustedImageUrl(image.sourceUrl);
    const response = await fetchWithRetry(image.sourceUrl, { redirect: 'error' });
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Non-image content type: ${contentType}`);
    }

    const buffer = await readResponseBodyWithLimit(response, MAX_IMAGE_BYTES);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const storagePath = [
      'unishack',
      'ucla',
      safePathSegment(record.property.sourceId),
      `${String(image.displayOrder).padStart(2, '0')}-${sha256.slice(0, 16)}${imageExtension(contentType, image.sourceUrl)}`,
    ].join('/');

    const upload = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

    if (upload.error) throw upload.error;

    image.storageBucket = bucket;
    image.storagePath = storagePath;
    image.contentType = contentType;
    image.byteSize = buffer.byteLength;
    image.sha256 = sha256;
    image.downloadStatus = 'mirrored';
    image.errorMessage = null;

    return {
      ...baseResult,
      status: 'mirrored',
      storagePath,
      contentType,
      byteSize: buffer.byteLength,
      sha256,
    };
  } catch (error) {
    image.downloadStatus = 'failed';
    image.errorMessage = error.message;
    return { ...baseResult, status: 'failed', errorMessage: error.message };
  }
}

async function ensurePublicBucket(supabase, bucket) {
  const list = await supabase.storage.listBuckets();
  if (list.error) throw list.error;

  const existing = list.data.find((item) => item.name === bucket);
  if (existing) {
    if (existing.public !== true) {
      const updated = await supabase.storage.updateBucket(bucket, { public: true });
      if (updated.error) throw updated.error;
    }
    return;
  }

  const created = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

function buildValidationReport(discovered, records, parseErrors) {
  const duplicateSlugs = findDuplicates(records.map((record) => record.property.slug));
  const duplicateSourceIds = findDuplicates(records.map((record) => record.property.sourceId));
  const propertyWarnings = records.flatMap((record) =>
    record.property.dataQualityWarnings.map((warning) => ({
      sourceId: record.property.sourceId,
      slug: record.property.slug,
      warning,
    })),
  );

  const missingAddress = records
    .filter((record) => !record.property.address)
    .map((record) => record.property.slug);
  const missingCoordinates = records
    .filter((record) => record.property.latitude === null || record.property.longitude === null)
    .map((record) => record.property.slug);
  const missingImages = records.filter((record) => record.images.length === 0).map((record) => record.property.slug);
  const missingUnits = records.filter((record) => record.units.length === 0).map((record) => record.property.slug);

  return {
    generatedAt: new Date().toISOString(),
    discoveredCount: discovered.length,
    normalizedCount: records.length,
    parseErrorCount: parseErrors.length,
    warningCount: propertyWarnings.length + duplicateSlugs.length + duplicateSourceIds.length,
    duplicateSlugs,
    duplicateSourceIds,
    missingAddress,
    missingCoordinates,
    missingImages,
    missingUnits,
    propertyWarnings,
    parseErrors,
  };
}

function buildImportPlan(records, inputPath) {
  return {
    dryRun: true,
    inputPath,
    generatedAt: new Date().toISOString(),
    propertyCount: records.length,
    unitCount: records.reduce((sum, record) => sum + record.units.length, 0),
    imageCount: records.reduce((sum, record) => sum + record.images.length, 0),
    mirroredImageCount: records.reduce(
      (sum, record) => sum + record.images.filter((image) => image.downloadStatus === 'mirrored').length,
      0,
    ),
    faqCount: records.reduce((sum, record) => sum + record.faqs.length, 0),
    reviewCount: records.reduce((sum, record) => sum + record.reviews.length, 0),
    poiMetricCount: records.reduce((sum, record) => sum + record.pointsOfInterest.length, 0),
  };
}

async function fetchText(url) {
  const response = await fetchWithRetry(url);
  return response.text();
}

async function fetchWithRetry(url, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
          ...(options.headers || {}),
        },
      });

      if (response.ok) return response;
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await delay(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

function assertTrustedImageUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid image URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Blocked non-HTTPS image URL: ${rawUrl}`);
  }

  const allowedHosts = new Set(
    (process.env.UNISHACK_ALLOWED_IMAGE_HOSTS || DEFAULT_ALLOWED_IMAGE_HOSTS.join(','))
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Blocked untrusted image host: ${parsed.hostname}`);
  }
}

async function readResponseBodyWithLimit(response, maxBytes) {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Image exceeds ${maxBytes} byte limit`);
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Image exceeds ${maxBytes} byte limit`);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new Error(`Image exceeds ${maxBytes} byte limit`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

async function mapWithConcurrency(items, concurrency, worker) {
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.trunc(concurrency) : 1;
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  });

  await Promise.all(workers);
}

async function prepareOutDir(outDir, options = {}) {
  const timestamped = options.timestamped !== false;
  const resolved = path.resolve(
    outDir || path.join(DEFAULT_OUT_ROOT, timestamped ? `unishack-ucla-${timestampForPath()}` : ''),
  );
  await fs.mkdir(resolved, { recursive: true });
  return resolved;
}

async function findLatestRunFile(...fileNames) {
  const root = path.resolve(DEFAULT_OUT_ROOT);
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const dirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('unishack-ucla-'))
    .map((entry) => path.join(root, entry.name))
    .sort()
    .reverse();

  for (const dir of dirs) {
    for (const fileName of fileNames) {
      const candidate = path.join(dir, fileName);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // keep searching
      }
    }
  }

  throw new Error(`No prior scraper output found under ${root}. Pass --input <path>.`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for mirror/import commands');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function upsertSingle(query, action) {
  const { data, error } = await query;
  if (error) throw new Error(`${action}: ${error.message}`);
  return data;
}

async function assertNoSupabaseError(query, action) {
  const { error } = await query;
  if (error) throw new Error(`${action}: ${error.message}`);
}

function pointWkt(row) {
  if (!Number.isFinite(row?.latitude) || !Number.isFinite(row?.longitude)) return null;
  return `POINT(${row.longitude} ${row.latitude})`;
}

function minNumber(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

function maxNumber(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.max(...valid) : null;
}

function minDate(values) {
  const valid = values.filter(Boolean).sort();
  return valid[0] || null;
}

function getPublicStorageUrl(supabase, bucket, storagePath) {
  return supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

function imageExtension(contentType, sourceUrl) {
  const byType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  };
  if (byType[contentType]) return byType[contentType];

  const pathname = new URL(sourceUrl).pathname;
  const ext = path.extname(pathname).toLowerCase();
  return ext && ext.length <= 6 ? ext : '.img';
}

function safePathSegment(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').replace('Z', 'Z');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  const args = {};

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;

    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = rest[i + 1];

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }

  return { command, args };
}

function printUsage() {
  console.log(`
Usage:
  npm run unishack:discover -- [--out scrape-output/run] [--expect-count 359]
  npm run unishack:scrape -- [--limit 10] [--concurrency 4] [--out scrape-output/run]
  npm run unishack:mirror-images -- [--input scrape-output/run/normalized.json] [--bucket listing-media]
  npm run unishack:import -- [--input scrape-output/run/normalized.mirrored.json] [--dry-run]

Environment for mirror/import:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_STORAGE_BUCKET=listing-media
`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
