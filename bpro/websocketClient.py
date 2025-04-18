#Author: Paul Estrada
#Email: paul257@ohs.stanford.edu
#URL: https://github.com/r0adki110/Better-Pronto

from .readjson import * 
import json, asyncio, requests, websockets, threading
from typing import Dict, Optional, Callable
import sys

class WebSocketClient:
    def __init__(self, api_base_url, access_token, on_event_callback):
        self.api_base_url = api_base_url.rstrip('/')
        self.access_token = access_token
        self.on_event_callback = on_event_callback  # function to call with parsed JSON events
        self.active_connections = {}  # Store active connections by bubble_id
        self.running = True
        self.loop = None
        
        # Read bubble metadata
        self.readjson = ReadJSON()
        auth_path, chats_path, bubbles_path, self.loginTokenJSONPath, self.authTokenJSONPath, \
        self.verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, \
        self.settingsJSONPath, self.keysJSONPath, self.bubbleOverviewJSONPath, users_path = createappfolders()
        
        print(f"WebSocketClient initialized for API: {api_base_url}")

    def _auth_payload(self, socket_id, bubble_id, channelcode):
        return {
            "event": "pusher:subscribe",
            "data": {
                "channel": f"private-bubble.{bubble_id}.{channelcode}",
                "auth": self._get_auth(socket_id, bubble_id, channelcode)
            }
        }

    def _get_auth(self, socket_id, bubble_id, channelcode):
        url = f"{self.api_base_url}/api/v1/pusher.auth"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.access_token}"}
        resp = requests.post(url, headers=headers, json={
            "socket_id": socket_id, 
            "channel_name": f"private-bubble.{bubble_id}.{channelcode}"
        })
        resp.raise_for_status()
        return resp.json().get("auth", "")

    async def _connect_to_bubble(self, bubble_id, channelcode):
        """Connect to a specific bubble's websocket channel"""
        uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
        
        reconnect_attempts = 0
        max_reconnect_attempts = 5
        
        while self.running and reconnect_attempts < max_reconnect_attempts:
            try:
                async with websockets.connect(uri, open_timeout=20) as ws:
                    print(f"WebSocket connected to {uri} for bubble {bubble_id}")
                    reconnect_attempts = 0  # Reset counter on successful connection
                    
                    # Handle connection initialization
                    msg = await ws.recv()
                    init = json.loads(msg)
                    sid = json.loads(init.get("data","{}")).get("socket_id")
                    await ws.send(json.dumps(self._auth_payload(sid, bubble_id, channelcode)))
                    print(f"Subscribed to channel: private-bubble.{bubble_id}.{channelcode}")
                    
                    # Event handling loop
                    while self.running:
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=30)  # Add timeout to detect stale connections
                            if raw == "ping":
                                await ws.send("pong")
                            else:
                                try:
                                    event = json.loads(raw)
                                    # Debug important events
                                    event_type = event.get("event", "")
                                    if "UserTyping" in event_type or "Stopped" in event_type:
                                        print(f"Typing event: {event_type} for bubble {bubble_id}")
                                    
                                    # Add bubble_id to event data for routing
                                    event["_bubble_id"] = bubble_id
                                    
                                    # Send event to handler callback
                                    if self.on_event_callback:
                                        self.on_event_callback(event)
                                except json.JSONDecodeError:
                                    pass
                        except asyncio.TimeoutError:
                            # Send heartbeat to keep connection alive
                            await ws.send(json.dumps({"event": "pusher:ping"}))
            except Exception as e:
                if not self.running:
                    print(f"WebSocket for bubble {bubble_id} shutting down")
                    break
                    
                print(f"WebSocket connection error for bubble {bubble_id}: {e}")
                reconnect_attempts += 1
                wait_time = min(30, 2 ** reconnect_attempts)
                print(f"Reconnecting in {wait_time} seconds... (attempt {reconnect_attempts})")
                await asyncio.sleep(wait_time)
        
        if reconnect_attempts >= max_reconnect_attempts:
            print(f"Max reconnection attempts reached for bubble {bubble_id}. Giving up.")
        
        # Remove from active connections when done
        if bubble_id in self.active_connections:
            del self.active_connections[bubble_id]

    def connect_to_bubble(self, bubble_id):
        """Start a connection to a bubble (or reuse existing)"""
        if not bubble_id:
            print("Invalid bubble_id, cannot connect")
            return False
            
        if bubble_id in self.active_connections:
            print(f"Already connected to bubble {bubble_id}")
            return True
            
        # Get channel code for the bubble
        try:
            channelcode = self.readjson.get_channelcodes(self.bubbleOverviewJSONPath, bubble_id)
            if not channelcode:
                print(f"No channel code found for bubble {bubble_id}")
                return False
                
            print(f"Connecting to bubble {bubble_id} with channel code {channelcode}")
            
            # Always create a new event loop for the thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            self.loop = loop
            
            # Create a new thread to run the connection
            def run_connection():
                try:
                    self.loop.run_until_complete(self._connect_to_bubble(bubble_id, channelcode))
                except Exception as e:
                    print(f"WebSocket connection thread error: {e}")
                    
            # Start the thread
            thread = threading.Thread(target=run_connection)
            thread.daemon = True
            thread.start()
            
            # Store thread in active connections
            self.active_connections[bubble_id] = thread
            return True
            
        except Exception as e:
            print(f"Error connecting to bubble {bubble_id}: {e}")
            import traceback
            print(traceback.format_exc())
            return False
        
    def disconnect_from_bubble(self, bubble_id):
        """Disconnect from a specific bubble"""
        if bubble_id in self.active_connections:
            print(f"Disconnecting from bubble {bubble_id}")
            thread = self.active_connections.pop(bubble_id)
            if thread.is_alive():
                self.running = False
            return True
        return False
        
    def stop_all(self):
        """Stop all connections"""
        self.running = False
        for bubble_id, thread in list(self.active_connections.items()):
            print(f"Stopping connection to bubble {bubble_id}")
            if thread.is_alive():
                self.running = False
        self.active_connections.clear()