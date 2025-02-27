import json
from colorama import Fore, Style, init

# Initialize colorama
init()

def parse_event(event_data):
    """Parse websocket event data"""
    # Add your parsing logic here
    return event_data

def parse_event(message):
    try:
        event_data = json.loads(message)
        event_type = event_data.get("event")

        if event_type == "App\\Events\\MessageAdded":
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            print(Fore.GREEN + f"Message ID: {message_content.get('id')}")
            print(f"Bubble ID: {message_content.get('bubble_id')}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            print(f"Created At: {message_content.get('created_at')}" + Style.RESET_ALL)
        
        elif event_type == "App\\Events\\MarkUpdated":
            data = json.loads(event_data["data"])
            mark_content = data.get("mark", {})
            if isinstance(mark_content, dict):
                print(Fore.YELLOW + f"Mark ID: {mark_content.get('id')}")
                print(f"Mark Status: {mark_content.get('status')}")
                print(f"Updated At: {mark_content.get('updated_at')}" + Style.RESET_ALL)
            else:
                print(Fore.YELLOW + f"Mark ID: {mark_content}" + Style.RESET_ALL)
        
        elif event_type == "client-App\\Events\\UserTyping":
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            thread_id = data.get("thread_id")
            print(Fore.BLUE + f"User Typing: {user_id}")
            if thread_id:
                print(f"Thread ID: {thread_id}" + Style.RESET_ALL)
        
        elif event_type == "client-App\\Events\\UserStoppedTyping":
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            print(Fore.CYAN + f"User Stopped Typing: {user_id}" + Style.RESET_ALL)
        
        elif event_type == "App\\Events\\MessageRemoved":
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            print(Fore.RED + f"Message Removed ID: {message_content.get('id')}" + Style.RESET_ALL)
        
        elif event_type == "App\\Events\\MessageUpdated":
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            print(Fore.MAGENTA + f"Message Updated ID: {message_content.get('id')}")
            print(f"Bubble ID: {message_content.get('bubble_id')}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            print(f"Updated At: {message_content.get('updated_at')}" + Style.RESET_ALL)
        
        elif event_type == "pusher_internal:subscription_succeeded":
            data = json.loads(event_data["data"])
            presence = data.get("presence", {})
            count = presence.get("count")
            ids = presence.get("ids", [])
            print(Fore.LIGHTGREEN_EX + f"Subscription Succeeded: {count} users present")
            print(f"User IDs: {', '.join(ids)}" + Style.RESET_ALL)
        
        else:
            print(Fore.WHITE + f"Unhandled event type: {event_type}" + Style.RESET_ALL)
    except json.JSONDecodeError:
        print(Fore.RED + "Failed to decode JSON message" + Style.RESET_ALL)