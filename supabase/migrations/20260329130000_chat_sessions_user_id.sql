-- Add user_id to chat sessions so conversations are scoped per user per document
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_doc ON ai_chat_sessions (document_id, user_id);
