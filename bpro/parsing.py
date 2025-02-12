import json
import datetime

class WebsocketParser:
    def __init__(self):
        # Initialize parser state if needed
        pass

    def parse_message(self, raw_message: str) -> dict:
        """
        Parse a raw websocket message.
        If the message starts with a prefix, it is removed.
        Also, attempts to decode nested JSON inside the "data" field.
        """
        # Remove any "Received:" prefix
        prefix = "Received:"
        if raw_message.startswith(prefix):
            raw_message = raw_message[len(prefix):].strip()
        try:
            msg_obj = json.loads(raw_message)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return {}

        # Extract fields
        event = msg_obj.get("event")
        channel = msg_obj.get("channel")
        data = msg_obj.get("data")
        # Try to parse nested JSON in data if it's a string
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                # Leave data as is if it's not valid JSON
                pass

        return {"event": event, "channel": channel, "data": data}

    def handle_message(self, raw_message: str):
        parsed = self.parse_message(raw_message)
        if not parsed:
            return
        event = parsed.get("event")
        data = parsed.get("data")

        if event == "App\\Events\\MessageAdded":
            msg = data.get("message", {}) if isinstance(data, dict) else {}
            user_id = msg.get("user_id", "U")
            content = msg.get("message", "")
            print(f"MA: {user_id}: {content}")
        elif event == "App\\Events\\MessageUpdated":
            msg = data.get("message", {}) if isinstance(data, dict) else {}
            user_id = msg.get("user_id", "U")
            print(f"MU: {user_id}")
        elif event.startswith("client-App\\Events\\UserTyping"):
            user_id = data.get("user_id", "U") if isinstance(data, dict) else "U"
            print(f"T: {user_id}")
        elif event.startswith("client-App\\Events\\UserStoppedTyping"):
            user_id = data.get("user_id", "U") if isinstance(data, dict) else "U"
            print(f"ST: {user_id}")
        else:
            print(f"E: {event}")

# Example of live parsing (can be integrated wherever websocket messages are processed)
if __name__ == "__main__":
    parser = WebsocketParser()
    # Example messages. In practice, these would be received live from the websocket.
    sample_messages = [
        'Received: {"event":"App\\\\Events\\\\MessageAdded","data":"{\\"message\\":{\\"id\\":99682131,\\"bubble_id\\":4003845,\\"user_id\\":5301921,\\"message\\":\\"and procrastinating the drawing\\",\\"messagemedia\\":[]}}","channel":"private-bubble.4003845.JWoIL5Upf574Gg9Rm9TE5xpDRkGRE7Vhg0yrRp2l"}',
        'Received: {"event":"client-App\\\\Events\\\\UserTyping","data":"{\\"user_id\\":6056537,\\"thread_id\\":null}","channel":"private-bubble.4003845.JWoIL5Upf574Gg9Rm9TE5xpDRkGRE7Vhg0yrRp2l"}'
    ]
    for msg in sample_messages:
        parser.handle_message(msg)
