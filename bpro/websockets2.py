from readjson import * 
from websocketParsing import parse_event
import sys, json, asyncio, requests, websockets

api_base_url = "https://stanfordohs.pronto.io/"

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
accesstoken = getaccesstoken(authTokenJSONPath)
user_info = get_clientUserInfo(authTokenJSONPath)
user_id = user_info["id"] if user_info else None
print(f"User ID: {user_id}")
bubble_id = "4003845"
print(f"Bubble ID: {bubble_id}")
# 3640189 for bulletin
# 4003845 for oocc
# 3775720 for OHSMP
# Check if bubble_id consists only of digits to verify it's valid

# NEW: Retrieve channelcode automatically using get_channelcodes.
channelcode = get_channelcodes(bubbleOverviewJSONPath, bubble_id)
if not channelcode:
    print(f"No channelcode found for bubble id {bubble_id}.")

# Set up HTTP request headers with JSON content type and authorization using the access token

# Define a function to handle chat authentication over websocket
def chat_auth(bubble_id, channelcode, socket_id):
    # Construct the URL for Pusher authentication
    url = f"{api_base_url}api/v1/pusher.auth"

    # Prepare the data payload you will send, specifying the socket id and channel name
    data = {
         "socket_id": socket_id,
         "channel_name": f"private-bubble.{bubble_id}.{channelcode}"
    }
    headers = {
          "Content-Type": "application/json",
          "Authorization": f"Bearer {accesstoken}",
     }
    # Make a POST request to the authentication endpoint with the headers and JSON payload
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Raise an error if the request was unsuccessful
    # Extract the 'auth' key from the JSON response
    bubble_auth = response.json().get("auth")
    print("Bubble Connection Established.")  # Confirm that the chat authentication was successful
    print(f"Bubble Auth: {bubble_auth}")  # Print the bubble authorization token
    return bubble_auth  # Return the bubble authorization token

# NEW: Define a function that starts the websocket connection using the channelcode.
def start_push_with_channelcode(bubble_id):
    # Define an asynchronous function to connect and listen
    async def connect_and_listen():
         # Set the URI for Pusher websocket connection with required parameters
         uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
         # Open a websocket connection to the specified URI
         async with websockets.connect(uri, open_timeout=20) as websocket:
              # Wait for the initial connection message, which is expected to contain the socket_id
              response = await websocket.recv()
              print(f"Received: {response}")  # Print the received message
              # Parse the response JSON
              data = json.loads(response)
              if "data" in data:
                    # The 'data' field is itself a JSON string. Parse it to get inner data
                    inner_data = json.loads(data["data"])
                    # Extract the socket_id from the inner data if available
                    socket_id = inner_data.get("socket_id", None)
                    # Prepare a subscription message including the channel name and auth token
                    payload = {
                         "event": "pusher:subscribe",
                         "data": {
                              "channel": f"private-bubble.{bubble_id}.{channelcode}",
                              "auth": str(chat_auth(bubble_id, channelcode, socket_id))
                         }
                    }
                    # Send the subscription message to the websocket server
                    await websocket.send(json.dumps(payload))
                    # If socket_id is found, print it; otherwise, indicate that it was not found
                    if socket_id:
                         print(f"Socket ID: {socket_id}")
                    else:
                         print("Socket ID not found in response")
              # Enter a loop that continuously listens for messages from the websocket connection
              async for message in websocket:
                    # If the server sends a ping message, reply with pong for keeping the connection alive
                    if message == "ping":
                         await websocket.send("pong")  # Respond with pong to the ping
                    else:
                         # For any other type of message, print it out
                         parse_event(message)  # Parse the event message using the provided function

    # Define the main async function that initiates connection and listening
    async def main():
         await connect_and_listen()  # Await the connect and listen function

    # Run the main asynchronous function using asyncio's event loop
    asyncio.run(main())

start_push_with_channelcode(bubble_id)