import websockets         # Import the websockets library for websocket communications
import asyncio            # Import asyncio for asynchronous programming
import json               # Import json for parsing and generating JSON data
import requests           # Import requests for making HTTP requests
import sys                # Import sys module for system-specific parameters and functions
from bpro.readjson import * 

api_base_url = "https://stanfordohs.pronto.io/"

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
# UPDATED: Retrieve access token instead of an empty string.
accesstoken = getaccesstoken(authTokenJSONPath)
user_info = get_clientUserInfo(authTokenJSONPath)
user_id = user_info["id"] if user_info else None
print(f"User ID: {user_id}")

chat_link = input("Enter the LINK of the chat you'd like to websocket into (or the last 7 digits, 4066670 for the 'Better Pronto Dev Team'): ")
# Extract the last 7 characters of the chat link to obtain the bubble_id
bubble_id = chat_link[-7:]

# Check if bubble_id consists only of digits to verify it's valid
if bubble_id.isdigit():
    print("Chat Registered")  # If valid, print confirmation
else:
    print("Error: Not a valid link.")  # If not, print error message
    sys.exit()  # Exit the program

# Set up HTTP request headers with JSON content type and authorization using the access token
headers = {
 "Content-Type": "application/json",
 "Authorization": f"Bearer {accesstoken}",
}

# Ask the user to input the bubble's secure chat ID
bubble_sid = input("Enter the Secure Chat ID (dRRIOchii2zlTboeIW12ARtDz6eANFO9Pux16dmX is the one for the 'Better Pronto Dev Team')")

# Define a function to handle chat authentication over websocket
def chat_auth(bubble_id, bubble_sid, socket_id):
    # Construct the URL for Pusher authentication
    url = f"{api_base_url}api/v1/pusher.auth"

    # Prepare the data payload you will send, specifying the socket id and channel name
    data = {
         "socket_id": socket_id,
         "channel_name": f"private-bubble.{bubble_id}.{bubble_sid}"
    }

    # Make a POST request to the authentication endpoint with the headers and JSON payload
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Raise an error if the request was unsuccessful
    # Extract the 'auth' key from the JSON response
    bubble_auth = response.json().get("auth")
    print("Bubble Connection Established.")  # Confirm that the chat authentication was successful
    print(f"Bubble Auth: {bubble_auth}")  # Print the bubble authorization token
    return bubble_auth  # Return the bubble authorization token

# Define a function to initiate the websocket connection and start listening for messages
def start_push(bubble_id, bubble_sid):
    # Define an asynchronous function to connect and listen
    async def connect_and_listen():
         # Set the URI for Pusher websocket connection with required parameters
         uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"

         # Open a websocket connection to the specified URI
         async with websockets.connect(uri) as websocket:
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
                    data = {
                         "event": "pusher:subscribe",
                         "data": {
                              "channel": f"private-bubble.{bubble_id}.{bubble_sid}",
                              "auth": str(chat_auth(bubble_id, bubble_sid, socket_id))
                         }
                    }

                    # Send the subscription message to the websocket server
                    await websocket.send(json.dumps(data))

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
                         print(f"Received: {message}")

    # Define the main async function that initiates connection and listening
    async def main():
         await connect_and_listen()  # Await the connect and listen function

    # Run the main asynchronous function using asyncio's event loop
    asyncio.run(main())

# Start the websocket push using given bubble_id and bubble_sid values
start_push(bubble_id, bubble_sid)