# Hive Database Schema Research

Date: 2026-05-28

This note turns the product spec into a practical database plan for Hive's map, listing detail, saved listings, group matching, and future rental ingestion pipeline. The main recommendation is to model supply as stable properties, units/floorplans, and mutable rental listings, then layer campus context, user decisions, and group consensus on top.

## Research Summary

Zillow and Redfin both expose far more than a flat "listing" object.

- Zillow Rental Manager distinguishes property-level data from unit-level data. Property data covers address, total units, lease terms, fees, and description. Unit data covers floorplan, unit number, square footage, availability, rent, and deposits.
- Zillow feed specs include normalized location, status, price, source listing URL, MLS/source IDs, date listed, virtual tour URLs, property type, bedrooms, bathrooms, living area, photos, rental availability, lease term, deposits/fees, utilities included, pet policy, parking, rooms, appliances, and rich amenity fields.
- Zillow search UX supports filters and metadata that should be first-class for Hive: in-unit laundry, pet-friendly with type/size, online applications, map markers, saved homes, saved searches, alerts, side-by-side comparison, school search, price history, Walk/Transit/Bike Score, listing interest signals such as time on site, views, and saves, and natural-language search over location, price, and features.
- Redfin search UX supports location search by neighborhood/city/ZIP/MLS, map browsing, drawn search boundaries, filters, saved searches, email/app alerts, neighborhood stats, schools, custom search radius, property type filters, school search, and commute time. Its rental launch messaging specifically mentions budget, location, pet policy, photos, floor plans, 3D tours, and property-manager contact.
- Redfin's newer conversational search is also instructive: users ask for things that are not always exposed as static filters, such as rush-hour commute constraints, proximity to a named school, "move-in ready", recently renovated, smart features, or HOA limits. Hive should retain flexible structured metadata plus full-text and extracted feature observations.
- Zillow and Redfin announced on 2025-02-11 that Zillow became the exclusive provider of multifamily rental listings, meaning Redfin, Rent.com, and ApartmentGuide listings may flow through Zillow for large multifamily properties. This reinforces the need for source tracking, source licenses, and source-to-canonical deduping.
- Do not build a production scraper that directly copies Zillow or Redfin listing data without permission. Zillow says rentals on Zillow are published through Zillow Feed Connect or Zillow Rental Manager, its API terms are restrictive, and Redfin's terms prohibit automated crawling/scraping without prior written permission. Use licensed APIs/feeds, direct property-manager feeds, manual seed data, or allowed scraping from smaller sources after checking terms and robots policy.

## Recommended Domains

Hive should split the schema into these domains:

1. Identity and preferences: users, profiles, onboarding preferences, privacy, notification settings.
2. Campus and geography: campuses, neighborhoods, map boundaries, commute metrics, points of interest.
3. Rental supply: properties, units/floorplans, rental listings, media, amenities, policies, costs.
4. Map/search indexes: denormalized active listing records optimized for viewport and filter queries.
5. User activity: views, swipes, saves, notes, archives, comparisons, saved searches.
6. Group matching: groups, members, invites, shared preferences, listing votes, consensus state.
7. Ingestion and scraping: sources, runs, raw payloads, extracted records, dedupe, quality flags.
8. Trust and operations: reports, takedowns, audit logs, analytics events, notifications.

## MVP Tables

These tables are enough to support the current spec while avoiding a rewrite when real ingestion starts.

