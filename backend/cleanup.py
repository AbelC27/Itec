import asyncio
import logging

import docker

logger = logging.getLogger(__name__)

CONTAINER_LABEL = {"app": "itecify-execution"}


class ContainerCleanupService:
    """Removes orphaned execution containers as a safety net."""

    def __init__(self) -> None:
        self.client = docker.from_env()

    async def cleanup_orphans(self) -> int:
        """Find and force-remove any containers with the execution label.

        Returns the number of containers removed.
        """
        containers = await asyncio.to_thread(
            self.client.containers.list,
            all=True,
            filters={"label": "app=itecify-execution"},
        )

        removed = 0
        for container in containers:
            try:
                await asyncio.to_thread(container.remove, force=True)
                logger.info("Removed orphaned container %s", container.short_id)
                removed += 1
            except Exception:
                logger.warning(
                    "Failed to remove container %s", container.short_id, exc_info=True
                )

        if removed:
            logger.info("Cleaned up %d orphaned container(s)", removed)

        return removed
