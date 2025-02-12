from parsing import WebsocketParser
from bprowebsockets import start_push_with_channelcode

def test_parser():
    parser = WebsocketParser()
    sample_messages = [
        'Received: {"event":"App\\\\Events\\\\MessageAdded","data":"{\\"message\\":{\\"id\\":99682131,\\"bubble_id\\":4003845,\\"user_id\\":5301921,\\"message\\":\\"Test Message\\",\\"messagemedia\\":[]}}","channel":"private-bubble.4003845.XXXX"}',
        'Received: {"event":"client-App\\\\Events\\\\UserTyping","data":"{\\"user_id\\":6056537,\\"thread_id\\":null}","channel":"private-bubble.4003845.XXXX"}'
    ]
    for msg in sample_messages:
        parser.handle_message(msg)

if __name__ == "__main__":
    test_parser()
    # Optionally, test the websocket connection integration:
    # bubble_id = "4003845"
    # start_push_with_channelcode(bubble_id)
