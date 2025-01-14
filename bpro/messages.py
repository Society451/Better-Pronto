from pronto import get_bubble_messages
from readjson import save_response_to_file, getaccesstoken

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()


accesstoken = getaccesstoken(authTokenJSONPath)

bubbleID = 3955366