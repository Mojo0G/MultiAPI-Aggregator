-- Migration 001: Base schema version ONE for aggregated records
CREATE TABLE IF NOT EXISTS aggregated_records (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source VARCHAR(50) NOT NULL,
    score INT DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);
