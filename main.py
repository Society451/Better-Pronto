import webview
import json
import os
from bpro.pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles
from bpro.systemcheck import createappfolders

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
        response = "ok" #verification_code_to_login_token(self.email, code)
        if "ok" in response:
            print("Login token received")
            # Resize the window and redirect to chat.html
            chat_html_path = os.path.join(os.path.dirname(__file__), 'frontend', 'html', 'chat.html')
            window.load_url(f'file://{chat_html_path}')
            window.resize(1200, 800)
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
        
    def getUsersBubbles(access_token):
        print("Get users bubbles method called")
        response = getUsersBubbles(access_token)
        save_response_to_file(response, f"{bubbleOverviewJSONPath}")
        if response:
            print("Users bubbles received")
            return "Ok"
        else:
            print("Users bubbles not received")
            return "Error"

# Create an instance of the Api class
api = Api()
# Create a webview window with the specified HTML file and API
window = webview.create_window('Better Pronto Alpha', 'file:////home/paul/Desktop/Better-Pronto-Alpha/frontend/html/login.html', js_api=api)
# Start the webview with debug mode enabled
webview.start(debug=True)