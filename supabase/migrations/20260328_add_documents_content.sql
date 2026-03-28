-- Add content column for document sync
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
