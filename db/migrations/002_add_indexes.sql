-- Migration 002: Schema evolution - Add performance indexes for filtering by source and date
CREATE INDEX IF NOT EXISTS idx_records_source ON aggregated_records (source);
CREATE INDEX IF NOT EXISTS idx_records_fetched_at ON aggregated_records (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_source_fetched ON aggregated_records (source, fetched_at DESC);
