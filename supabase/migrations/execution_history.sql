-- Time-Travel Execution History: Phase 5
-- Records every code execution for history/timeline features

CREATE TABLE execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    language TEXT NOT NULL,
    code_snapshot TEXT NOT NULL,
    mem_limit TEXT NOT NULL,
    nano_cpus BIGINT NOT NULL,
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    execution_time DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_history_document_id_created_at
    ON execution_history (document_id, created_at DESC);
