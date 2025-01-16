import webview
import json
import os
from bpro.pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles, get_bubble_messages
from bpro.systemcheck import createappfolders
from bpro.readjson import getbubbleoverview, get_dms, get_categorized_bubbles, get_uncategorized_bubbles, get_unread_bubbles, get_categories, getaccesstoken

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

accesstoken = getaccesstoken(authTokenJSONPath)
if accesstoken:
    print(f"Access token: {accesstoken}")
else:
    print("Access token not found or invalid")

current_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(current_dir, 'frontend', 'html', 'login.html')

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

class Api:
    def __init__(self, accesstoken):
        self.email = ""
        self.accesstoken = accesstoken

    def makeNewWindow(windowName, windowURL, api):
        window = webview.create_window(windowName, windowURL, js_api=api)
        return window

    def handle_email(self, email):
        if "stanford.edu" in email:
            self.email = email
            response = requestVerificationEmail(email)
            print("Email accepted and verification code has been sent")
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
        return self.accessToken()
    
    def accessToken(self):
        print("Access token method called")
        logintoken = getvalueLogin(loginTokenJSONPath, "logintoken")
        if logintoken:
            print(f"Login token found: {logintoken}")
            response = login_token_to_access_token(logintoken)
            print(f"Access token response: {response}")
            if response:
                save_response_to_file(response, f"{authTokenJSONPath}")
                print("Access token received============================================================")
                print(response)
                try:
                    with open(authTokenJSONPath, "r") as file:
                        written_data = json.load(file)
                        print("Written data:", written_data)
                except Exception as e:
                    print(f"Error reading written file: {e}")
                return "Ok"
            else:
                print("Failed to get access token from login token")
                return None
        else:
            print("Login token not found")
            return None

    def get_dms(self, *args):
        print("Fetching DMs")
        dms = get_dms(bubbleOverviewJSONPath)
        print("DMs:", dms)
        return dms

    def get_categorized_bubbles(self, *args):
        print("Fetching categorized bubbles")
        categorized_bubbles = get_categorized_bubbles(bubbleOverviewJSONPath)
        print("Categorized Bubbles:", categorized_bubbles)
        return categorized_bubbles

    def get_uncategorized_bubbles(self, *args):
        print("Fetching uncategorized bubbles")
        uncategorized_bubbles = get_uncategorized_bubbles(bubbleOverviewJSONPath)
        print("Uncategorized Bubbles:", uncategorized_bubbles)
        return uncategorized_bubbles

    def get_unread_bubbles(self, *args):
        print("Fetching unread bubbles")
        unread_bubbles = get_unread_bubbles(bubbleOverviewJSONPath)
        print("Unread Bubbles:", unread_bubbles)
        return unread_bubbles

    def get_categories(self, *args):
        print("Fetching categories")
        categories = get_categories(bubbleOverviewJSONPath)
        print("Categories:", categories)
        return categories
    
    def get_detailed_messages(self, bubbleID):
        print(f"Fetching detailed messages for bubble ID: {bubbleID}")  # Debug statement
        messages = get_bubble_messages(self.accesstoken, bubbleID)
        print(f"Retrieved messages: {messages}")  # Debug statement
        detailed_messages = []

        if not messages:
            print("No messages found.")
            return detailed_messages

        for message in messages:
            if isinstance(message, dict):
                detailed_message = {
                    "time_of_sending": message.get("created_at"),
                    "author": message.get("user", {}).get("fullname"),
                    "message_id": message.get("id"),
                    "edit_count": message.get("user_edited_version", 0),
                    "last_edited": message.get("user_edited_at"),
                    "parent_message": message.get("parentmessage_id"),
                    "reactions": message.get("reactionsummary", [])
                }
                detailed_messages.append(detailed_message)
    
        return detailed_messages

    def print_chat_name(self, chat_name):
        print(f"Clicked on chat: {chat_name}")

    def print_chat_info(self, chat_name, chat_id):
        print(f"Clicked on chat: {chat_name}, ID: {chat_id}")

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