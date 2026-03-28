import asyncio
import shlex
import struct
import time

import docker

from schemas import LANGUAGE_IMAGES, ResourceEstimate, SendCallback
from ai_analyzer import analyze


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

            # Stream logs until container exits or deadline is reached
            await self._stream_logs(container, send, deadline)

            # Check if the container is still running after streaming
            await asyncio.to_thread(container.reload)
            status = container.status

            if status == "running":
                # Timeout: container still running past deadline — force kill
                await asyncio.to_thread(container.kill)
                await send("error", "Timeout reached")
            else:
                # Container exited normally — get exit code and execution time
                result = await asyncio.to_thread(container.wait)
                exit_code = result.get("StatusCode", -1)
                execution_time = round(time.time() - start_time, 3)
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

        log_stream = container.logs(
            stream=True, follow=True, stdout=True, stderr=True
        )

        buf = b""
        for chunk in log_stream:
            if time.time() >= deadline:
                break

            buf += chunk

            # Process as many complete frames as possible from the buffer
            while len(buf) >= HEADER_SIZE:
                if time.time() >= deadline:
                    break

                # Parse the 8-byte header
                stream_byte = buf[0]
                frame_size = struct.unpack(">I", buf[4:8])[0]

                # Wait for the full frame payload to arrive
                if len(buf) < HEADER_SIZE + frame_size:
                    break

                payload = buf[HEADER_SIZE : HEADER_SIZE + frame_size]
                buf = buf[HEADER_SIZE + frame_size :]

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
