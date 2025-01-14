import webview
import json
import os
from bpro.pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles
from bpro.systemcheck import createappfolders
from bpro.readjson import getbubbleoverview

auth_path, chats_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

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
            # Extract the login token and first name
            value = data["users"][0][f"{value}"]

            return value
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

class Api:
    def __init__(self):
        self.email = ""

    def makeNewWindow(windowName, windowURL, api):
        window = webview.create_window(windowName, windowURL, js_api=api)
        return window

    # Method to handle email input
    def handle_email(self, email):
        if "stanford.edu" in email:
            self.email = email
            print("Email accepted and verification code has been sent")
            return "Email accepted"
        else:
            return "Invalid email domain"

    # Method to handle verification code input
    def handle_verification_code(self, code):
        print("Verification code checked")
        response = "ok"  # Replace with actual verification logic
        if "ok" in response:
            print("Login token received")
            # Create a new window for chat.html with js_api=self
            chat_html_path = os.path.join(os.path.dirname(__file__), 'frontend', 'html', 'chat.html')
            chat_window = webview.create_window(
                'Chat',
                f'file:///{chat_html_path}',  # Updated URL
                js_api=self
            )
            chat_window.resize(1200, 800)
        # Save the response to a file
        save_response_to_file(response, loginTokenJSONPath)
        return "ok"
    
    def accessToken(self):
        print("Access token method called")  # Debugging statement
        logintoken = getvalueLogin(loginTokenJSONPath, "logintoken")
        if logintoken:
            print(f"Login token found: {logintoken}")  # Debugging statement
            response = login_token_to_access_token(logintoken)
            save_response_to_file(response, f"{authTokenJSONPath}")
            print("Access token received")
            print(response)
            
            # Debugging: Check if the file is written correctly
            try:
                with open(authTokenJSONPath, "r") as file:
                    written_data = json.load(file)
                    print("Written data:", written_data)
            except Exception as e:
                print(f"Error reading written file: {e}")
            
            return "Ok"  # Return the access token response
        else:
            print("Login token not found")
            return None
        
    def get_users_bubbles(self, access_token):
        print("Get users bubbles method called")  # Existing debug statement
        response = getUsersBubbles(access_token)
        save_response_to_file(response, bubbleOverviewJSONPath)
        print("getUsersBubbles response saved to file")  # New debug statement
        if response:
            print("Users bubbles received")  # Existing debug statement
            dms, categorizedgroups, uncategorizedgroups, unread_bubbles = getbubbleoverview(bubbleOverviewJSONPath)
            print("DMs:", dms)  # Existing debug statement
            print("Categorized Groups:", categorizedgroups)  # Existing debug statement
            print("Uncategorized Groups:", uncategorizedgroups)  # Existing debug statement
            print("Unread Bubbles:", unread_bubbles)  # Existing debug statement
            # Return them as a tuple instead of concatenating
            return "Ok", (dms, categorizedgroups, uncategorizedgroups, unread_bubbles)
        else:
            print("Users bubbles not received")  # Existing debug statement
            return "Error"

    def get_bubbles_and_categories(self, access_token):
        print("Fetching bubbles and categories")  # Existing debug statement
        response = self.get_users_bubbles(access_token)
        print("get_users_bubbles response:", response)  # New debug statement
        if response and response[0] == "Ok":
            dms, categorizedgroups, uncategorizedgroups, unread_bubbles = response[1]
            print("Parsed bubbles and categories:", {
                "dms": dms,
                "categorizedgroups": categorizedgroups,
                "uncategorizedgroups": uncategorizedgroups,
                "unread_bubbles": unread_bubbles
            })  # New debug statement
            return {
                "dms": dms,
                "categorizedgroups": categorizedgroups,
                "uncategorizedgroups": uncategorizedgroups,
                "unread_bubbles": unread_bubbles
            }
        else:
            print("Failed to fetch bubbles and categories")  # New debug statement
            return {"error": "Failed to fetch bubbles and categories"}

# Create an instance of the Api class
api = Api()
# Create a webview window with the specified HTML file and API
window = webview.create_window(
    'Better Pronto Alpha',
    'file:///home/paul/Desktop/Better-Pronto-Alpha/frontend/html/login.html',  # Updated URL
    js_api=api
)
# Start the webview with debug mode enabled
webview.start(debug=True)