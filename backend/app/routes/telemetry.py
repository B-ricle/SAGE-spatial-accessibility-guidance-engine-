"""An explicit demo stream, with no hardware or navigation side effects."""
import asyncio
from contextlib import suppress
from datetime import datetime, timezone
from math import cos, sin

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..models.pose import PoseUpdate

router = APIRouter()


@router.websocket("/ws/demo")
async def demo_positions(socket: WebSocket):
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
