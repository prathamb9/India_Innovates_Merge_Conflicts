"""
A* routing engine backed by a NetworkX DiGraph.
Graph is loaded from PostgreSQL on startup and kept hot in memory.
Live traffic weights are fetched from Redis per request.
"""
from typing import Dict, List, Optional, Tuple
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Intersection, Road
from app.redis_client import redis_get, traffic_key
from app.schemas.route import RouteNode, RouteCalculateResponse
import structlog

log = structlog.get_logger(__name__)

# Singleton DiGraph  rebuilt on startup
_graph: nx.DiGraph = nx.DiGraph()
_intersection_meta: Dict[int, dict] = {}


async def build_graph(db: AsyncSession) -> None:
    """Load intersections and roads from DB into the in-memory graph."""
    global _graph, _intersection_meta
    g = nx.DiGraph()

    nodes = (await db.execute(select(Intersection).where(Intersection.is_active == True))).scalars().all()
    for n in nodes:
        g.add_node(n.id, name=n.name, lat=n.lat, lng=n.lng,
                   default_green=n.default_green, city=n.city)
        _intersection_meta[n.id] = {"name": n.name, "lat": n.lat, "lng": n.lng}

    roads = (await db.execute(select(Road))).scalars().all()
    for r in roads:
        # Base weight = travel time in seconds at speed limit
        base_weight = (r.distance_m / 1000) / r.speed_limit_kmh * 3600
        g.add_edge(r.from_intersection_id, r.to_intersection_id,
                   distance_m=r.distance_m, base_weight=base_weight)
        if r.is_bidirectional:
            g.add_edge(r.to_intersection_id, r.from_intersection_id,
                       distance_m=r.distance_m, base_weight=base_weight)

    _graph = g
    log.info("Routing graph built", nodes=g.number_of_nodes(), edges=g.number_of_edges())


def _haversine_heuristic(u: int, v: int) -> float:
    """A* heuristic: straight-line time in seconds (optimistic lower-bound)."""
    import math
    meta = _intersection_meta
    if u not in meta or v not in meta:
        return 0
    lat1, lng1 = meta[u]["lat"], meta[u]["lng"]
    lat2, lng2 = meta[v]["lat"], meta[v]["lng"]
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    dist_m = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    # Assume 50 km/h  13.9 m/s for heuristic
    return dist_m / 13.9


async def _live_weight(node_id: int, base_weight: float, vehicle_type: str) -> Tuple[float, float]:
    """Get combined edge weight factoring in live traffic + signal delay."""
    traffic = await redis_get(traffic_key(node_id)) or {}
    density = traffic.get("density_pct", 20)

    # Traffic multiplier: 1.0 at 0%, up to 3.0 at 100%
    traffic_factor = 1.0 + (density / 100) * 2.0

    # Emergency vehicles ignore most signal delay (they preempt)
    signal_delay = 0.0
    if vehicle_type == "standard":
        from app.redis_client import redis_get as rg, signal_key as sk
        sig = await rg(sk(node_id)) or {}
        state = sig.get("state", "NORMAL")
        if state == "NORMAL":
            signal_delay = traffic.get("signal_delay_sec", 15.0)
        elif state == "AI_DYNAMIC":
            signal_delay = traffic.get("signal_delay_sec", 15.0) * 0.6

    weight = (base_weight * traffic_factor) + signal_delay
    return weight, signal_delay


class RoutingEngine:

    @staticmethod
    async def calculate(
        origin_id: int,
        dest_id: int,
        vehicle_type: str = "standard",
        consider_traffic: bool = True,
    ) -> RouteCalculateResponse:
        if not _graph.has_node(origin_id) or not _graph.has_node(dest_id):
            raise ValueError("Origin or destination intersection not in graph")

        # Build live weight graph snapshot
        weighted = nx.DiGraph()
        for u, v, data in _graph.edges(data=True):
            bw = data["base_weight"]
            if consider_traffic:
                weight, delay = await _live_weight(v, bw, vehicle_type)
            else:
                weight, delay = bw, 0.0
            weighted.add_edge(u, v, weight=weight, distance_m=data["distance_m"], signal_delay=delay)
        for n, d in _graph.nodes(data=True):
            weighted.add_node(n, **d)

        try:
            path_ids = nx.astar_path(weighted, origin_id, dest_id,
                                     heuristic=_haversine_heuristic, weight="weight")
        except nx.NetworkXNoPath:
            raise ValueError("No path found between the given intersections")

        # Build response
        total_dist = 0.0
        total_time = 0.0
        nodes: List[RouteNode] = []
        for i, nid in enumerate(path_ids):
            meta = _intersection_meta.get(nid, {})
            wait = 0.0
            if i < len(path_ids) - 1:
                edge = weighted.edges[nid, path_ids[i + 1]]
                total_dist += edge["distance_m"]
                total_time += edge["weight"]
                wait = edge["signal_delay"]
            nodes.append(RouteNode(
                intersection_id=nid,
                name=meta.get("name", f"Node {nid}"),
                lat=meta.get("lat", 0.0),
                lng=meta.get("lng", 0.0),
                estimated_wait_sec=wait,
            ))

        return RouteCalculateResponse(
            path=nodes,
            total_distance_m=round(total_dist, 1),
            estimated_duration_sec=round(total_time, 1),
        )
