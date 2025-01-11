import json
from systemcheck import createappfolders
from pronto import requestVerificationEmail, verification_code_to_login_token, login_token_to_access_token, getUsersBubbles
from readjson import save_response_to_file, getvalueLogin, getaccesstoken

auth_path, chats_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

def simpleVerification():
    email = input("Please enter your email:")
    response = requestVerificationEmail(email)
    save_response_to_file(response, f"{verificationCodeResponseJSONPath}")
    code = input("Please enter the verification code:")
    response = verification_code_to_login_token(email, code)
    save_response_to_file(response, f"{loginTokenJSONPath}")
    loginToken = getvalueLogin(loginTokenJSONPath, "logintoken")
    print(f"Login Token: {loginToken}")
    response = login_token_to_access_token(loginToken)
    save_response_to_file(response, f"{authTokenJSONPath}")
    accesstoken = getaccesstoken(authTokenJSONPath)
    print(f"Access Token: {accesstoken}")
    return accesstoken
