import webview, os, json
from bpro.pronto import *
from bpro.systemcheck import createappfolders
from bpro.readjson import *
import time, uuid

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()
accesstoken = ""

userid = 5302585

def getLocalAccesstoken():
    global accesstoken
    accesstoken = getaccesstoken(authTokenJSONPath)
    if accesstoken:
        print(f"Access token: {accesstoken}")
    else:
        print("Access token not found or invalid")
getLocalAccesstoken()

user_info = userInfo(accesstoken, userid)
print(user_info)

# Save user information to diana.json
with open('diana4.json', 'w') as json_file:
    json.dump(user_info, json_file, indent=4)