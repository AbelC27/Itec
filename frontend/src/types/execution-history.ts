export interface ExecutionHistoryEntry {
  id: string;
  document_id: string;
  language: string;
  code_snapshot: string;
  mem_limit: string;
  nano_cpus: number;
  stdout: string;
  stderr: string;
  execution_time: number;
  created_at: string;
}
