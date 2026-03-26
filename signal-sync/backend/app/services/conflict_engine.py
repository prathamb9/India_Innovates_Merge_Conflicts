"""
Priority-queue based conflict resolution engine.
Ensures that when multiple active corridors compete for the same intersection,
the highest-priority one wins the green signal.

Priority order (lower number = higher priority):
  1  Critical Ambulance  (trauma, cardiac)
  2  Fire Truck
  3  Standard Ambulance
  4  VVIP Convoy
"""
import heapq
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from app.models.corridor import Corridor, CorridorType
import structlog

log = structlog.get_logger(__name__)


@dataclass(order=True)
class QueueEntry:
    priority: int
    corridor_id: str = field(compare=False)
    corridor_type: str = field(compare=False)
    node_ids: List[int] = field(compare=False, default_factory=list)


class ConflictEngine:
    _queue: List[QueueEntry] = []
    # Map intersection_id -> winning corridor_id
    _intersection_owner: Dict[int, str] = {}

    @classmethod
    async def register(cls, corridor: Corridor) -> None:
        entry = QueueEntry(
            priority=corridor.priority_level,
            corridor_id=corridor.id,
            corridor_type=corridor.corridor_type.value,
            node_ids=list(corridor.node_ids),
        )
        heapq.heappush(cls._queue, entry)
        cls._recompute_owners()
        log.info("Corridor registered in conflict queue",
                 corridor_id=corridor.id, priority=corridor.priority_level)

    @classmethod
    async def deregister(cls, corridor_id: str) -> None:
        cls._queue = [e for e in cls._queue if e.corridor_id != corridor_id]
        heapq.heapify(cls._queue)
        cls._recompute_owners()
        log.info("Corridor deregistered from conflict queue", corridor_id=corridor_id)

    @classmethod
    def _recompute_owners(cls) -> None:
        """
        For each intersection claimed by any active corridor,
        assign ownership to the highest priority corridor (lowest priority number).
        """
        owners: Dict[int, QueueEntry] = {}
        for entry in cls._queue:
            for node_id in entry.node_ids:
                existing = owners.get(node_id)
                if existing is None or entry.priority < existing.priority:
                    owners[node_id] = entry
        cls._intersection_owner = {nid: e.corridor_id for nid, e in owners.items()}

    @classmethod
    def get_owner(cls, intersection_id: int) -> Optional[str]:
        """Return corridor_id that currently owns the given intersection."""
        return cls._intersection_owner.get(intersection_id)

    @classmethod
    def get_queue_snapshot(cls) -> List[dict]:
        return [
            {"corridor_id": e.corridor_id, "priority": e.priority, "type": e.corridor_type}
            for e in sorted(cls._queue)
        ]
