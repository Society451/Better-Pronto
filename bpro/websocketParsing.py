import json
from colorama import Fore, Style, init
import time
import sys
from collections import defaultdict

# Initialize colorama
init()

# Add typing status tracking
typing_users = {}
# Add message tracking
message_history = {}  # Store message content by ID
user_history = {}    # Store user info by ID

def clear_line():
    """Clear the current line in the terminal."""
    sys.stdout.write('\r' + ' ' * 100 + '\r')
    sys.stdout.flush()

def parse_event(message):
    try:
        event_data = json.loads(message)
        event_type = event_data.get("event", "")
        
        # Clean up event type name
        event_type = event_type.replace("client-App\\Events\\", "").replace("App\\Events\\", "")
        
        if event_type == "MessageAdded":
            clear_line()  # Clear any existing typing message
            # Clear the typing line with a newline before showing the message
            if typing_users:
                print()
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            media = message_content.get("messagemedia", [])
            thread_id = message_content.get("parentmessage_id")

            # Store message and user info for later reference
            msg_id = message_content.get('id')
            message_history[msg_id] = message_content.get('message')
            user_history[user.get('id')] = user.get('fullname')

            print(f"{Fore.GREEN}Message ID: {message_content.get('id')}")
            if thread_id:
                print(f"Thread ID: {thread_id}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            if media:
                print(f"Media: {media[0].get('url', '').replace('files.chat.trypronto.com', 'stanfordohs.pronto.io')}")
            print(f"Created At: {message_content.get('created_at')}{Style.RESET_ALL}")

        elif event_type == "MessageUpdated":
            clear_line()  # Clear any existing typing message
            data = json.loads(event_data["data"])
            message_content = data.get("message", {})
            user = message_content.get("user", {})
            
            # Update message history when message is updated
            msg_id = str(message_content.get('id'))
            message_history[msg_id] = message_content.get('message')
            user_history[user.get('id')] = user.get('fullname')
            
            print(f"{Fore.MAGENTA}Message Updated ID: {message_content.get('id')}")
            print(f"Bubble ID: {message_content.get('bubble_id')}")
            print(f"User: {user.get('fullname')}")
            print(f"Message: {message_content.get('message')}")
            print(f"Updated At: {message_content.get('updated_at')}{Style.RESET_ALL}")

        elif event_type == "MarkUpdated":
            clear_line()
            data = json.loads(event_data["data"])
            
            # Handle the new format where mark is directly in data
            if "mark" in data and isinstance(data["mark"], (int, str)):
                user_id = data.get("user_id")
                message_id = str(data["mark"])
                user_name = user_history.get(user_id, f"User {user_id}")
                message_text = message_history.get(message_id, f"Message {message_id}")
                print(f"{Fore.YELLOW}{user_name} read message: \"{message_text}\"{Style.RESET_ALL}")
                print()
            # Handle the old format
            else:
                mark_content = data.get("mark", {})
                if isinstance(mark_content, dict):
                    message_id = mark_content.get('message_id')
                    user_id = mark_content.get('user_id')
                    mark_type = mark_content.get('type')
                    if mark_type == 'read':
                        user_name = user_history.get(user_id, f"User {user_id}")
                        message_text = message_history.get(message_id, f"Message {message_id}")
                        print(f"{Fore.YELLOW}{user_name} read message: \"{message_text}\"{Style.RESET_ALL}")
                        print()
                else:
                    print(f"{Fore.YELLOW}Mark ID: {mark_content}{Style.RESET_ALL}")
                    print()

        elif event_type == "UserTyping":
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            thread_id = data.get("thread_id")
            
            if user_id not in typing_users:
                typing_users[user_id] = time.time()
            
            duration = int(time.time() - typing_users[user_id])
            
            clear_line()  # Clear previous typing message
            print(f"{Fore.CYAN}User {user_id} typing" + 
                  (f" in thread {thread_id}" if thread_id else "") + 
                  f" (typing for {duration}s){Style.RESET_ALL}", end='\r')
            sys.stdout.flush()

        elif event_type == "UserStoppedTyping":
            clear_line()  # Clear any existing typing message
            data = json.loads(event_data["data"])
            user_id = data.get("user_id")
            
            # Calculate final duration if user was typing
            if user_id in typing_users:
                duration = int(time.time() - typing_users[user_id])
                del typing_users[user_id]
                print(f"{Fore.BLUE}User {user_id} stopped typing after {duration}s{Style.RESET_ALL}")
            else:
                print(f"{Fore.BLUE}User {user_id} stopped typing{Style.RESET_ALL}")
            
            # Print a newline to ensure next message starts on fresh line
            print()

        elif event_type in ["pusher:subscription_succeeded", "pusher_internal:subscription_succeeded"]:
            clear_line()  # Clear any existing typing message
            channel = event_data.get("channel", "")
            print(f"{Fore.GREEN}Successfully subscribed to channel: {channel}{Style.RESET_ALL}")
            print()  # Add extra newline for spacing

        else:
            clear_line()  # Clear any existing typing message
            print(f"{Fore.RED}Unhandled event type: {event_type}")
            print(f"Raw data: {json.dumps(event_data, indent=2)}{Style.RESET_ALL}")

    except json.JSONDecodeError as e:
        clear_line()  # Clear any existing typing message
        print(f"{Fore.RED}Failed to decode JSON message: {e}")
        print(f"Raw message: {message}{Style.RESET_ALL}")
    except Exception as e:
        clear_line()  # Clear any existing typing message
        print(f"{Fore.RED}Error parsing event: {str(e)}")
        print(f"Raw message: {message}{Style.RESET_ALL}")