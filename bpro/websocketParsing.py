import json
from colorama import Fore, Style, init

# Initialize colorama
init()

def parse_event(message):
    try:
        event_data = json.loads(message)
        event_type = event_data.get("event", "")
        
        # Clean up event type name
        event_type = event_type.replace("client-App\\Events\\", "").replace("App\\Events\\", "")
        
        if event_type == "MessageAdded":
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            media = message_content.get("messagemedia", [])
            thread_id = message_content.get("parentmessage_id")

            print(f"{Fore.GREEN}Message ID: {message_content.get('id')}")
            if thread_id:
                print(f"Thread ID: {thread_id}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            if media:
                print(f"Media: {media[0].get('url', '').replace('files.chat.trypronto.com', 'stanfordohs.pronto.io')}")
            print(f"Created At: {message_content.get('created_at')}{Style.RESET_ALL}")

        elif event_type == "MessageUpdated":
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            print(f"{Fore.MAGENTA}Message Updated ID: {message_content.get('id')}")
            print(f"Bubble ID: {message_content.get('bubble_id')}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            print(f"Updated At: {message_content.get('updated_at')}{Style.RESET_ALL}")

        elif event_type == "MarkUpdated":
            data = json.loads(event_data["data"])
            mark_content = data.get("mark", {})
            if isinstance(mark_content, dict):
                print(f"{Fore.YELLOW}Mark ID: {mark_content.get('id')}{Style.RESET_ALL}")
            else:
                print(f"{Fore.YELLOW}Mark ID: {mark_content}{Style.RESET_ALL}")

        elif event_type == "UserTyping":
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            thread_id = data.get("thread_id")
            print(f"{Fore.CYAN}User {user_id} typing" + 
                  (f" in thread {thread_id}" if thread_id else "") + 
                  f"{Style.RESET_ALL}")

        elif event_type == "UserStoppedTyping":
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            print(f"{Fore.BLUE}User {user_id} stopped typing{Style.RESET_ALL}")

        elif event_type in ["pusher:subscription_succeeded", "pusher_internal:subscription_succeeded"]:
            channel = event_data.get("channel", "")
            print(f"{Fore.GREEN}Successfully subscribed to channel: {channel}{Style.RESET_ALL}")

        else:
            print(f"{Fore.RED}Unhandled event type: {event_type}")
            print(f"Raw data: {json.dumps(event_data, indent=2)}{Style.RESET_ALL}")

    except json.JSONDecodeError as e:
        print(f"{Fore.RED}Failed to decode JSON message: {e}")
        print(f"Raw message: {message}{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}Error parsing event: {str(e)}")
        print(f"Raw message: {message}{Style.RESET_ALL}")