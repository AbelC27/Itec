/**
 * Type definitions for the Autonomous Agent Swarm feature
 */

export interface SwarmState {
  user_prompt: string;
  generated_code: string;
  security_status: "approved" | "blocked" | "";
  test_results: string;
  error_message: string;
  retry_count: number;
}

export type SwarmMessageType = "state_update" | "complete" | "error";

export interface SwarmMessage {
  type: SwarmMessageType;
  node?: string;
  state?: SwarmState;
  final_state?: SwarmState;
  message?: string;
}

export type SwarmStatus = "idle" | "generating" | "reviewing" | "testing" | "complete" | "error";
