"""
LangGraph Tool Nodes for the Autonomous Agent Swarm.

This module implements three specialized agent nodes:
- python_developer_node: Generates Python code using LLM
- security_reviewer_node: Analyzes code for malicious patterns
- sandbox_tester_node: Executes code in isolated Docker container

All nodes use async def with direct await (no asyncio.run) for
non-blocking execution in FastAPI's event loop.
"""

import json as _json
import os
import logging
from datetime import datetime, timezone

from openai import AsyncOpenAI

from ai_analyzer import analyze
from docker_manager import DockerIsolationManager
from schemas import Swarm_State, TutorTriggerState, TutorIntervention

_logger = logging.getLogger(__name__)


async def python_developer_node(state: Swarm_State) -> dict:
    """
    Generate Python code from user prompt using LLM.
    
    On retry attempts (retry_count > 0), includes error_message in the
    prompt to provide context for fixing the previous failure.
    
    Args:
        state: Current Swarm_State containing user_prompt and retry context
    
    Returns:
        Dict with generated_code and error_message fields to update state
    """
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    )
    
    prompt = state["user_prompt"]
    
    # Include error context on retry attempts
    if state["retry_count"] > 0 and state["error_message"]:
        prompt += f"\n\nPrevious attempt failed with error:\n{state['error_message']}\n\nPlease fix the code."
    
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0.7,
            messages=[
                {
                    "role": "system",
                    "content": "You are a Python code generator. Return ONLY raw executable Python code. Do NOT use markdown code blocks (```python). Do NOT include explanations. Just return the Python code directly."
                },
                {"role": "user", "content": prompt}
            ]
        )
        
        code = response.choices[0].message.content.strip()
        
        # Strip markdown code blocks if LLM still returns them
        if code.startswith("```python"):
            code = code[9:]  # Remove ```python
        if code.startswith("```"):
            code = code[3:]  # Remove ```
        if code.endswith("```"):
            code = code[:-3]  # Remove trailing ```
        code = code.strip()
        return {"generated_code": code, "error_message": ""}
    
    except Exception as e:
        return {
            "generated_code": "",
            "error_message": f"Code generation failed: {str(e)}"
        }


async def security_reviewer_node(state: Swarm_State) -> dict:
    """
    Analyze generated code for malicious patterns using existing ai_analyzer.
    
    Reuses analyze() to avoid redundant LLM calls and maintain consistency
    with the existing security validation logic.
    
    Args:
        state: Current Swarm_State containing generated_code
    
    Returns:
        Dict with security_status and error_message fields to update state
    """
    code = state["generated_code"]
    
    if not code:
        return {
            "security_status": "blocked",
            "error_message": "No code to review"
        }
    
    try:
        estimate = await analyze(code)
        
        if estimate.is_malicious:
            return {
                "security_status": "blocked",
                "error_message": f"Security violation: {estimate.security_reason}"
            }
        
        return {"security_status": "approved"}
    
    except Exception as e:
        return {
            "security_status": "blocked",
            "error_message": f"Security analysis failed: {str(e)}"
        }


async def sandbox_tester_node(state: Swarm_State) -> dict:
    """
    Execute generated code in isolated Docker container.
    
    Collects stdout, stderr, and exit_code without WebSocket streaming
    (streaming is handled by the WebSocket router, not the node).
    
    CRITICAL: When execution fails, this node increments retry_count
    in the returned state dict (LangGraph state management requirement).
    
    Args:
        state: Current Swarm_State containing generated_code and retry_count
    
    Returns:
        Dict with test_results, error_message, and retry_count fields
    """
    code = state["generated_code"]
    
    if not code:
        return {
            "test_results": "No code to test",
            "error_message": "Empty code",
            "retry_count": state["retry_count"] + 1
        }
    
    docker_mgr = DockerIsolationManager()
    
    # Collect execution results without streaming
    stdout_lines = []
    stderr_lines = []
    exit_code = -1
    
    async def collect_output(msg_type: str, content: str | dict) -> None:
        """Callback to collect execution output."""
        nonlocal exit_code
        if msg_type == "stdout":
            stdout_lines.append(content)
        elif msg_type == "stderr":
            stderr_lines.append(content)
        elif msg_type == "complete":
            exit_code = content.get("exit_code", -1)
    
    try:
        await docker_mgr.execute_streaming(
            language="python",
            code=code,
            send=collect_output
        )
        
        stdout = "".join(stdout_lines)
        stderr = "".join(stderr_lines)
        
        test_results = f"Exit code: {exit_code}\nStdout:\n{stdout}\nStderr:\n{stderr}"
        
        if exit_code != 0:
            return {
                "test_results": test_results,
                "error_message": stderr or "Non-zero exit code",
                "retry_count": state["retry_count"] + 1
            }
        
        return {"test_results": test_results, "error_message": "", "code_snapshot": code}
    
    except Exception as e:
        return {
            "test_results": f"Execution failed: {str(e)}",
            "error_message": str(e),
            "retry_count": state["retry_count"] + 1
        }


