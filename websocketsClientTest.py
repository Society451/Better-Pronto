import asyncio
import websockets

async def connect():
    uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
    async with websockets.connect(uri) as websocket:
        await websocket.send("Hello World!")
        response = await websocket.recv()
        print(f"Received: {response}")

asyncio.get_event_loop().run_until_complete(connect())

async def handle_messages(websocket):
    async for message in websocket:
        if message == "ping":
            await websocket.send("pong")
        else:
            print(f"Received: {message}")

async def connect_and_listen():
    uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
    async with websockets.connect(uri) as websocket:
        await handle_messages(websocket)

asyncio.get_event_loop().run_until_complete(connect_and_listen())

async def main():
    await asyncio.gather(
        connect_and_listen(),
        # Add other tasks if needed
    )

asyncio.run(main())