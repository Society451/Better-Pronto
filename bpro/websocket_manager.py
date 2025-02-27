import asyncio
import json
import websockets
import requests
from colorama import init, Fore, Style
import sys
import os

# Add the parent directory to sys.path to allow direct imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Import websocketParsing directly
from bpro.websocketParsing import parse_event  # Change to direct import

init()  # Initialize colorama

class WebSocketManager:
    def __init__(self, access_token, user_id):
        self.access_token = access_token
        self.user_id = user_id
        self.api_base_url = "https://stanfordohs.pronto.io/"
        self.uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
        self.active_connections = {}
        self.message_callbacks = []

    def add_message_callback(self, callback):
        """Add a callback function to be called when messages are received"""
        self.message_callbacks.append(callback)

    async def connect_to_bubble(self, bubble_id, channelcode):
        """Connect to a specific bubble's websocket channel"""
        if bubble_id in self.active_connections:
            print(f"{Fore.YELLOW}[WebSocket] Already connected to bubble {bubble_id}{Style.RESET_ALL}")
            return

        try:
            print(f"{Fore.CYAN}[WebSocket] Connecting to bubble {bubble_id}{Style.RESET_ALL}")
            websocket = await websockets.connect(self.uri)
            response = await websocket.recv()
            data = json.loads(response)
            
            if "data" in data:
                inner_data = json.loads(data["data"])
                socket_id = inner_data.get("socket_id")
                
                if socket_id:
                    auth = await self._authenticate_bubble(bubble_id, channelcode, socket_id)
                    
                    subscribe_data = {
                        "event": "pusher:subscribe",
                        "data": {
                            "channel": f"private-bubble.{bubble_id}.{channelcode}",
                            "auth": auth
                        }
                    }
                    
                    await websocket.send(json.dumps(subscribe_data))
                    self.active_connections[bubble_id] = websocket
                    
                    # Start listening for messages in a separate task
                    asyncio.create_task(self._listen_to_messages(websocket, bubble_id))
                    print(f"{Fore.GREEN}[WebSocket] Successfully connected to bubble {bubble_id}{Style.RESET_ALL}")
                else:
                    print(f"{Fore.RED}[WebSocket] No socket_id received{Style.RESET_ALL}")

        except Exception as e:
            print(f"{Fore.RED}[WebSocket] Connection error for bubble {bubble_id}: {e}{Style.RESET_ALL}")
            raise

    async def _authenticate_bubble(self, bubble_id, channelcode, socket_id):
        """Authenticate with the bubble's channel"""
        try:
            url = f"{self.api_base_url}api/v1/pusher.auth"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}"
            }
            data = {
                "socket_id": socket_id,
                "channel_name": f"private-bubble.{bubble_id}.{channelcode}"
            }
            
            print(f"{Fore.CYAN}[WebSocket] Authenticating bubble {bubble_id}{Style.RESET_ALL}")
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            auth_token = response.json().get("auth")
            print(f"{Fore.GREEN}[WebSocket] Authentication successful{Style.RESET_ALL}")
            return auth_token

        except Exception as e:
            print(f"{Fore.RED}[WebSocket] Authentication error: {e}{Style.RESET_ALL}")
            raise

    async def _listen_to_messages(self, websocket, bubble_id):
        """Listen for messages on the websocket connection"""
        try:
            print(f"\n[WebSocket] {Fore.GREEN}Connected to bubble {bubble_id}{Style.RESET_ALL}")
            async for message in websocket:
                if message == "ping":
                    await websocket.send("pong")
                    continue

                try:
                    # Parse message and extract event data
                    message_data = json.loads(message)
                    event_type = message_data.get("event", "")
                    event_data = message_data.get("data", "{}")
                    
                    if isinstance(event_data, str):
                        event_data = json.loads(event_data)
                    
                    # Create a properly formatted message for the frontend
                    formatted_message = {
                        "type": event_type,
                        "data": event_data,
                        "bubble_id": bubble_id
                    }

                    # Log parsed event details
                    if not any(x in event_type for x in ['UserTyping', 'UserStoppedTyping']):
                        print(f"\n[WebSocket] {Fore.CYAN}Parsed message:", json.dumps(formatted_message, indent=2), Style.RESET_ALL)
                    
                    # Forward to frontend callbacks
                    for callback in self.message_callbacks:
                        await callback(bubble_id, formatted_message)

                except json.JSONDecodeError as e:
                    print(f"{Fore.RED}[WebSocket] JSON decode error: {e}{Style.RESET_ALL}")
                except Exception as e:
                    print(f"{Fore.RED}[WebSocket] Error processing message: {e}{Style.RESET_ALL}")

        except websockets.exceptions.ConnectionClosed:
            print(f"{Fore.YELLOW}[WebSocket] Connection closed for bubble {bubble_id}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}[WebSocket] Error in listener: {e}{Style.RESET_ALL}")
        finally:
            if bubble_id in self.active_connections:
                del self.active_connections[bubble_id]

    async def disconnect_from_bubble(self, bubble_id):
        """Disconnect from a bubble's websocket channel"""
        if bubble_id in self.active_connections:
            await self.active_connections[bubble_id].close()
            del self.active_connections[bubble_id]

    def is_connected_to_bubble(self, bubble_id):
        """Check if currently connected to a bubble"""
        return bubble_id in self.active_connections
