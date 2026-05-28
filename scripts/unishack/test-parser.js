#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  UCLA_APARTMENTS_URL,
  parseApartmentList,
  parsePropertyPage,
} = require('./parser');

const USER_AGENT = 'HiveUniShackParserTest/0.1 (+permitted local import)';

async function main() {
  const mainHtml = await fetchText(UCLA_APARTMENTS_URL);
  const apartments = parseApartmentList(mainHtml);

  assert.equal(apartments.length, 359, 'main page ItemList should expose exactly 359 UCLA apartments');
  assert.ok(
    apartments.some((item) => item.url === 'https://www.unishack.com/ucla/apartment/433-midvale'),
    'ItemList should include /ucla/apartment/433-midvale',
  );
  assert.ok(
    apartments.every((item) => new URL(item.url).pathname.startsWith('/ucla/apartment/')),
    'ItemList should only include UCLA apartment detail URLs',
  );

  const detailUrl = 'https://www.unishack.com/ucla/apartment/433-midvale';
  const detailHtml = await fetchText(detailUrl);
  const record = parsePropertyPage(detailHtml, detailUrl, { sourceDate: '2026-05-28' });
  const serialized = JSON.stringify(record);

  assert.equal(record.property.slug, '433-midvale');
  assert.equal(record.property.address, '433 Midvale Ave, Los Angeles, CA 90024, USA');
  assert.equal(record.images.length, 12, '433 Midvale should expose 12 real property images');
  assert.equal(record.units.length, 9, '433 Midvale should expose 9 unit rows');
  assert.equal(record.promotion?.badge, '3 MONTHS FREE PARKING');
  assert.equal(record.property.managerDisplayName, 'Jerry');
  assert.ok(record.faqs.length >= 6, '433 Midvale should expose FAQ rows from JSON-LD');
  assert.ok(record.campusMetrics.length >= 1, '433 Midvale should include UCLA commute metrics');
  assert.ok(record.pointsOfInterest.length >= 1, '433 Midvale should include point-of-interest metrics');
  assert.ok(record.units.some((unit) => unit.rentMonthly === 800), '433 Midvale should include $800 rent unit');
  assert.ok(!serialized.includes('contact_email'), 'normalized output must not persist hidden contact email keys');
  assert.ok(!serialized.includes('contact_phone'), 'normalized output must not persist hidden contact phone keys');

  console.log('UniShack parser tests passed');
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
