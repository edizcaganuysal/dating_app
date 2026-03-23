"""
Geographic utility functions for distance calculation and bounding box filtering.
Uses Haversine formula — no PostGIS needed.
"""

import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two lat/lng points."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bounding_box(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """
    Return (min_lat, max_lat, min_lon, max_lon) for a rough bounding box.
    Used as a fast SQL pre-filter before precise Haversine calculation.
    """
    delta_lat = radius_km / 111.0
    delta_lon = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    return (lat - delta_lat, lat + delta_lat, lon - delta_lon, lon + delta_lon)
