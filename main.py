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
print(f"Settings JSON Path: {settingsJSONPath}")
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
html_path = os.path.join(current_dir, 'frontend', 'html', 'chat.html')

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

            # Prepare bubble folder path
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
                bubble_folder_path = os.path.join(chats_path, sanitized_bubble_id)
                os.makedirs(bubble_folder_path, exist_ok=True)
            
            # Create media folder within bubble folder
            media_folder = os.path.join(bubble_folder_path, "media")
            os.makedirs(media_folder, exist_ok=True)

            for message in messages:
                if isinstance(message, dict):
                    content = message.get("message", "")
                    has_image = False
                    image_data = None
                    
                    # Check if message has media
                    if 'messagemedia' in message and message['messagemedia'] and len(message['messagemedia']) > 0:
                        media_item = message['messagemedia'][0]  # Get first media item
                        has_image = True
                        
                        # Check if it's an external GIF (from Giphy, etc.)
                        if media_item.get('external', False) and media_item.get('url'):
                            # Handle external GIF or image that doesn't need downloading
                            image_data = {
                                'id': media_item.get('id'),
                                'url': media_item.get('url'),
                                'is_external': True,
                                'title': media_item.get('title', ''),
                                'width': media_item.get('width'),
                                'height': media_item.get('height'),
                                'mediatype': media_item.get('mediatype'),
                                'mime_type': media_item.get('urlmimetype')
                            }
                            print(f"External media found: {image_data['url']}")
                        # Regular internal image that needs path processing
                        elif media_item.get('path'):
                            # Get path components
                            path = media_item.get('path', '')
                            if path:
                                # Parse out the user_id and file_name from the path
                                path_parts = path.strip('/').split('/')
                                if len(path_parts) >= 3:
                                    folder_id = path_parts[-2]
                                    file_name = path_parts[-1]
                                    
                                    # Create local storage structure
                                    local_folder = os.path.join(media_folder, folder_id)
                                    os.makedirs(local_folder, exist_ok=True)
                                    
                                    # Add file extension from mime type if available
                                    mime_type = media_item.get('urlmimetype')
                                    extension = ''
                                    if mime_type:
                                        extension = mimetypes.guess_extension(mime_type) or ''
                                        # Fix common extension issues
                                        if extension == '.jpe':
                                            extension = '.jpg'
                                        elif extension == '.jpeg':
                                            extension = '.jpg'
                                        
                                        if extension and not file_name.lower().endswith(extension.lower()):
                                            file_name = f"{file_name}{extension}"
                                    
                                    local_image_path = os.path.join(local_folder, file_name)
                                    
                                    # Full URL to the media file
                                    media_url = f"https://files.chat.trypronto.com{path}"
                                    
                                    # Download the image only if it doesn't exist
                                    download_success = False
                                    actual_path = local_image_path
                                    if not os.path.exists(local_image_path):
                                        download_success, actual_path, actual_ext = download_image(media_url, local_image_path, accesstoken)
                                        if actual_ext and actual_ext != extension:
                                            extension = actual_ext
                                            file_name = os.path.basename(actual_path)
                                    else:
                                        download_success = True
                                        print(f"Image already exists at {local_image_path}")
                                    
                                    # Get the relative path with actual filename including extension
                                    relative_path = os.path.join('media', folder_id, file_name).replace('\\', '/')
                                    
                                    # Store media info
                                    image_data = {
                                        'id': media_item.get('id'),
                                        'url': media_url,
                                        'local_path': actual_path if download_success else None,
                                        'relative_path': relative_path if download_success else None,
                                        'title': media_item.get('title', ''),
                                        'width': media_item.get('width'),
                                        'height': media_item.get('height'),
                                        'mediatype': media_item.get('mediatype'),
                                        'mime_type': media_item.get('urlmimetype'),
                                        'file_extension': extension
                                    }
                        else:
                            # Handle case where media exists but has neither external URL nor path
                            print(f"Media without path or external URL: {media_item}")
                            if media_item.get('url'):
                                # Use URL directly if available
                                image_data = {
                                    'id': media_item.get('id'),
                                    'url': media_item.get('url'),
                                    'is_external': True,
                                    'title': media_item.get('title', ''),
                                    'width': media_item.get('width'),
                                    'height': media_item.get('height'),
                                    'mediatype': media_item.get('mediatype'),
                                    'mime_type': media_item.get('urlmimetype')
                                }
                    
                    # Check for URLs in the content
                    elif content:
                        # Check for common image patterns in message content
                        image_pattern = re.compile(r'https?://[^\s]+\.(jpg|jpeg|png|gif|bmp|webp)', re.IGNORECASE)
                        if image_pattern.search(content):
                            has_image = True
                        # Check for markdown image syntax
                        if re.search(r'!\[.*?\]\(.*?\)', content):
                            has_image = True
                        # Check for HTML img tag
                        if re.search(r'<img[^>]+src="[^"]+"[^>]*>', content):
                            has_image = True

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
                        "has_image": has_image,
                        "image_data": image_data,
                        "media": message.get("messagemedia")  # Include the full media data for reference
                    }
                    
                    # Add message regardless of missing data
                    detailed_messages.append(detailed_message)
                    
                    # Debug log for messages with media
                    if has_image:
                        if image_data and image_data.get('is_external'):
                            print(f"Message has external media: {image_data}")
                        elif not image_data:
                            print(f"Message has image flag but no image data: {message.get('id')}")
                        if 'messagemedia' in message:
                            print(f"Message has messagemedia: {message['messagemedia']}")

            # Save messages to files
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

    # Update the save_settings method to ensure proper JSON formatting and error handling
    def save_settings(self, settings):
        print(f"SETTINGS API: save_settings called with: {settings}")
        try:
            if not isinstance(settings, dict):
                print(f"SETTINGS ERROR: Invalid settings format: {type(settings)}")
                return {"ok": False, "error": "Invalid settings format"}
            
            os.makedirs(os.path.dirname(settingsJSONPath), exist_ok=True)
            
            with open(settingsJSONPath, "w") as file:
                json.dump(settings, file, indent=4)
            
            if os.path.exists(settingsJSONPath):
                print(f"SETTINGS SUCCESS: File saved successfully.")
                return {"ok": True, "message": "Settings saved successfully"}
            else:
                print("SETTINGS WARNING: File does not exist after save operation")
                return {"ok": False, "error": "File save failed"}
        except Exception as e:
            print(f"SETTINGS ERROR: Error saving settings: {e}")
            return {"ok": False, "error": str(e)}

    def load_settings(self):
        try:
            if os.path.exists(settingsJSONPath) and os.path.getsize(settingsJSONPath) > 0:
                with open(settingsJSONPath, "r") as file:
                    data = json.load(file)
                print(f"Settings loaded successfully: {data}")
                return data
            else:
                print(f"Settings file not found or empty: {settingsJSONPath}")
                default_settings = {
                    "theme": "light",
                    "fontSize": "medium",
                    "enableNotifications": True,
                    "notificationSound": True,
                    "sendKey": "enter",
                    "readReceipts": True,
                    "quickDelete": False
                }
                self.save_settings(default_settings)
                return default_settings
        except json.JSONDecodeError as e:
            print(f"Error parsing settings JSON: {e}")
            return {"ok": False, "error": str(e)}
        except Exception as e:
            print(f"Error loading settings: {e}")
            return {"ok": False, "error": str(e)}

# Create an instance of the Api class with the accesstoken
api = Api(accesstoken)
print("Available API methods:", dir(api))
# Create a webview window with the specified HTML file and API
window = webview.create_window(
    'Better Pronto Alpha',
    f'file://{html_path}',
    js_api=api,
    text_select=True,
    width=1200,
    height=800,
    easy_drag=True,
    maximized=True,
    zoomable=True,
)
webview.start(debug=True)