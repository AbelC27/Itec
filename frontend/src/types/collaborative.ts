export interface AwarenessUserState {
  /** Supabase user ID */
  userId: string;
  /** Display name from profiles table */
  username: string;
  /** Hex color for cursor/selection decoration */
  avatarColorHex: string;
  /** Monaco cursor position */
  cursor: {
    lineNumber: number;
    column: number;
  } | null;
  /** Monaco selection range (null if no selection) */
  selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
}

export interface DocUpdatePayload {
  /** Base64-encoded Yjs update (Uint8Array) */
  update: string;
  /** Sender's client ID to prevent echo */
  clientId: number;
}

export interface PresenceState {
  /** Supabase user ID */
  userId: string;
  /** Display name from profiles table */
  username: string;
  /** Hex color for cursor/selection decoration */
  avatarColorHex: string;
  /** Monaco cursor position */
  cursor: {
    lineNumber: number;
    column: number;
  } | null;
  /** Monaco selection range */
  selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
}
