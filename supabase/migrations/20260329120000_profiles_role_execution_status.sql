-- EdTech: role on profiles; execution telemetry for streak alerts

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'teacher'));

ALTER TABLE execution_history ADD COLUMN IF NOT EXISTS session_id TEXT;
UPDATE execution_history SET session_id = document_id WHERE session_id IS NULL OR session_id = '';
ALTER TABLE execution_history ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE execution_history ALTER COLUMN session_id SET DEFAULT '';

ALTER TABLE execution_history ADD COLUMN IF NOT EXISTS execution_status TEXT NOT NULL DEFAULT 'success';
ALTER TABLE execution_history DROP CONSTRAINT IF EXISTS execution_history_execution_status_check;
ALTER TABLE execution_history ADD CONSTRAINT execution_history_execution_status_check
  CHECK (execution_status IN ('success', 'failed'));

-- Best-effort backfill for historical rows (no exit_code stored previously)
UPDATE execution_history
SET execution_status = 'failed'
WHERE trim(coalesce(stderr, '')) <> '';

CREATE INDEX IF NOT EXISTS idx_execution_history_session_created
  ON execution_history (session_id, created_at DESC);
