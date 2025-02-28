import websocket, json, requests, uuid, websockets, asyncio
from bpro.pronto import *
from bpro.systemcheck import *
from bpro.readjson import *

###
###
###
###
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

uri = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
api_base_url = "https://stanfordohs.pronto.io/"
channel_name_id = get_org_id(authTokenJSONPath)
###
###
###
###
###
def chat_auth(bubble_id, channelcode, socketid):
    url = f"{api_base_url}api/v1/pusher.auth"
    data = {
        "socket_id": socketid,
        "channel_name": f"private-chat.{bubble_id}.{channelcode}"
    }
    headers = {
        "Authorization": f"Bearer {accesstoken}",
        "Content-Type": "application/json"
    }

    # Debugging output
    print(f"Request URL: {url}")
    print(f"Request Headers: {headers}")
    print(f"Request Payload: {data}")

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Check for HTTP errors
    print(f"Auth response: {response.json()}")
    chat_auth = response.json().get("auth")
    print("Chat Connection Established.")
    print(f"Chat Auth: {chat_auth}")
    return chat_auth

async def connect_and_listen(bubbleid):
    channelcode = get_channelcodes(bubbleOverviewJSONPath, bubbleid)
    print(f"Channel code: {channelcode}")

    async with websockets.connect(uri) as websocket:
        #wait for the connection established messsage, which should contain the socket_id
        response = await websocket.recv()
        print(f"Response: {response}")

        data = json.loads(response)
        if "data" in data:
            inner_data = json.loads(data["data"])
            socket_id = inner_data.get("socket_id", None)

            data = {
                "event": "pusher:subscribe",
                "data":{
                    "channel": f"private-bubble.{bubbleid}.{channelcode}",
                    "auth": str(chat_auth(bubbleid, channelcode, socket_id))
                }
            }
            await websocket.send(json.dumps(data))
            print("Subscribed to chat channel")

            if socket_id:
                print(f"Socket ID: {socket_id}")
                init_auth(socket_id, channel_name_id)
            else:
                print("Socket ID not found")

        async for message in websocket:
            if message == "ping":
                await websocket.send("pong")
            else:
                return message

def connect_to_bubble(bubbleid)
asyncio.run(connect_and_listen(4066670))