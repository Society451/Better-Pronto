import webview, os, json, re, time, uuid, mimetypes, requests, urllib.parse
from bpro.pronto import Pronto
from bpro.systemcheck import *
from bpro.readjson import ReadJSON
import asyncio
import threading
import shutil
import webbrowser
import tempfile
import base64

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
# Verify the directory exists
if not os.path.exists(os.path.dirname(settingsJSONPath)):
    print(f"Creating settings directory: {os.path.dirname(settingsJSONPath)}")
    os.makedirs(os.path.dirname(settingsJSONPath), exist_ok=True)
accesstoken = ""
user_info = ReadJSON.get_clientUserInfo(authTokenJSONPath)
userID = user_info["id"] if user_info else None

# Initialize Pronto instance
pronto = Pronto()

def getLocalAccesstoken():
    global accesstoken
    accesstoken = ReadJSON.getaccesstoken(authTokenJSONPath)
    if accesstoken:
        print(f"Access token retrieved successfully: {accesstoken[:5]}...{accesstoken[-5:]}") 
    else:
        print("Access token not found or invalid")
getLocalAccesstoken()

current_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(current_dir, 'frontend', 'chat', 'chat-index.html')

# Function to save response data to a file
def save_response_to_file(response_data, file_path):
    ReadJSON.save_response_to_file(response_data, file_path)

def getvalueLogin(file_path, value):
    return ReadJSON.getvalueLogin(file_path, value)

# Function to sanitize folder names
def sanitize_folder_name(name):
    sanitized_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return sanitized_name

def download_image(image_url, save_path, access_token):
    """Download an image file and save it to the specified path."""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        # Set up headers with authorization
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        print(f"Downloading image from {image_url}")
        
        # Make the request with headers
        response = requests.get(image_url, headers=headers, stream=True)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Get content type from headers to determine file extension
        content_type = response.headers.get('content-type')
        extension = None
        if content_type:
            extension = mimetypes.guess_extension(content_type)
            # Fix common extension issues
            if extension == '.jpe':
                extension = '.jpg'
            elif extension == '.jpeg':
                extension = '.jpg'
                
            if extension and not save_path.lower().endswith(extension.lower()):
                save_path = f"{save_path}{extension}"
                print(f"Adding extension {extension} based on content type {content_type}")
        
        # Save the file
        with open(save_path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)
            
        print(f"Successfully downloaded image to {save_path}")
        
        # Verify file exists and has content
        if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
            return True, save_path, extension  # Return success, path and extension
        else:
            print(f"Warning: Downloaded file is empty or missing: {save_path}")
            return False, save_path, extension
    except Exception as e:
        print(f"Error downloading image: {e}")
        return False, save_path, None

