import wsmanager as manager
import json, requests
import asyncio

accesstoken = ""
api_base_url = 'https://stanfordohs.pronto.io/'
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {accesstoken}",
}


def bubble_info(bubble_id, info):
    url = f"{api_base_url}api/v1/bubble.info"

    data = {
        "bubble_id": bubble_id,
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status

    print(response.json())
    infolist = response.json().get('bubble')
    piece = infolist.get(info)
    return piece
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

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status() 

    chat_auth = response.json().get("auth")
    return chat_auth


async def subscribe_to_bubble(bubbleid):
    websocket = manager.connect('wss://ws-mt1.pusher.com/app/f44139496d9b75f37d27?protocol=7&client=js&version=8.3.0&flash=false')
    channelcode = bubble_info(bubbleid, 'channelcode')
    socket_id = manager.get_socket_id()

    sub_data = {
                "event": "pusher:subscribe",
                "data":{
                    "channel": f"private-bubble.{bubbleid}.{channelcode}",
                    "auth": str(chat_auth(bubbleid, channelcode, socket_id))
                }
            }
    
    await websocket.send(sub_data)
def message_parser(parsed_data):

    # look idk if a class is necessary but i wanted to use it for funsies
    class Message:
        def __init__(self, parsed_data):
            message_data = parsed_data.get('message', {})

            self.text = message_data.get('message', "")
            self.user = message_data.get('user', {})
            self.message_id = message_data.get('id', None)
            self.user_name = f"{self.user.get('firstname', '')} {self.user.get('lastname', '')}".strip()
            self.date_created = message_data.get('created_at', None)
            self.media = message_data.get('messagemedia', None)
            self.parent_message_id = message_data.get('parentmessage_id', None)

    # convert sus message link to non-sus message link hehe
    if rawmessagemedia != []:
        rawmessagemedia_url = rawmessagemedia[0].get('url')
        messagemedia = Message.rawmessagemedia_url.replace("files.chat.trypronto.com", 'stanfordohs.pronto.io')

    # now, you can do whatever you want with the data of the new message! yay!
    # like, for example, print it!1!1!! (no plz go connect it to the chat now.)

    print(Message.text)
def event_parser(message):
    data = json.loads(message)

    incoming_event = data.get('event', '')
    event_name = incoming_event.replace("client-App\\Events\\", "")
    event_name = event_name.replace("App\\Events\\", "")


    parsed_data = json.loads(data['data'])

    if event_name == "MessageAdded":
        message_parser(parsed_data)

    if event_name == "MessageRemoved":
        delmsg_id = parsed_data['message']['id']
        # do whatever the heck you want with the knowledge of said message (delmsg_id) being deleted

    # hundreds more possible events (UserTyping, UserStoppedTyping, MarkUpdated, etc)
    # but these ones above are the JUICIEST for bubble subs

    # plus, the front end doesn't even have read receipts and whatnot so we don't need it yet

asyncio.run(subscribe_to_bubble(4003845))
manager.register_listener(event_parser)
