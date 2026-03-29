-- Spec-Driven Enforcement: add spec_markdown column to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS spec_markdown TEXT DEFAULT NULL;
