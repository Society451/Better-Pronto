#Author: Paul Estrada
#Email: paul257@ohs.stanford.edu
#URL: https://github.com/r0adki110/Better-Pronto

from .readjson import * 
import json, asyncio, requests, websockets

api_base_url = "https://stanfordohs.pronto.io/"

readjson = ReadJSON()

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
accesstoken = readjson.getaccesstoken(authTokenJSONPath)
print(f"Access token: {accesstoken[:5]}...{accesstoken[-5:]}")
user_info = readjson.get_clientUserInfo(authTokenJSONPath)
user_id = user_info["id"] if user_info else None
print(f"User ID: {user_id}")
bubble_id = "4209040"
print(f"Bubble ID: {bubble_id}")
# 3640189 for bulletin
# 4209040 for oocc
# 3775720 for OHSMP
# Check if bubble_id consists only of digits to verify it's valid

# NEW: Retrieve channelcode automatically using get_channelcodes.
channelcode = readjson.get_channelcodes(bubbleOverviewJSONPath, bubble_id)
if not channelcode:
    print(f"No channelcode found for bubble id {bubble_id}.")

class WebSocketClient:
    def __init__(self, api_base_url, access_token, bubble_id, channelcode, on_event):
        self.api_base_url = api_base_url.rstrip('/')
        self.access_token = access_token
        self.bubble_id = bubble_id
        self.channelcode = channelcode
        self.on_event = on_event  # function to call with parsed JSON event
        self.connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        print(f"WebSocketClient initialized for bubble {bubble_id}")

    def _auth_payload(self, socket_id):
        return {
            "event": "pusher:subscribe",
            "data": {
                "channel": f"private-bubble.{self.bubble_id}.{self.channelcode}",
                "auth": self._get_auth(socket_id)
            }
        }

    def _get_auth(self, socket_id):
        url = f"{self.api_base_url}/api/v1/pusher.auth"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.access_token}"}
        resp = requests.post(url, headers=headers, json={"socket_id": socket_id, "channel_name": f"private-bubble.{self.bubble_id}.{self.channelcode}"})
        resp.raise_for_status()
        return resp.json().get("auth", "")

    async def _connect(self, uri):
        try:
            async with websockets.connect(uri, open_timeout=20) as ws:
                self.connected = True
                self.reconnect_attempts = 0
                print(f"WebSocket connected to {uri}")
                
                # Handle connection initialization
                msg = await ws.recv()
                init = json.loads(msg)
                sid = json.loads(init.get("data","{}")).get("socket_id")
                await ws.send(json.dumps(self._auth_payload(sid)))
                print(f"Subscribed to channel: private-bubble.{self.bubble_id}.{self.channelcode}")
                
                # Event handling loop
                async for raw in ws:
                    if raw == "ping":
                        await ws.send("pong")
                    else:
                        try:
                            event = json.loads(raw)
                            # Debug important events
                            event_type = event.get("event", "")
                            if "UserTyping" in event_type or "Stopped" in event_type:
                                print(f"Typing event: {event_type}")
                            
                            # Send event to handler callback
                            if self.on_event:
                                self.on_event(event)
                        except json.JSONDecodeError:
                            pass
        except Exception as e:
            self.connected = False
            print(f"WebSocket connection error: {e}")
            if self.reconnect_attempts < self.max_reconnect_attempts:
                self.reconnect_attempts += 1
                wait_time = min(30, 2 ** self.reconnect_attempts)
                print(f"Reconnecting in {wait_time} seconds... (attempt {self.reconnect_attempts})")
                await asyncio.sleep(wait_time)
                await self._connect(uri)
            else:
                print("Max reconnection attempts reached. Giving up.")

    def start(self):
        uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
        print(f"Starting WebSocket connection to {uri}")
        try:
            asyncio.run(self._connect(uri))
        except Exception as e:
            print(f"WebSocket error in start(): {e}")

def handle_event(event):
    print(f"Received event: {event}")

client = WebSocketClient(api_base_url, accesstoken, bubble_id, channelcode, handle_event)
client.start()