| Table | Purpose | Important Fields |
| --- | --- | --- |
| `profiles` | App user profile tied to Firebase/Supabase identity. | `id`, `firebase_uid`, `email`, `display_name`, `avatar_url`, `home_campus_id`, `privacy_settings`, `created_at` |
| `user_preferences` | Onboarding and editable solo search preferences. | `user_id`, `campus_id`, `budget_min`, `budget_max`, `budget_basis`, `move_in_start`, `move_in_end`, `max_distance_miles`, `commute_modes`, `beds_min`, `beds_max`, `baths_min`, `roommate_count`, `pets`, `lifestyle_traits`, `dealbreakers` |
| `campuses` | Search anchor for campus-centric housing. | `id`, `name`, `short_name`, `address`, `location geography(Point,4326)`, `term_system`, `timezone` |
| `neighborhoods` | Map labels and filters around campus. | `id`, `name`, `city`, `state`, `boundary geography(Polygon,4326)`, `campus_id` |
| `properties` | Stable physical building or house. | `id`, `normalized_address`, `display_address`, `property_name`, `property_type`, `location geography(Point,4326)`, `year_built`, `unit_count`, `source_confidence` |
| `property_units` | Unit, room, or floorplan data under a property. | `id`, `property_id`, `unit_label`, `floorplan_name`, `beds`, `baths`, `sqft`, `occupancy_min`, `occupancy_max`, `private_room_count`, `shared_room_count` |
| `rental_listings` | Mutable marketed rental opportunity. | `id`, `property_id`, `unit_id`, `title`, `description`, `status`, `price_min`, `price_max`, `price_period`, `pricing_model`, `available_on`, `lease_term_min_months`, `lease_term_max_months`, `listed_at`, `source_id`, `source_url`, `accepts_applications` |
| `listing_photos` | Gallery and card images. | `id`, `listing_id`, `source_url`, `storage_path`, `sort_order`, `caption`, `width`, `height`, `blurhash`, `perceptual_hash`, `license_note` |
| `amenities` | Canonical amenities dictionary. | `id`, `slug`, `label`, `category`, `filterable`, `icon_name` |
| `listing_amenities` | Listing-to-amenity assignments. | `listing_id`, `amenity_id`, `scope`, `source`, `confidence` |
| `listing_costs` | Fees and recurring costs beyond rent. | `listing_id`, `cost_type`, `amount_min`, `amount_max`, `period`, `required`, `description` |
| `pet_policies` | Pet filters and detail rows. | `listing_id`, `cats_allowed`, `small_dogs_allowed`, `large_dogs_allowed`, `pet_rent`, `pet_deposit`, `restrictions` |
| `parking_options` | Parking filters and detail rows. | `listing_id`, `parking_type`, `spaces`, `included`, `monthly_fee`, `description` |
| `listing_campus_metrics` | Precomputed campus distance and commute data. | `listing_id`, `campus_id`, `distance_miles`, `walk_minutes`, `bike_minutes`, `transit_minutes`, `drive_minutes`, `computed_at` |
| `saved_listings` | Saved tab state. | `user_id`, `listing_id`, `status`, `note`, `saved_at`, `archived_at` |
| `swipe_decisions` | Discover like/pass/undo history. | `id`, `user_id`, `listing_id`, `decision`, `source_screen`, `is_active`, `decided_at`, `reverted_at` |
| `groups` | Roommate group container. | `id`, `name`, `campus_id`, `created_by`, `created_at`, `archived_at` |
| `group_members` | Group membership and roles. | `group_id`, `user_id`, `role`, `status`, `joined_at`, `last_seen_at` |
| `group_invites` | Invite codes and deep links. | `id`, `group_id`, `code_hash`, `created_by`, `expires_at`, `max_uses`, `used_count`, `revoked_at` |
| `group_preferences` | Shared search rules. | `group_id`, `budget_min`, `budget_max`, `move_in_start`, `move_in_end`, `max_distance_miles`, `pets`, `neighborhood_ids`, `amenity_ids`, `lifestyle_traits` |
| `group_listing_votes` | Per-roommate listing decisions. | `group_id`, `listing_id`, `user_id`, `vote`, `note`, `created_at`, `updated_at` |
| `data_sources` | Licensed feed/API/manual/source metadata. | `id`, `name`, `source_type`, `base_url`, `terms_url`, `robots_url`, `allowed_use`, `attribution_text`, `rate_limit`, `active` |
| `source_listing_records` | Source-to-canonical mapping. | `id`, `source_id`, `external_id`, `source_url`, `listing_id`, `raw_hash`, `first_seen_at`, `last_seen_at`, `last_status` |
| `ingestion_runs` | Operational tracking for import jobs. | `id`, `source_id`, `run_type`, `started_at`, `finished_at`, `status`, `records_seen`, `records_created`, `records_updated`, `error_summary` |

## Phase 2 Tables

Add these once real listing supply and group usage grow.

