import websocket
import json
import requests

# Define the WebSocket URL
url = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"

# Define your access token
api_base_url = "https://stanfordohs.pronto.io/"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {access_token}",
}


# Function to authenticate the subscription
def authenticate_channel(socket_id, channel_name):
    auth_url = f"{api_base_url}api/v1/pusher.auth"  # Replace with your backend URL
    payload = {
        "socket_id": socket_id,
        "channel_name": channel_name
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.post(auth_url, headers=headers, json=payload)
    response.raise_for_status()  # Check for HTTP errors
    return response.json().get("auth")

def on_message(ws, message):
    print(f"Received message: {message}")
    data = json.loads(message)
    
    if "event" in data and data["event"] == "pusher:connection_established":
        inner_data = json.loads(data["data"])
        socket_id = inner_data.get("socket_id")
        if socket_id:
            subscribe_to_channel(ws, socket_id)  # Pass ws and socket_id

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws):
    print("Connection closed")

def on_open(ws):
    print("Connection opened")

def subscribe_to_channel(ws, socket_id):
    channel_name = "private-organization.2245"  # The channel to subscribe to
    auth = authenticate_channel(socket_id, channel_name)

    subscribe_message = {
        "event": "pusher:subscribe",
        "data": {
            "channel": channel_name,
            "auth": auth  # Add the auth information here
        }
    }

    ws.send(json.dumps(subscribe_message))

# Create a WebSocketApp instance
ws = websocket.WebSocketApp(url,
                            on_message=on_message,
                            on_error=on_error,
                            on_close=on_close)

# Add the on_open method
ws.on_open = on_open

# Run the WebSocket
ws.run_forever()