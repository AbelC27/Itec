import asyncio
import logging
import shlex
import struct
import time

import docker

from schemas import LANGUAGE_IMAGES, ResourceEstimate, SendCallback
from ai_analyzer import analyze

logger = logging.getLogger(__name__)


class DockerIsolationManager:
    """Manages isolated code execution inside ephemeral Docker containers."""

    MEMORY_LIMIT: str = "256m"
    CPU_NANO_LIMIT: int = 500_000_000
    TIMEOUT_SECONDS: int = 5
    NETWORK_DISABLED: bool = True
    CONTAINER_LABEL: dict[str, str] = {"app": "itecify-execution"}

    def __init__(self) -> None:
        """Initialize Docker client from environment."""
        self.client = docker.from_env()

    async def execute_streaming(
        self,
        language: str,
        code: str,
        send: SendCallback,
    ) -> ResourceEstimate | None:
        """
        Run code in an isolated container and stream output via the send callback.

        Container is always removed in the finally block.
        """
        # Resolve image and build command (may raise ValueError or KeyError)
        try:
            image = self._resolve_image(language)
        except ValueError as exc:
            await send("error", str(exc))
            return None

        command = self._build_command(language, code)

        # AI Analysis Phase: estimate resource limits before container creation
        await send("status", "[AI] Scanning code for resource allocation...")
        estimate = await analyze(code)
        cpu_display = estimate.nano_cpus / 1_000_000_000
        await send("status", f"[AI] Allocated {estimate.mem_limit} RAM and {cpu_display} CPU.")

        # Security Gate: block execution if AI detects malicious intent
        if estimate.is_malicious:
            await send("error", f"[SECURITY ALERT] {estimate.security_reason}")
            return None

        container = None
        try:
            # Create container with AI-determined resource limits
            container = await asyncio.to_thread(
                self.client.containers.create,
                image=image,
                command=command,
                mem_limit=estimate.mem_limit,
                nano_cpus=estimate.nano_cpus,
                network_disabled=self.NETWORK_DISABLED,
                read_only=True,
                security_opt=["no-new-privileges"],
                labels=self.CONTAINER_LABEL,
            )

            # Task 4.5: Record start time and compute deadline
            start_time = time.time()
            deadline = start_time + self.TIMEOUT_SECONDS

            # Start the container
            await asyncio.to_thread(container.start)

            # Wait for the container to finish (with timeout)
            try:
                result = await asyncio.to_thread(
                    container.wait, timeout=self.TIMEOUT_SECONDS
                )
                timed_out = False
            except Exception:
                # Timeout or error — kill the container
                timed_out = True
                try:
                    await asyncio.to_thread(container.kill)
                except Exception:
                    pass

            execution_time = round(time.time() - start_time, 3)

            if timed_out:
                await send("error", "Timeout reached")
            else:
                # Container exited — read all logs after exit (reliable)
                chunks = await asyncio.to_thread(
                    self._read_log_chunks, container, deadline
                )
                for stream_type, text in chunks:
                    await send(stream_type, text)

                exit_code = result.get("StatusCode", -1)
                await send(
                    "complete",
                    {"execution_time": execution_time, "exit_code": exit_code},
                )

            return estimate

        except docker.errors.ImageNotFound:
            await send(
                "error",
                f"Execution environment not ready for language: {language}",
            )
            return None
        except docker.errors.DockerException:
            await send("error", "Code execution service is unavailable")
            return None
        finally:
            # Task 4.7: Guarantee container cleanup on all paths
            if container is not None:
                try:
                    await asyncio.to_thread(container.remove, force=True)
                except Exception:
                    pass

    async def _stream_logs(
        self,
        container,
        send: SendCallback,
        deadline: float,
    ) -> None:
        """
        Read container.logs(stream=True, follow=True) and forward
        stdout/stderr chunks via the send callback.

        Uses asyncio.to_thread to run the blocking Docker log generator
        without blocking the event loop. Collects (stream_type, text) tuples
        in the thread, then dispatches them via the async send callback.
        """
        chunks = await asyncio.to_thread(self._read_log_chunks, container, deadline)
        for stream_type, text in chunks:
            await send(stream_type, text)

    @staticmethod
    def _read_log_chunks(
        container, deadline: float
    ) -> list[tuple[str, str]]:
        """
        Blocking helper that reads multiplexed Docker log frames.

        Each frame has an 8-byte header:
          - byte[0]: stream type (1 = stdout, 2 = stderr)
          - bytes[1:4]: padding (unused)
          - bytes[4:8]: payload size as big-endian uint32

        Returns a list of (msg_type, text) tuples.
        """
        STREAM_TYPE_MAP = {1: "stdout", 2: "stderr"}
        HEADER_SIZE = 8
        results: list[tuple[str, str]] = []

        # Read all logs at once (container has already exited)
        raw = container.logs(stdout=True, stderr=True, stream=False, follow=False)
        if not raw:
            return results

        buf = bytes(raw)

        # Check if the output has multiplexed Docker headers.
        # Multiplexed frames start with stream_byte 1 (stdout) or 2 (stderr)
        # followed by 3 zero padding bytes. If the first bytes don't match
        # this pattern, Docker returned raw (non-multiplexed) output.
        is_multiplexed = (
            len(buf) >= HEADER_SIZE
            and buf[0] in (1, 2)
            and buf[1:4] == b"\x00\x00\x00"
        )

        if not is_multiplexed:
            # Non-multiplexed: read stdout and stderr separately
            stdout_raw = container.logs(stdout=True, stderr=False, stream=False, follow=False)
            stderr_raw = container.logs(stdout=False, stderr=True, stream=False, follow=False)
            if stdout_raw:
                text = bytes(stdout_raw).decode("utf-8", errors="replace")
                if text:
                    results.append(("stdout", text))
            if stderr_raw:
                text = bytes(stderr_raw).decode("utf-8", errors="replace")
                if text:
                    results.append(("stderr", text))
            return results

        offset = 0
        while offset + HEADER_SIZE <= len(buf):
            if time.time() >= deadline:
                break

            stream_byte = buf[offset]
            frame_size = struct.unpack(">I", buf[offset + 4 : offset + 8])[0]

            if offset + HEADER_SIZE + frame_size > len(buf):
                break

            payload = buf[offset + HEADER_SIZE : offset + HEADER_SIZE + frame_size]
            offset += HEADER_SIZE + frame_size

            msg_type = STREAM_TYPE_MAP.get(stream_byte)
            if msg_type is None:
                continue

            text = payload.decode("utf-8", errors="replace")
            results.append((msg_type, text))

        return results

    def _build_command(self, language: str, code: str) -> list[str]:
        """
        Build the container command that injects code via sh -c.
        No temp files are written to the host filesystem.
        """
        quoted_code = shlex.quote(code)
        commands = {
            "python": f"python3 -c {quoted_code}",
            "javascript": f"node -e {quoted_code}",
        }
        return ["sh", "-c", commands[language]]

    def _resolve_image(self, language: str) -> str:
        """Resolve language key to Docker image name. Raises ValueError for unsupported languages."""
        if language not in LANGUAGE_IMAGES:
            raise ValueError(
                f"Unsupported language: {language}. Supported: {', '.join(LANGUAGE_IMAGES)}"
            )
        return LANGUAGE_IMAGES[language]