| Table | Why It Matters |
| --- | --- |
| `listing_price_history` | Needed for price-drop alerts, stale-listing detection, and listing detail history. |
| `listing_availability_history` | Tracks move-in changes and units disappearing/reappearing. |
| `listing_status_events` | Audits active, inactive, pending, removed, duplicate, and unavailable transitions. |
| `property_managers` | Normalizes landlord/manager contact, source attribution, tour links, and lead routing. |
| `listing_contacts` | Allows multiple contacts per listing while hiding private ingestion-only data from clients. |
| `listing_tours` | 3D tours, video tours, virtual tours, open houses, and tour-booking URLs. |
| `saved_searches` | Saved map/filter searches for alerts and future email/push notifications. |
| `saved_search_areas` | Polygons/circles for Redfin/Zillow-style drawn searches and campus zones. |
| `listing_views` | View events for ranking, "seen" states, and anti-repeat feed logic. |
| `user_listing_notes` | Private notes and comparison comments separate from saves. |
| `group_listing_comments` | Deferred discussion surface without full chat infrastructure. |
| `user_listing_scores` | Cached match scores and explanations for Discover ranking. |
| `group_listing_scores` | Cached group fit and conflict reasons. |
| `notifications` | In-app notification records for invites, matches, price changes, and availability changes. |
| `push_tokens` | Device token storage with per-user notification controls. |
| `listing_reports` | User reports for wrong data, scams, unavailable units, duplicate listings, or bad photos. |
| `audit_events` | Admin and ingestion writes that affect public listing data. |

## Ingestion Schema

Use a separate private schema, for example `ingest`, for raw source material and parser output. Do not expose this schema to the Supabase Data API.

Recommended ingestion tables:

| Table | Purpose |
| --- | --- |
| `ingest.fetch_runs` | One crawl/API/feed import attempt. |
| `ingest.fetch_items` | One URL/API page/feed item processed within a run. |
| `ingest.raw_documents` | Raw HTML, JSON, XML, screenshots, or feed files stored by hash/path. |
| `ingest.extracted_records` | Parser output before canonical merge. |
| `ingest.field_observations` | Field-level extracted values with confidence, parser version, and source text path. |
| `ingest.entity_matches` | Dedupe candidates between source records and canonical properties/listings. |
| `ingest.data_quality_issues` | Missing price, impossible coordinates, stale photos, duplicate addresses, invalid availability, bad pet policy, etc. |

Pipeline:

1. Fetch from a permitted source.
2. Store raw response and request metadata.
3. Parse into extracted records.
4. Normalize fields into canonical units, prices, costs, amenities, policies, and geodata.
5. Dedupe by source IDs, normalized address/unit, geospatial proximity, property name, manager phone/email, and photo perceptual hashes.
6. Publish to public listing tables only after quality checks pass.

## Map And Search Design

Use PostGIS for map queries. Store canonical property locations as `geography(Point,4326)` and neighborhood/search boundaries as polygons. Supabase's PostGIS guidance recommends geospatial types and GiST indexes instead of plain latitude/longitude columns for scalable location search.

Create a denormalized `listing_search_index` table or materialized view for the mobile app. It should contain one active row per rentable listing/unit with:

- `listing_id`, `property_id`, `unit_id`
- `location geography(Point,4326)`, plus generated `lat` and `lng` for clients
- `campus_id`, `distance_miles`, `walk_minutes`, `bike_minutes`, `transit_minutes`
- `price_min`, `price_max`, `price_per_person_min`, `pricing_model`
- `beds`, `baths`, `sqft`, `available_on`, `lease_term_min_months`
- `primary_photo_url`, `title`, `neighborhood_name`, `property_type`
- Filter booleans such as `has_in_unit_laundry`, `pet_friendly`, `parking_available`, `furnished`, `has_ac`, `has_dishwasher`
- `active`, `last_seen_at`, `quality_score`

Indexes to plan:

- GiST on `properties.location` and `listing_search_index.location`
- GiST on `neighborhoods.boundary`
- Partial btree on active listings: `(campus_id, active, available_on, price_min)`
- Btree on `(listing_id, campus_id)` for `listing_campus_metrics`
- Unique source mapping on `(source_id, external_id)`
- Unique votes on `(group_id, listing_id, user_id)`
- Unique saves on `(user_id, listing_id)`
- GIN on amenity arrays or `tsvector` if using full-text listing search

For map performance, the client should query by viewport bounds plus filters, then fetch detail by ID. Do not make the map marker query join every normalized table on each pan.

## Supabase Access Model

Keep RLS enabled on every table in exposed schemas.

