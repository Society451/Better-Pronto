import webview, os, json, re, time, uuid
from bpro.pronto import *
from bpro.systemcheck import *
from bpro.readjson import *

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

current_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(current_dir, 'frontend', 'html', 'chat.html')

# Function to save response data to a file
def save_response_to_file(response_data, file_path):
    try:
        with open(file_path, "w") as file:
            json.dump(response_data, file, indent=4)
    except Exception as e:
        print(f"Error saving response to file: {e}")

def getvalueLogin(file_path, value):
    try:
        with open(file_path, "r") as file:
            data = json.load(file)
            print(f"Loaded JSON data: {data}")  # Debugging statement
            if "users" in data and len(data["users"]) > 0:
                value = data["users"][0][value]
                return value
            else:
                print("No users found in JSON data")
                return None
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

# Function to sanitize folder names
def sanitize_folder_name(name):
    sanitized_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Comment out or remove the debug statement after verification
    # print(f"Sanitized folder name: {sanitized_name}")  # Debug statement
    return sanitized_name

class Api:
    ## makes a new window, and we're prolly never gonna use this 
    def makeNewWindow(windowName, windowURL, api):
        window = webview.create_window(windowName, windowURL, js_api=api)
        return window
    ## Auth process
    ## ensures all future calls have a valid accesstoken
    ## should be more or less complete
    getLocalAccesstoken()
    def __init__(self, accesstoken):
        self.email = ""
        self.accesstoken = accesstoken

    def handle_email(self, email):
        if "stanford.edu" in email:
            self.email = email
            response = requestVerificationEmail(email)
            print("Response:", response)
            return "Email accepted"
        else:
            return "Invalid email domain"

    def handle_verification_code(self, code):
        print("Verification code checked")
        response = verification_code_to_login_token(self.email, code)
        if "ok" in response:
            print("Login token received")
        save_response_to_file(response, loginTokenJSONPath)
        self.accessToken()

    def accessToken(self):
        print("Access token method called")
        logintoken = getvalueLogin(loginTokenJSONPath, "logintoken")
        if logintoken:
            print(f"Login token found: {logintoken}")
            response = login_token_to_access_token(logintoken)
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
            print("Login token not found")
            return None

    ## Dynamic Data Fetching
    ## dynamic and local data fetching should be called at the same, possibly through a threading system,
    ## although local data fetching is fast enough that this complexity may not be necessary
    def get_live_bubbles(self, *args):
        response = getUsersBubbles(accesstoken)
        save_response_to_file(response, bubbleOverviewJSONPath)
        ## function to make bubble folders for all the individual bubbles in the overview
        create_bubble_folders(bubbleOverviewJSONPath, bubbles_path, sanitize_folder_name)

    def get_dynamicdetailed_messages(self, bubbleID):
        print(f"Fetching detailed messages for bubble ID: {bubbleID}")  # Debug statement
        try:
            response = get_bubble_messages(accesstoken, bubbleID)
            if response is None or 'messages' not in response:
                print("401 Unauthorized: Access token may be invalid or expired.")
                raise Exception("401 Unauthorized")  # Raise an error if a 401 status code is encountered
            print(f"Retrieved response: {response}")  # Debug statement

            messages = response['messages']
            detailed_messages = []

            if not messages:
                print("No messages found.")
                return detailed_messages

            for message in messages:
                if isinstance(message, dict):
                    detailed_message = {
                        "time_of_sending": message.get("created_at"),
                        "author": message.get("user", {}).get("fullname"),
                        "profilepicurl": message.get("user", {}).get("profilepicurl"),
                        "message_id": message.get("id"),
                        "edit_count": message.get("user_edited_version", 0),
                        "last_edited": message.get("user_edited_at"),
                        "parent_message": message.get("parentmessage_id"),
                        "reactions": message.get("reactionsummary", []),
                        "content": message.get("message")  # Ensure message content is included
                    }
                    # Verify that all required fields are present
                    if all([detailed_message["time_of_sending"], detailed_message["author"], detailed_message["content"]]):
                        detailed_messages.append(detailed_message)
                    else:
                        print(f"Incomplete message data skipped: {detailed_message}")
                else:
                    print(f"Unexpected message format: {message}")

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
                return {"messages": detailed_messages}

            # Save detailed messages to a JSON file within the specific folder for the bubble
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
                        "content": message.get("content")
                    }
                    # Verify that all required fields are present
                    if all([detailed_message["time_of_sending"], detailed_message["author"], detailed_message["content"]]):
                        detailed_messages.append(detailed_message)
                    else:
                        print(f"Incomplete message data skipped: {detailed_message}")

                # Save the full response to fullmessages.json
                with open(full_messages_file_path, "w") as file:
                    json.dump(data, file, indent=4)
                print(f"Full response saved to {full_messages_file_path}")

                return {"messages": detailed_messages}
        except Exception as e:
            print(f"Error fetching local messages: {e}")
            return {"messages": []}

    ## Local JSON Fetching and Parsing
    ## These functions should be called first to fetch the data from the local JSON files
    ## while the dynamic data is also fetched

    def get_Localdms(self, *args):
        print("Fetching DMs")
        dms = get_dms(bubbleOverviewJSONPath)
        print("DMs:", dms)
        return dms

    def get_Localcategorized_bubbles(self, *args):
        print("Fetching categorized bubbles")
        categorized_bubbles = get_categorized_bubbles(bubbleOverviewJSONPath)
        print("Categorized Bubbles:", categorized_bubbles)
        return categorized_bubbles

    def get_Localuncategorized_bubbles(self, *args):
        print("Fetching uncategorized bubbles")
        uncategorized_bubbles = get_uncategorized_bubbles(bubbleOverviewJSONPath)
        print("Uncategorized Bubbles:", uncategorized_bubbles)
        return uncategorized_bubbles

    def get_Localunread_bubbles(self, *args):
        print("Fetching unread bubbles")
        unread_bubbles = get_unread_bubbles(bubbleOverviewJSONPath)
        print("Unread Bubbles:", unread_bubbles)
        return unread_bubbles

    def get_Localcategories(self, *args):
        print("Fetching categories")
        categories = get_categories(bubbleOverviewJSONPath)
        print("Categories:", categories)
        return categories

    def print_chat_info(self, chat_name, chat_id):
        print(f"Clicked on chat: {chat_name}, ID: {chat_id}")

    ## Sending data
    ## such as updating bubbles
    ## sending messages
    ## updating profiles
    ## possibly custom reactions
    ##

    def send_message(self, bubbleID, message, userID, parentmessage_id=None):
        print(f"Sending message to bubble ID {bubbleID}: {message}")
        created_at = time.time()
        uuid = str(uuid.uuid4())
        response = send_message_to_bubble(accesstoken, bubbleID, created_at, message, userID, uuid, parentmessage_id=None)
        print(f"Response: {response}")
        return response

# Create an instance of the Api class with the accesstoken
api = Api(accesstoken)
# Create a webview window with the specified HTML file and API
window = webview.create_window(
    'Better Pronto Alpha',
    f'file://{html_path}',
    js_api=api,
    text_select=True,  # Ensure text selection is enabled
    width=1200,  # Set the width of the window
    height=800   # Set the height of the window
)

# Start the webview with debug mode enabled
webview.start(debug=True)