from systemcheck import createappfolders
from pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles
from simplifiedAuth import simpleVerification
from readjson import save_response_to_file, getaccesstoken, getbubbleoverview

auth_path, chats_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

#accesstoken = simpleVerification()

accesstoken = getaccesstoken(authTokenJSONPath)
print("Access Token:", accesstoken)

def getBubbles(accesstoken):
    bubbles = getUsersBubbles(accesstoken)
    save_response_to_file(bubbles, bubbleOverviewJSONPath)
    print("Bubbles have been saved to:", bubbleOverviewJSONPath)
    dms, categorizedgroups, uncategorizedgroups, unread_bubbles = getbubbleoverview(bubbleOverviewJSONPath)
    #print("DMs:", dms)
    #print("Categorized Groups:", categorizedgroups)
    #print("Uncategorized Groups:", uncategorizedgroups)
    #print("Unread Bubbles:", unread_bubbles)

#getBubbles(accesstoken)