- Public/listing tables: authenticated users can read active, quality-approved listings. Writes should be service-role/admin only.
- User-private tables: `profiles`, `user_preferences`, `saved_listings`, `swipe_decisions`, `saved_searches`, and `user_listing_notes` are readable/mutable only by the owning user.
- Group tables: group rows, preferences, members, votes, and comments are readable only by members. Votes are writable only by the voting member. Invites are redeemable by code but group data should not be exposed until membership is created.
- Ingestion tables: use a private schema, service role only, no mobile reads.
- Realtime: enable only for group membership, invites, and `group_listing_votes` at first. Listing supply changes do not need realtime fanout to mobile clients.
- Storage: listing media can be public-read if licensed for app display. Raw source documents, scraper screenshots, and private user avatars should be private buckets with explicit policies.

Because the spec uses Firebase auth with a Supabase identity bridge, avoid authorization decisions based on user-editable metadata. Store app authorization state in database rows or trusted app metadata, not arbitrary user profile claims.

## Student-Housing Specific Additions

Hive should handle cases general housing apps often blur together:

- Per-person rent vs whole-unit rent. Store `pricing_model` and `budget_basis`.
- Rooms inside shared units. `property_units` should support `private_room_count`, `shared_room_count`, and occupancy.
- Academic calendars. Campuses should know semester/quarter context so move-in filters can align to school terms.
- Commute modes. Precompute walking, biking, transit, and driving durations per campus.
- Roommate fit. Store lifestyle traits and group conflicts separately from listing facts.
- Dealbreakers. Keep explicit normalized fields for pets, parking, laundry, furnished, AC, lease length, and distance. JSON can hold early flexible fields, but high-use filters should become columns.
- Trust. Keep data quality flags and user reports visible to operations before scaling ingestion.

## Recommended Build Order

1. Implement core app tables: `profiles`, `user_preferences`, `campuses`, `properties`, `property_units`, `rental_listings`, `listing_photos`, `amenities`, `listing_amenities`, `listing_campus_metrics`, `saved_listings`, `swipe_decisions`, and group tables.
2. Add the `listing_search_index` table or materialized view before wiring the map to live data.
3. Add `data_sources`, `source_listing_records`, and `ingestion_runs` before importing anything beyond seed data.
4. Add private `ingest.*` raw/pipeline tables when a real allowed source is selected.
5. Add history, alerts, reports, and scoring caches after the app has stable listing and vote flows.

## Sources

- Hive local spec: `spec.md`
- Zillow Rental Manager Listing Data Overview: https://help.zillowrentalmanager.com/hc/en-us/articles/21542731223827-Listing-Data-Overview
- Zillow rental syndication requirements: https://help.zillowrentalmanager.com/hc/en-us/articles/16759466328467-Why-Aren-t-My-Rental-Listings-Syndicating-onto-Zillow
- Zillow advanced search: https://www.zillow.com/learn/zillow-advanced-search/
- Zillow listing/feed guide: https://www.zillow.com/static/pdf/feeds/ZillowListingsFeedGuidev104_COLOR_Final.pdf
- Zillow broker feed technical spec: https://www.zillow.com/static/pdf/feeds/ZillowBrokerFeedsTechnicalSpecV1.0.17.pdf
- Zillow listing sources help: https://zillow.zendesk.com/hc/en-us/articles/227960468-How-does-Zillow-get-listings
- Zillow API terms: https://www.zillowgroup.com/developers/terms/
- Redfin searching help: https://support.redfin.com/hc/en-us/articles/360001432632-Searching-for-Homes
- Redfin saved search help: https://support.redfin.com/hc/en-us/articles/360001432532-How-to-Create-a-Saved-Search
- Redfin rental search launch: https://www.redfin.com/news/redfin-launches-rental-search/
- Redfin app listing: https://play.google.com/store/apps/details?id=com.redfin.android
- Redfin conversational search: https://www.redfin.com/blog/redfin-conversational-search/
- Zillow/Redfin rental partnership: https://www.redfin.com/news/wp-content/uploads/2025/06/2025-02-11_Zillow_and_Redfin_partner_to_make_apartment_1266.pdf
- Redfin terms: https://www.redfin.com/about/terms-of-use
- Supabase PostGIS docs: https://supabase.com/docs/guides/database/extensions/postgis
- Supabase RLS docs: https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security
- Supabase Realtime Postgres changes docs: https://supabase.com/docs/guides/realtime/postgres-changes
