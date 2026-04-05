"""Geospatial helpers."""

from math import asin, cos, radians, sin, sqrt


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the great-circle distance in meters between two coordinates."""

    earth_radius_meters = 6371000
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    a = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return earth_radius_meters * c