class Api:
    def __init__(self, accesstoken):
        self.email = ""
        self.accesstoken = accesstoken

    def handle_email(self, email):
        if "stanford.edu" in email:
            self.email = email
            response = pronto.requestVerificationEmail(email)
            print("Response:", response)
            return "Email accepted"
        else:
            return "Invalid email domain"

    def handle_verification_code(self, code):
        print("Verification code checked")
        response = pronto.verification_code_to_login_token(self.email, code)
        if "ok" in response:
            print("Login token received")
        save_response_to_file(response, loginTokenJSONPath)
        self.accessToken()

    def accessToken(self):
        print("Access token method called")
        logintoken = getvalueLogin(loginTokenJSONPath, "logintoken")
        if logintoken:
            print(f"Login token found: {logintoken}")
            response = pronto.login_token_to_access_token(logintoken)
            print(f"Access token response: {response}")
            if response:
                save_response_to_file(response, f"{authTokenJSONPath}")
                print("Accesstoken received")
                print(response)
                getLocalAccesstoken()
                try:
                    with open(authTokenJSONPath, "r") as file:
                        written_data = json.load(file)
                except Exception as e:
                    print(f"Error reading written file: {e}")
                return "Ok"
            else:
                print("Failed to get access token from login token")
                return None
        else:
            return None

    ## Dynamic Data Fetching
    def get_user_id(self):
        user_info = ReadJSON.get_clientUserInfo(authTokenJSONPath)
        return user_info["id"] if user_info else None

    def get_live_bubbles(self, *args):
        response = pronto.getUsersBubbles(accesstoken)
        save_response_to_file(response, bubbleOverviewJSONPath)
        ReadJSON.create_bubble_folders(bubbleOverviewJSONPath, bubbles_path, sanitize_folder_name)

    def get_dynamicdetailed_messages(self, bubbleID):
        if not bubbleID:
            print("Bubble ID is undefined")
            return {"messages": []}
        print(f"Fetching detailed messages for bubble ID: {bubbleID}")
        try:
            response = pronto.get_bubble_messages(accesstoken, bubbleID)
            if response is None or 'messages' not in response:
                print("401 Unauthorized: Access token may be invalid or expired.")
                raise Exception("401 Unauthorized")
            
            messages = response['messages']
            detailed_messages = []

            if not messages:
                print("No messages found.")
                return {"messages": detailed_messages}

            for message in messages:
                if isinstance(message, dict):
                    content = message.get("message", "")

                    detailed_message = {
                        "time_of_sending": message.get("created_at"),
                        "author": message.get("user", {}).get("fullname"),
                        "profilepicurl": message.get("user", {}).get("profilepicurl"),
                        "message_id": message.get("id"),
                        "edit_count": message.get("user_edited_version", 0),
                        "last_edited": message.get("user_edited_at"),
                        "parent_message": message.get("parentmessage_id"),
                        "reactions": message.get("reactionsummary", []),
                        "content": content,
                    }
                    
                    # Add message regardless of missing data
                    detailed_messages.append(detailed_message)

            # Save messages to files
            bubble_folder_path = os.path.join(chats_path, sanitize_folder_name(f"{bubbleID}"))
            os.makedirs(bubble_folder_path, exist_ok=True)
            messages_file_path = os.path.join(bubble_folder_path, "messages.json")
            full_messages_file_path = os.path.join(bubble_folder_path, "fullmessages.json")
            with open(messages_file_path, "w") as file:
                json.dump({"messages": detailed_messages}, file, indent=4)
            with open(full_messages_file_path, "w") as file:
                json.dump(response, file, indent=4)
            print(f"Messages saved to {messages_file_path}")
            print(f"Full response saved to {full_messages_file_path}")

            return {"messages": detailed_messages}
        except Exception as e:
            print(f"Error fetching detailed messages: {e}")
            return {"messages": []}

    def get_Localmessages(self, bubbleID):
        if not bubbleID:
            print("Bubble ID is undefined")
            return {"messages": []}
        print(f"Fetching local messages for bubble ID: {bubbleID}")  # Debug statement
        try:
            # Search for the folder with the matching bubble ID in the entire chats_path
            sanitized_bubble_id = sanitize_folder_name(f"{bubbleID}")
            bubble_folder_path = None
            for root, dirs, files in os.walk(chats_path):
                for dir_name in dirs:
                    if dir_name == sanitized_bubble_id:
                        bubble_folder_path = os.path.join(root, dir_name)
                        break
                if bubble_folder_path:
                    break

            if not bubble_folder_path:
                print(f"No folder found for bubble ID: {bubbleID}")
                return {"messages": []}

            # Read messages from the JSON file within the specific folder for the bubble
            messages_file_path = os.path.join(bubble_folder_path, "messages.json")
            full_messages_file_path = os.path.join(bubble_folder_path, "fullmessages.json")
            with open(messages_file_path, "r") as file:
                data = json.load(file)
                messages = data.get("messages", [])
                detailed_messages = []

                for message in messages:
                    detailed_message = {
                        "time_of_sending": message.get("time_of_sending"),
                        "author": message.get("author"),
                        "profilepicurl": message.get("profilepicurl"),
                        "message_id": message.get("message_id"),
                        "edit_count": message.get("edit_count", 0),
                        "last_edited": message.get("last_edited"),
                        "parent_message": message.get("parent_message"),
                        "reactions": message.get("reactions", []),
                        "content": message.get("content"),
                        "has_image": message.get("has_image", False),
                        "image_data": message.get("image_data")
                    }
                    
                    # Add all messages regardless of missing data
                    detailed_messages.append(detailed_message)

                # Make sure we don't overwrite existing data
                with open(full_messages_file_path, "w") as file:
                    json.dump(data, file, indent=4)

                return {"messages": detailed_messages}
        except Exception as e:
            print(f"Error fetching local messages: {e}")
            return {"messages": []}

    ## Local JSON Fetching and Parsing
    def get_Localdms(self, *args):
        print("Fetching DMs")
        dms = ReadJSON.get_dms(bubbleOverviewJSONPath)
        print("DMs:", dms)
        return dms

    def get_Localcategorized_bubbles(self, *args):
        print("Fetching categorized bubbles")
        categorized_bubbles = ReadJSON.get_categorized_bubbles(bubbleOverviewJSONPath)
        print("Categorized Bubbles:", categorized_bubbles)
        return categorized_bubbles

    def get_Localuncategorized_bubbles(self, *args):
        print("Fetching uncategorized bubbles")
        uncategorized_bubbles = ReadJSON.get_uncategorized_bubbles(bubbleOverviewJSONPath)
        print("Uncategorized Bubbles:", uncategorized_bubbles)
        return uncategorized_bubbles

    def get_Localunread_bubbles(self, *args):
        print("Fetching unread bubbles")
        unread_bubbles = ReadJSON.get_unread_bubbles(bubbleOverviewJSONPath)
        print("Unread Bubbles:", unread_bubbles)
        return unread_bubbles

    def get_Localcategories(self, *args):
        print("Fetching categories")
        categories = ReadJSON.get_categories(bubbleOverviewJSONPath)
        print("Categories:", categories)
        return categories

    def print_chat_info(self, chat_name, chat_id):
        print(f"Clicked on chat: {chat_name}, ID: {chat_id}")

    ## Sending data
    def send_message(self, bubbleID, message, userID, parentmessage_id=None):
        userID = [userID]
        print(f"Sending message to bubble ID {bubbleID}: {message}")
        created_at = time.time()
        unique_uuid = str(uuid.uuid4())
        try:
            response = pronto.send_message_to_bubble(accesstoken, bubbleID, created_at, message, userID, unique_uuid, parentmessage_id)
            print(f"Response: {response}")
            if isinstance(response, dict) and response.get('ok'):
                return {
                    'ok': True,
                    'message': response['message']
                }
            return {
                'ok': False,
                'error': 'Failed to send message'
            }
        except Exception as e:
            print(f"Error sending message: {e}")
            return {
                'ok': False,
                'error': str(e)
            }

    def markBubbleAsRead(self, bubbleID, message_id=None):
        print(f"DEBUG: markBubbleAsRead called for bubble {bubbleID}, message_id: {message_id}")
        try:
            if not message_id:
                bubble_messages = pronto.get_bubble_messages(accesstoken, bubbleID)
                if bubble_messages and 'messages' in bubble_messages and bubble_messages['messages']:
                    messages = bubble_messages['messages']
                    message_id = messages[0]['id']
                    print(f"DEBUG: Using most recent message ID: {message_id}")
                else:
                    print("DEBUG: No messages found for the bubble, cannot mark as read")
                    return None
            response = pronto.markBubble(accesstoken, bubbleID, message_id=message_id)
            print(f"Marked bubble {bubbleID} as read with message ID {message_id}: {response}")
            return response
        except Exception as e:
            print(f"Error marking bubble as read: {e}")
            return None

    def delete_message(self, messageID):
        try:
            response = pronto.deleteMessage(accesstoken, messageID)
            print(f"Deleted message {messageID}: {response}")
            if isinstance(response, dict):
                if response.get('ok'):
                    return {"ok": True, "response": response}
                else:
                    return {
                        "ok": False, 
                        "error": response.get('error', 'Unknown error occurred')
                    }
            else:
                return {"ok": False, "error": "Invalid response format"}
        except Exception as e:
            print(f"Error deleting message: {e}")
            return {"ok": False, "error": str(e)}