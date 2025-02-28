import asyncio
import websockets

# super clean websocket manager other scripts can use 
# courtesy for wonderful gpt saving me hours here

async def connect(self):
    """Connects to the WebSocket server and retrieves the socket ID if available."""
    if self.connection is None or self.connection.closed:
        self.connection = await websockets.connect(self.url)
        self.running = True
        asyncio.create_task(self.listen())
        # Try to fetch the socket ID
        await self.fetch_socket_id()
async def listen(self):
    """Listens for incoming messages and updates the socket ID if found."""
    while self.running:
        try:
            response = await self.connection.recv()
            print(f"Received: {response}")
            data = json.loads(response)
            if "data" in data:
                inner_data = json.loads(data["data"])
                self.socket_id = inner_data.get("socket_id", None)
            # Notify listeners
            for listener in self.listeners:
                asyncio.create_task(listener(response))
        except websockets.ConnectionClosed:
            self.running = False
            break
async def send(self, message):
    """Sends a message through the WebSocket."""
    if self.connection and not self.connection.closed:
        await self.connection.send(message)
async def fetch_socket_id(self):
    """Waits until the socket ID is received from the WebSocket."""
    while self.socket_id is None:
        await asyncio.sleep(0.1)  # Small delay to avoid busy-waiting
def get_socket_id(self):
    """Returns the socket ID if available."""
    return self.socket_id
def register_listener(self, callback):
    """Allows external scripts to listen to messages."""
    self.listeners.append(callback)
async def close(self):
    """Closes the WebSocket connection."""
    self.running = False
    if self.connection:
        await self.connection.close()

# global instance
websocket_manager = WebSocketManager("wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false")