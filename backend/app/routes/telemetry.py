import asyncio
from contextlib import suppress
from datetime import datetime, timezone
from math import cos, sin

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..config import Settings
from ..models.pose import PoseUpdate
from ..services.demo import demo_observation
from ..services.risk import projected_risk
from ..models.status import DemoHazard, HazardUpdate, SystemStatus

router = APIRouter()


@router.websocket("/ws/demo")
async def demo_positions(socket: WebSocket):
    if not Settings().demo_enabled:
        await socket.close(code=1008)
        return
    await socket.accept()

    async def produce():
        sequence = 0
        while True:
            event = PoseUpdate(
                sequence=sequence, timestamp=datetime.now(timezone.utc),
                x=round(2 * sin(sequence / 8), 3),
                z=round(2 * cos(sequence / 8), 3),
            )
            await socket.send_text(event.model_dump_json())
            if sequence % 5 == 0:
                await socket.send_text(demo_observation().model_dump_json())
            risk = projected_risk(event.x, event.z, .25 * cos(sequence / 8), -.25 * sin(sequence / 8), 0, 2)
            await socket.send_text(HazardUpdate(timestamp=event.timestamp, hazards=[
                DemoHazard(id='demo-obstacle', x=0, z=2, radius_m=.6, severity=risk)
            ]).model_dump_json())
            await socket.send_text(SystemStatus(timestamp=event.timestamp, localization='active', perception='active').model_dump_json())
            sequence += 1
            await asyncio.sleep(1)

    async def watch_disconnect():
        while True:
            await socket.receive_text()

    tasks = [asyncio.create_task(produce()), asyncio.create_task(watch_disconnect())]
    try:
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.result()
    except (WebSocketDisconnect, OSError):
        pass
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError, WebSocketDisconnect, OSError):
                await task
