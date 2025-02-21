import websocket, json, requests, uuid
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

url = "wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false"
api_base_url = "https://stanfordohs.pronto.io/"
channel_name_id = get_org_id(authTokenJSONPath)
###
###
###
###
###

#Function to authenticate the subscription
def init_auth(socket_id, channel_name_id):
    auth_url = f"{api_base_url}api/v1/pusher.auth"
    privpush_uuid = uuid.uuid4()  

    #payload for organization channel
    payload = {
        "socket_id": socket_id,
        "channel_name": f"private-organization.{channel_name_id}"
    }
    headers = {
        "Authorization": f"Bearer {accesstoken}",
        "Content-Type": "application/json"
    }

    response = requests.post(auth_url, headers=headers, json=payload)
    response.raise_for_status()  # Check for HTTP errors
    print(f"Auth response: {response.json()}")
    privorg_auth = response.json().get("auth")
    print("Organization Connection Established.")
    print(f"Organization Auth: {privorg_auth}")

    #payload for private channel
    data = {
        "socket_id": socket_id,
        "channel_name": f"private-push.{userID}.{privpush_uuid}"
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Check for HTTP errors
    print(f"Auth response: {response.json()}")
    privpush_auth = response.json().get("auth")
    print("Push Connection Established.")
    print(f"Push Auth: {privpush_auth}")

    #payload for user channel
    data = {
        "socket_id": socket_id,
        "channel_name": f"private-user.{userID}"
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Check for HTTP errors
    print(f"Auth response: {response.json()}")
    privuser_auth = response.json().get("auth")
    print("User Connection Established.")
    print(f"User Auth: {privuser_auth}")

def chat_auth(bubble_id, channelcode, socketid):
    url = f"{api_base_url}api/v1/pusher.auth"
    data = {
        "socket_id:": socketid,
        "channel_name": f"private-chat.{bubble_id}.{channelcode}"
    }
    headers = {
        "Authorization": f"Bearer {accesstoken}",
        "Content-Type": "application/json"
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Check for HTTP errors
    print(f"Auth response: {response.json()}")
    chat_auth = response.json().get("auth")
    print("Chat Connection Established.")
    print(f"Chat Auth: {chat_auth}")
    return chat_auth