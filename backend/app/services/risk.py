"""Demonstration geometry; not calibrated for mobility safety."""
import math


def projected_risk(x: float, z: float, vx: float, vz: float,
                   obstacle_x: float, obstacle_z: float, radius: float = .6,
                   horizon: float = 2) -> str:
    values = (x, z, vx, vz, obstacle_x, obstacle_z, radius, horizon)
    if not all(math.isfinite(v) for v in values) or radius <= 0 or horizon <= 0:
        raise ValueError('Finite geometry and positive radius/horizon required.')
    dx, dz = obstacle_x - x, obstacle_z - z
    if math.hypot(dx, dz) <= radius:
        return 'high'
    speed_squared = vx * vx + vz * vz
    if speed_squared <= 1e-8:
        return 'caution'
    time = (dx * vx + dz * vz) / speed_squared
    closest = math.hypot(dx - vx * time, dz - vz * time)
    return 'high' if 0 <= time <= horizon and closest <= radius else 'caution'
