import webview, os, json, re, time, uuid, mimetypes, requests, urllib.parse
from bpro.pronto import Pronto
from bpro.systemcheck import *
from bpro.readjson import ReadJSON
from bproapi import *

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
webview.start(debug=False)