"""
Telemetry Tracker — failure-streak detection and tutor-trigger logic.

Pure-function module that queries execution_history to compute streaks.
No persistent state; rate-limiting uses an in-memory dict keyed by session_id.
"""

import logging
import os

from db import get_supabase_client

logger = logging.getLogger(__name__)

DEFAULT_FAILURE_THRESHOLD = 3

# ---------------------------------------------------------------------------
# Failure threshold configuration (Requirement 8)
# ---------------------------------------------------------------------------


def get_failure_threshold() -> int:
    """Parse FAILURE_THRESHOLD from env. Falls back to 3 on invalid values."""
    raw = os.environ.get("FAILURE_THRESHOLD", "")
    if not raw:
        return DEFAULT_FAILURE_THRESHOLD
    try:
        value = int(raw)
        if value <= 0:
            logger.warning(
                "FAILURE_THRESHOLD=%s is non-positive, falling back to %d",
                raw,
                DEFAULT_FAILURE_THRESHOLD,
            )
            return DEFAULT_FAILURE_THRESHOLD
        return value
    except ValueError:
        logger.warning(
            "FAILURE_THRESHOLD=%s is not a valid integer, falling back to %d",
            raw,
            DEFAULT_FAILURE_THRESHOLD,
        )
        return DEFAULT_FAILURE_THRESHOLD


# ---------------------------------------------------------------------------
# Failure streak computation (Requirement 1)
# ---------------------------------------------------------------------------


def get_failure_streak(session_id: str) -> int:
    """Return the current consecutive-failure streak length for *session_id*.

    Queries the most recent rows from execution_history ordered by created_at
    DESC and counts trailing 'failed' entries.  Returns 0 when the most recent
    execution succeeded or when there are no rows.
    """
    try:
        client = get_supabase_client()
        # Fetch a reasonable window — we only need enough to detect the streak.
        response = (
            client.table("execution_history")
            .select("execution_status")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        streak = 0
        for row in response.data:
            if row.get("execution_status") == "failed":
                streak += 1
            else:
                break
        return streak
    except Exception as exc:
        logger.error("Failed to compute failure streak for %s: %s", session_id, exc)
        return 0


# ---------------------------------------------------------------------------
# Rate-limiting: track last triggered streak position per session
# ---------------------------------------------------------------------------

_last_triggered_streak: dict[str, int] = {}


def _should_trigger(session_id: str, streak: int, threshold: int) -> bool:
    """Return True if a tutor trigger should fire for this streak position.

    Fires when streak >= threshold AND we haven't already triggered for this
    exact streak length (avoids duplicate triggers for the same position).
    """
    if streak < threshold:
        return False
    last = _last_triggered_streak.get(session_id, 0)
    if streak <= last:
        return False
    return True


def _record_trigger(session_id: str, streak: int) -> None:
    _last_triggered_streak[session_id] = streak


def reset_trigger_tracking(session_id: str) -> None:
    """Reset trigger tracking when a session's streak resets (success)."""
    _last_triggered_streak.pop(session_id, None)


# ---------------------------------------------------------------------------
# Main entry point called from ws_router after save_execution
# ---------------------------------------------------------------------------


def check_and_trigger(
    session_id: str,
    code_snapshot: str,
    stderr: str,
    language: str,
) -> dict | None:
    """Compute streak, check threshold, return trigger payload or None.

    Returns a TutorTriggerState dict if a trigger should fire, else None.
    """
    streak = get_failure_streak(session_id)
    threshold = get_failure_threshold()

    if streak == 0:
        reset_trigger_tracking(session_id)
        return None

    if not _should_trigger(session_id, streak, threshold):
        return None

    _record_trigger(session_id, streak)
    return {
        "session_id": session_id,
        "code_snapshot": code_snapshot,
        "stderr": stderr,
        "language": language,
    }
