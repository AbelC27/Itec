-- Document Management: Phase 6
-- The documents table already exists (from collaborative editor phase).
-- This migration adds the language column, indexes, and adjusts constraints for the CRUD API.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'python';

-- Make owner_id nullable for MVP (no auth enforcement yet)
ALTER TABLE documents ALTER COLUMN owner_id DROP NOT NULL;

-- Add a default UUID generator for id so inserts work without providing an id
ALTER TABLE documents ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents (owner_id) WHERE owner_id IS NOT NULL;
