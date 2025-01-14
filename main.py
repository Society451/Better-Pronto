import webview
import json
import os
from bpro.pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles
from bpro.systemcheck import createappfolders
from bpro.readjson import getbubbleoverview, get_dms, get_categorized_bubbles, get_uncategorized_bubbles, get_unread_bubbles, get_categories

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

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
            # Extract the login token and first name
            value = data["users"][0][value]
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
            #print("Verification code response:", requestVerificationEmail(email))
            return "Email accepted"
        else:
            return "Invalid email domain"

    # Method to handle verification code input
    def handle_verification_code(self, code):
        print("Verification code checked")
        response = verification_code_to_login_token(self.email, code)  # Replace with actual verification logic
        if "ok" in response:
            print("Login token received")
        save_response_to_file(response, loginTokenJSONPath)
        return "ok"
    #add more logic here later
    
    def accessToken(self):
        print("Access token method called")  # Debugging statement
        logintoken = getvalueLogin(loginTokenJSONPath, "logintoken")
        if logintoken:
            print(f"Login token found: {logintoken}")  # Debugging statement
            response = login_token_to_access_token(logintoken)
            print(f"Access token response: {response}")  # Debugging statement
            if response:
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
                print("Failed to get access token from login token")  # Debugging statement
                return None
        else:
            print("Login token not found")
            return None

    def get_dms(self, access_token=None):
        print("Fetching DMs")  # Debugging statement
        #if access_token:
        #    response = getUsersBubbles(access_token)
        #    save_response_to_file(response, bubbleOverviewJSONPath)
        dms = get_dms(bubbleOverviewJSONPath)
        print("DMs:", dms)  # Debugging statement
        return dms

    def get_categorized_bubbles(self, access_token=None):
        print("Fetching categorized bubbles")  # Debugging statement
        #if access_token:
        #    response = getUsersBubbles(access_token)
        #    save_response_to_file(response, bubbleOverviewJSONPath)
        categorized_bubbles = get_categorized_bubbles(bubbleOverviewJSONPath)
        print("Categorized Bubbles:", categorized_bubbles)  # Debugging statement
        return categorized_bubbles

    def get_uncategorized_bubbles(self, access_token=None):
        print("Fetching uncategorized bubbles")  # Debugging statement
        #if access_token:
        #    response = getUsersBubbles(access_token)
        #    save_response_to_file(response, bubbleOverviewJSONPath)
        uncategorized_bubbles = get_uncategorized_bubbles(bubbleOverviewJSONPath)
        print("Uncategorized Bubbles:", uncategorized_bubbles)  # Debugging statement
        return uncategorized_bubbles

    def get_unread_bubbles(self, access_token=None):
        print("Fetching unread bubbles")  # Debugging statement
        #if access_token:
        #    response = getUsersBubbles(access_token)
        #    save_response_to_file(response, bubbleOverviewJSONPath)
        unread_bubbles = get_unread_bubbles(bubbleOverviewJSONPath)
        print("Unread Bubbles:", unread_bubbles)  # Debugging statement
        return unread_bubbles

    def get_categories(self, access_token=None):
        print("Fetching categories")  # Debugging statement
        #if access_token:
        #    response = getUsersBubbles(access_token)
        #    save_response_to_file(response, bubbleOverviewJSONPath)
        categories = get_categories(bubbleOverviewJSONPath)
        print("Categories:", categories)  # Debugging statement
        return categories

# Create an instance of the Api class
api = Api()
# Create a webview window with the specified HTML file and API
window = webview.create_window(
    'Better Pronto Alpha',
    'file:///home/paul/Desktop/Better-Pronto-Alpha/frontend/html/chat.html',  # Updated URL
    js_api=api
)
# Start the webview with debug mode enabled
webview.start(debug=True)