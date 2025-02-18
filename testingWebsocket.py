import webview, os, json, re, time, uuid
from bpro.pronto import *
from bpro.systemcheck import *
from bpro.readjson import *

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
accesstoken = ""
user_info = get_clientUserInfo(authTokenJSONPath)
userID = user_info["id"] if user_info else None
print(f"User ID: {userID}")

def getLocalAccesstoken():
    global accesstoken
    accesstoken = getaccesstoken(authTokenJSONPath)
    if accesstoken:
        print(f"Access token: {accesstoken}")
    else:
        print("Access token not found or invalid")
getLocalAccesstoken()

import requests
import websockets
import asyncio
from datetime import datetime
import pytz


log_file_name = 'selfchat.json'
api_base_url = "https://stanfordohs.pronto.io/"
most_recent_id = None

stored_ids = []
message_id = None
num_search_per_page = 50
sendinthread = False
parentmessage_id = None
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {accesstoken}",
}

# info grabbers
def check_if_ok(response):
    response.raise_for_status()
def bubble_info(bubble_id, info):
    url = f"{api_base_url}api/v1/bubble.info"

    data = {
        "bubble_id": bubble_id,
    }

    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    infolist = response.json().get('bubble')
    piece = infolist.get(info)
    return piece
def user_info(info):
    url = f"{api_base_url}api/v1/user.info"
    data = {
        "user_id": '1',
    }
    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    infolist = response.json().get('user')
    piece = infolist.get(info)
    return piece
print("Getting User Info...")
user_id = user_info('id')

def send_message(message, chat, parent_id=None):
    global message_id
    unique_uuid = str(uuid.uuid4())
    now = datetime.now()
    messageCreatedat = now.strftime("%Y-%m-%d %H:%M:%S")

    if parent_id == None:
        data = {
        "id": "Null",
        "uuid": unique_uuid,
        "bubble_id": chat,
        "message": message,
        "created_at": messageCreatedat,
        "user_id": user_id,
        "messagemedia": []
    }
    else:
        data = {
            "id": "Null",
            "uuid": unique_uuid,
            "bubble_id": chat,
            "message": message,
            "created_at": messageCreatedat,
            "user_id": user_id,
            "messagemedia": [],
            "parentmessage_id": parent_id
        }

    url = f"{api_base_url}api/v1/message.create"
    response = requests.post(url, headers=headers, json=data)

    response_data = response.json()
    check_if_ok(response)

    message_id = response_data["message"]["id"]
    return message_id
def delete_message(message_id):
    data = {
        "message_id": str(message_id),
    }

    url = f"{api_base_url}api/v1/message.delete"
    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)

# parsing funsies (8+ hr to make work hAHhaHa im going insane)
def store_messages_in_log(message_data):
    try:
        # Open the file in read mode to check for existing logs, or create it if it doesn't exist
        try:
            with open(log_file_name, 'r') as file:
                logs = json.load(file)  # Load existing logs (as a dictionary)
        except FileNotFoundError:
            logs = {}

        message_id = message_data['id']
        rawmessagemedia = message_data['messagemedia']

        if message_id:
            if rawmessagemedia != []:
                rawmessagemedia_url = rawmessagemedia[0].get('url')
                messagemedia = rawmessagemedia_url.replace("files.chat.trypronto.com", 'stanfordohs.pronto.io')
                logs[message_id] = {
                    'user_name': message_data['user']['fullname'],
                    'message': message_data.get(messagemedia),
                    'timestamp': message_data.get('created_at')
                }
            else:
                logs[message_id] = {
                    'user_name': message_data['user']['fullname'],
                    'message': message_data.get('message'),
                    'timestamp': message_data.get('created_at')

                }
        else: print("msg not found")

        # Write the updated logs back to the file
        with open(log_file_name, 'w') as file:
            json.dump(logs, file, indent=4)

    except Exception as e:
        print(f"An error occurred: {e}")