# ---------------------------------------------------------------------------
# Sentinel Tutor Agent — Socratic guidance generation (Requirement 3 & 6)
# ---------------------------------------------------------------------------

_SOCRATIC_SYSTEM_PROMPT = (
    "You are a Socratic tutor for programming students. "
    "You MUST NOT provide direct answers, code fixes, or solutions.\n\n"
    "Given a student's failing code and the error output, you must:\n"
    "1. Identify the likely root cause of the failure.\n"
    "2. Formulate ONE guiding question that leads the student toward "
    "discovering the issue themselves.\n\n"
    "Your question should hint at the area of the problem without revealing the fix.\n"
    'Respond in JSON: {"question": "...", "root_cause_summary": "..."}'
)

_FALLBACK_QUESTION = "Keep going! Try re-reading the error message carefully."
_FALLBACK_SUMMARY = "Review the error output for clues."


async def sentinel_tutor_node(state: TutorTriggerState) -> dict:
    """Analyse failing student code and produce a Socratic guiding question.

    Returns a dict suitable for constructing a TutorIntervention.
    """
    session_id = state["session_id"]
    code_snapshot = state.get("code_snapshot", "")
    stderr = state.get("stderr", "")
    language = state.get("language", "unknown")

    # Empty code or stderr → generic encouragement (Req 3.5)
    if not code_snapshot.strip() or not stderr.strip():
        return TutorIntervention(
            session_id=session_id,
            question=_FALLBACK_QUESTION,
            root_cause_summary=_FALLBACK_SUMMARY,
            language=language,
            created_at=datetime.now(timezone.utc),
        ).model_dump(mode="json")

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    )

    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0.4,
            timeout=10,
            messages=[
                {"role": "system", "content": _SOCRATIC_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Language: {language}\n\n"
                        f"Code:\n```\n{code_snapshot}\n```\n\n"
                        f"Error output:\n```\n{stderr}\n```"
                    ),
                },
            ],
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[: raw.rfind("```")]
        raw = raw.strip()

        parsed = _json.loads(raw)
        question = parsed.get("question", _FALLBACK_QUESTION)
        root_cause = parsed.get("root_cause_summary", _FALLBACK_SUMMARY)

        return TutorIntervention(
            session_id=session_id,
            question=question,
            root_cause_summary=root_cause,
            language=language,
            created_at=datetime.now(timezone.utc),
        ).model_dump(mode="json")

    except Exception as exc:
        _logger.error("sentinel_tutor_node failed for session %s: %s", session_id, exc)
        return TutorIntervention(
            session_id=session_id,
            question=_FALLBACK_QUESTION,
            root_cause_summary=_FALLBACK_SUMMARY,
            language=language,
            created_at=datetime.now(timezone.utc),
        ).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Spec Enforcer Agent — assignment compliance checking (Spec-Driven Enforcement)
# ---------------------------------------------------------------------------

_SPEC_ENFORCER_SYSTEM_PROMPT = (
    "You are an Assignment Enforcer. The student's code currently executes successfully. "
    "Compare their code against the Teacher's Spec. If they missed a requirement "
    "(e.g., 'You must use a while loop, but you used a for loop'), provide a brief "
    "Socratic nudge to correct them. Do not write the code for them.\n\n"
    "Respond in JSON:\n"
    '{"compliant": true/false, "message": "...", "missed_requirements": ["...", "..."]}'
)


async def spec_enforcer_node(state: Swarm_State) -> dict:
    """Compare student code against the teacher's spec and produce a compliance nudge."""
    spec_markdown = state.get("spec_markdown", "")
    code_snapshot = state.get("code_snapshot", "")
    language = "python"  # inferred from swarm context

    # No spec or no code → compliant by default
    if not spec_markdown.strip() or not code_snapshot.strip():
        return {
            "spec_compliant": True,
            "error_message": "",
        }

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    )

    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0.3,
            timeout=15,
            messages=[
                {"role": "system", "content": _SPEC_ENFORCER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"## Teacher's Spec\n{spec_markdown}\n\n"
                        f"## Student's Code ({language})\n```\n{code_snapshot}\n```"
                    ),
                },
            ],
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[: raw.rfind("```")]
        raw = raw.strip()

        parsed = _json.loads(raw)
        compliant = parsed.get("compliant", True)
        message = parsed.get("message", "")
        missed = parsed.get("missed_requirements", [])

        return {
            "spec_compliant": compliant,
            "error_message": message if not compliant else "",
            "test_results": state.get("test_results", "") + (
                f"\n\n[Spec Enforcer] {'Compliant' if compliant else 'Non-compliant'}: {message}"
                + (f"\nMissed: {', '.join(missed)}" if missed else "")
            ),
        }

    except Exception as exc:
        _logger.error("spec_enforcer_node failed: %s", exc)
        return {
            "spec_compliant": True,
            "error_message": "",
        }
