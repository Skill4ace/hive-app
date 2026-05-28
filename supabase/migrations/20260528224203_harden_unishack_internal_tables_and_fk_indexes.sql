create index if not exists ingestion_runs_source_id_idx
  on public.ingestion_runs (source_id);

create index if not exists listing_campus_metrics_campus_id_idx
  on public.listing_campus_metrics (campus_id);

create index if not exists listing_search_index_source_id_idx
  on public.listing_search_index (source_id);

create index if not exists properties_campus_id_idx
  on public.properties (campus_id);

create index if not exists property_poi_metrics_poi_id_idx
  on public.property_poi_metrics (poi_id);

create index if not exists source_listing_records_property_id_idx
  on public.source_listing_records (property_id);

drop policy if exists "No public read ingestion runs" on public.ingestion_runs;
create policy "No public read ingestion runs"
on public.ingestion_runs for select
to anon, authenticated
using (false);

drop policy if exists "No public read source listing records" on public.source_listing_records;
create policy "No public read source listing records"
on public.source_listing_records for select
to anon, authenticated
using (false);