def search_message_log(log_file_name, message_id):
    try:
        with open(log_file_name, 'r') as file:
            logs = json.load(file)

        # Check if logs is a dictionary
        if isinstance(logs, dict):
            # Convert message_id to string to match the dictionary key (JSON keys are strings)
            message_id_str = str(message_id)

            # Check if the message_id exists in the logs
            if message_id_str in logs:
                message_data = logs[message_id_str]  # Access the message data by message_id
                user_name = message_data['user_name']
                msg = message_data['message']

                # Get current time in that timezone
                current_time = datetime.now(pytz.utc)
                # Format the time to 'YYYY-MM-DD HH:MM:SS'
                formatted_time = current_time.strftime('%Y-%m-%d %H:%M:%S')

                print(f"\033[0m\033[1m\033[31mID: {message_id}   {formatted_time}")
                print(f"\033[0m\033[1m{user_name} deleted message: {msg}")

            else:
                print(f"Message with ID {message_id} not found.")
                return None  # Return None if message_id not found
        else:
            print("Log file format is incorrect. Expected a dictionary of messages.")
            return None  # Return None if the format isn't as expected

    except FileNotFoundError:
        print("The log file does not exist.")
        return None
    except json.JSONDecodeError:
        print("Error decoding the JSON file.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None
def parse_msg(parsed_data):
    msg = parsed_data['message']['message']
    message_data = parsed_data['message']
    user = message_data['user']
    store_messages_in_log(message_data)

    message_id = message_data['id']
    user_name = f"{user['firstname']} {user['lastname']}"
    date_created = message_data['created_at']
    rawmessagemedia = message_data['messagemedia']
    parentmessage_id = message_data['parentmessage_id']
    if parentmessage_id == None:
        print()
        print("\033[0m\033[1m\033[34mID: " + str(message_id), " ", date_created)
        print(f"\033[0m\033[1m{user_name}: {msg}")

    else:
        print()
        print(f"\033[0m\033[1m\033[34m[THREADED {parentmessage_id}] ID: " + str(message_id), " ", f"{date_created}")
        print(f"\033[0m\033[1m{user_name}: {msg}")

    most_recent_id = message_id

    if rawmessagemedia != []:
        rawmessagemedia_url = rawmessagemedia[0].get('url')
        messagemedia = rawmessagemedia_url.replace("files.chat.trypronto.com", 'stanfordohs.pronto.io')
        print(messagemedia)
def message_parser(message):
    ignore = False
    IGNORE_LIST = ["UserTyping", "MarkUpdated", "UserStoppedTyping", "MessageUpdated"]
    data = json.loads(message)

    incoming_event = data.get('event', '')
    event_name = incoming_event.replace("client-App\\Events\\", "")
    event_name = event_name.replace("App\\Events\\", "")

    for event in IGNORE_LIST:
        if event == event_name:
            ignore = True

    def log_del(delmsg_id):
        try:
            try:
                with open(log_file_name, 'r') as file:
                    logs = json.load(file)
            except FileNotFoundError:
                logs = {}

            logs[f'del{message_id}'] = {
                'deleted_message ': str(delmsg_id)
            }

            with open(log_file_name, 'w') as file:
                json.dump(logs, file, indent=4)

        except Exception as e:
            print(f"An error occurred: {e}")

    if ignore == False:
        parsed_data = json.loads(data['data'])
        if event_name == "MessageAdded":
            parse_msg(parsed_data)
        if event_name == "MessageRemoved":
            delmsg_id = parsed_data['message']['id']
            print()
            log_del(delmsg_id)
            search_message_log(log_file_name, delmsg_id)
        #print("Raw Data:", data)

# websocket authorization
def init_auth(socket_id):
    url = f"{api_base_url}api/v1/pusher.auth"
    privpush_uuid = uuid.uuid4()

    data = {
        "socket_id": socket_id,
        "channel_name": f"private-organization.2245"
    }

    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    privorg_auth = response.json().get("auth")
    print("Organization Connection Established.")
    print(f"Organization Auth: {privorg_auth}")

    data = {
        "socket_id": socket_id,
        "channel_name": f"private-push.{user_id}.{privpush_uuid}"
    }

    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    privpush_auth = response.json().get("auth")
    print("Push Connection Established.")
    print(f"Push Auth: {privpush_auth}")

    data = {
        "socket_id": socket_id,
        "channel_name": f"private-user.{user_id}"
    }

    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    privuser_auth = response.json().get("auth")
    print("User Connection Established.")
    print(f"User Auth: {privpush_auth}")
def chat_auth(bubble_id, channelcode, socket_id):
    url = f"{api_base_url}api/v1/pusher.auth"

    data = {
        "socket_id": socket_id,
        "channel_name": f"private-bubble.{bubble_id}.{channelcode}"
    }

    response = requests.post(url, headers=headers, json=data)
    check_if_ok(response)
    bubble_auth = response.json().get("auth")
    print("Bubble Connection Established.")
    print(f"Bubble Auth: {bubble_auth}")
    return bubble_auth


# main websocket loop
async def connect_and_listen(bubble_id):
    channelcode = bubble_info(bubble_id, 'channelcode')
    uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"

    async with websockets.connect(uri) as websocket:
        # Wait for the connection established message, which should contain the socket_id
        response = await websocket.recv()
        print(f"Received: {response}")

        data = json.loads(response)
        if "data" in data:
            inner_data = json.loads(data["data"])
            socket_id = inner_data.get("socket_id", None)

            data = {
                "event": "pusher:subscribe",
                "data": {
                    "channel": f"private-bubble.{bubble_id}.{channelcode}",
                    "auth": str(chat_auth(bubble_id, channelcode, socket_id))
                }
            }

            await websocket.send(json.dumps(data))

            if socket_id:
                print(f"Socket ID: {socket_id}")
            else:
                print("Socket ID not found in response")

        # Continue to listen for messages
        async for message in websocket:
            if message == "ping":
                await websocket.send("pong")
            else:
                message_parser(message)
async def user_input(bubble_id):

    def usercmds(msg, bubble_id):
        global sent_messageid
        global parentmessage_id


        if msg.startswith('/'): # treat it as a command
            cmd = msg.replace("/","") # get rid of slash

            #all commands
            if cmd == "del":
                if sent_messageid:
                    delete_message(sent_messageid)
                    sent_messageid = None
                else:
                    print("Can't find message to be deleted.")

            elif "delete" in cmd:
                param = cmd.replace("delete ", "")
                delete_message(param)
                print(f"Deleted message {param}")

            elif "thread" in cmd:
                option = cmd.replace('thread ', '')

                if 'join' in cmd:
                    parentmessage_id = ''.join([char for char in cmd if char.isdigit()])


                    if cmd == "thread join":
                        # Load the JSON data from a file
                        with open(log_file_name, 'r') as file:
                            data = json.load(file)

                            # get the most recent id
                            most_recent_id = list(data.keys())[-1]
                            parentmessage_id = most_recent_id.replace("del", "")
                            print(f"Joined Thread {parentmessage_id}")

                    if parentmessage_id == None:
                        print("No thread ID.")

                elif 'exit' in option:
                    parentmessage_id = None
                    print("Thread Exited")

                else:
                    print("Invalid Parameter")


            elif cmd == "more":
                print("more!")
            else:
                print(f"Command not understood: {msg}")

        else:
            sent_messageid = send_message(msg, bubble_id, parentmessage_id)

    while True:
        # Run input() in a separate thread so it doesn't block the asyncio event loop
        msg_to_send = await asyncio.to_thread(input)
        usercmds(msg_to_send, bubble_id)
async def main(bubble_id):
    # Create tasks for both listening to the WebSocket and getting user input
    listen_task = asyncio.create_task(connect_and_listen(bubble_id))
    input_task = asyncio.create_task(user_input(bubble_id))

    # Run both tasks concurrently
    await asyncio.gather(listen_task, input_task)

# Start message listener asynchronously
#chat = int(input("Bubble ID: "))
chat = '4169598'
asyncio.run(main(chat))