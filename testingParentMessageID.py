import webview, os, json, re
from bpro.pronto import *
from bpro.systemcheck import *
from bpro.readjson import *
import time, uuid

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

def send_test_message():
    bubbleID = 4066670
    message = "testing"
    parentmessage_id = 100038156
    created_at = time.time()
    message_uuid = str(uuid.uuid4())
    
    response = send_message_to_bubble(accesstoken, bubbleID, created_at, message, userID, message_uuid, parentmessage_id)
    print(f"Response: {response}")

send_test_message()

