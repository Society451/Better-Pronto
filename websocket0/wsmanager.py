import asyncio
import websockets
import json

# Global WebSocket connection
ws_connection = None
listeners = []  # List of functions to handle messages
socket_id = None  # Store socket ID

async def connect(url):
    """Establishes a WebSocket connection and starts listening."""
    global ws_connection, socket_id
    if ws_connection is None or ws_connection.closed:
        ws_connection = await websockets.connect(url)
        asyncio.create_task(listen())

        # Extract socket ID only once, right after connection
        await fetch_socket_id()

async def listen():
    """Continuously listens for incoming messages and notifies listeners."""
    global ws_connection
    while True:
        try:
            message = await ws_connection.recv()
            data = json.loads(message)  # Convert JSON to dictionary

            # Notify all registered listeners
            for listener in listeners:
                asyncio.create_task(listener(data))

        except websockets.ConnectionClosed:
            print("WebSocket connection closed.")
            break
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {message}")

async def fetch_socket_id():
    """Waits for the initial message containing the socket ID."""
    global ws_connection, socket_id
    try:
        response = await ws_connection.recv()  # Get first message
        data = json.loads(response)

        if "data" in data:
            inner_data = json.loads(data["data"])
            socket_id = inner_data.get("socket_id")  # Extract socket ID once

        print(f"Socket ID: {socket_id}")  # Debugging

    except websockets.ConnectionClosed:
        print("WebSocket closed before socket ID was received.")
    except json.JSONDecodeError:
        print("Failed to parse JSON when fetching socket ID.")

async def send(message):
    """Sends a message through the WebSocket."""
    global ws_connection
    if ws_connection and not ws_connection.closed:
        await ws_connection.send(json.dumps(message))

def register_listener(callback):
    """Registers a function to handle incoming messages."""
    listeners.append(callback)

def get_socket_id():
    """Returns the stored WebSocket socket ID."""
    return socket_id

async def close():
    """Closes the WebSocket connection."""
    global ws_connection
    if ws_connection:
        await ws_connection.close()
        ws_connection = None
