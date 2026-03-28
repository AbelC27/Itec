"""Unit tests for DockerIsolationManager._stream_logs and _read_log_chunks."""

import asyncio
import struct
import time
from unittest.mock import MagicMock

import pytest

from docker_manager import DockerIsolationManager


def _make_frame(stream_type: int, payload: bytes) -> bytes:
    """Build a Docker multiplexed log frame: 8-byte header + payload."""
    header = bytes([stream_type, 0, 0, 0]) + struct.pack(">I", len(payload))
    return header + payload


class TestReadLogChunks:
    """Tests for the static _read_log_chunks helper."""

    def _mock_container(self, frames: list[bytes]):
        """Create a mock container whose .logs() yields the given byte chunks."""
        container = MagicMock()
        container.logs.return_value = iter(frames)
        return container

    def test_single_stdout_frame(self):
        payload = b"Hello, world!\n"
        frame = _make_frame(1, payload)
        container = self._mock_container([frame])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stdout", "Hello, world!\n")]
        container.logs.assert_called_once_with(
            stream=True, follow=True, stdout=True, stderr=True
        )

    def test_single_stderr_frame(self):
        payload = b"Error occurred\n"
        frame = _make_frame(2, payload)
        container = self._mock_container([frame])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stderr", "Error occurred\n")]

    def test_mixed_stdout_and_stderr(self):
        frames = [
            _make_frame(1, b"line 1\n"),
            _make_frame(2, b"warning\n"),
            _make_frame(1, b"line 2\n"),
        ]
        container = self._mock_container(frames)

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [
            ("stdout", "line 1\n"),
            ("stderr", "warning\n"),
            ("stdout", "line 2\n"),
        ]

    def test_multiple_frames_in_single_chunk(self):
        """Two frames concatenated into one byte chunk."""
        frame1 = _make_frame(1, b"first")
        frame2 = _make_frame(2, b"second")
        container = self._mock_container([frame1 + frame2])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stdout", "first"), ("stderr", "second")]

    def test_frame_split_across_chunks(self):
        """A single frame delivered in two separate chunks."""
        frame = _make_frame(1, b"split payload")
        mid = len(frame) // 2
        container = self._mock_container([frame[:mid], frame[mid:]])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stdout", "split payload")]

    def test_empty_stream(self):
        container = self._mock_container([])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == []

    def test_deadline_stops_reading(self):
        """Deadline in the past should stop immediately."""
        frames = [_make_frame(1, b"should not appear")]
        container = self._mock_container(frames)

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() - 1  # already expired
        )

        assert result == []

    def test_unknown_stream_type_skipped(self):
        """Stream types other than 1 or 2 are silently skipped."""
        frames = [
            _make_frame(0, b"unknown"),
            _make_frame(1, b"valid"),
            _make_frame(3, b"also unknown"),
        ]
        container = self._mock_container(frames)

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stdout", "valid")]

    def test_empty_payload_frame(self):
        frame = _make_frame(1, b"")
        container = self._mock_container([frame])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert result == [("stdout", "")]

    def test_utf8_decode_with_replacement(self):
        """Invalid UTF-8 bytes should be replaced, not raise."""
        payload = b"hello \xff\xfe world"
        frame = _make_frame(1, payload)
        container = self._mock_container([frame])

        result = DockerIsolationManager._read_log_chunks(
            container, deadline=time.time() + 10
        )

        assert len(result) == 1
        assert result[0][0] == "stdout"
        assert "hello" in result[0][1]
        assert "world" in result[0][1]


class TestStreamLogs:
    """Tests for the async _stream_logs method."""

    @pytest.mark.asyncio
    async def test_stream_logs_calls_send_correctly(self):
        frames = [
            _make_frame(1, b"out\n"),
            _make_frame(2, b"err\n"),
        ]
        container = MagicMock()
        container.logs.return_value = iter(frames)

        sent: list[tuple[str, str]] = []

        async def mock_send(msg_type: str, data) -> None:
            sent.append((msg_type, data))

        manager = DockerIsolationManager.__new__(DockerIsolationManager)
        await manager._stream_logs(container, mock_send, deadline=time.time() + 10)

        assert sent == [("stdout", "out\n"), ("stderr", "err\n")]

    @pytest.mark.asyncio
    async def test_stream_logs_empty_stream(self):
        container = MagicMock()
        container.logs.return_value = iter([])

        sent: list[tuple[str, str]] = []

        async def mock_send(msg_type: str, data) -> None:
            sent.append((msg_type, data))

        manager = DockerIsolationManager.__new__(DockerIsolationManager)
        await manager._stream_logs(container, mock_send, deadline=time.time() + 10)

        assert sent == []
