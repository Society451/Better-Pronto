import os

def createappfolders():
    base_path = os.path.expanduser("~/.bpro")
    data_path = os.path.join(base_path, "data")
    client_path = os.path.join(base_path, "client")
    auth_path = os.path.join(data_path, "auth")
    chats_path = os.path.join(data_path, "chats")
    bubbles_path = os.path.join(chats_path, "bubbles")  # New folder path
    users_path = os.path.join(data_path, "users")  # New folder path
    loginTokenJSONPath = os.path.join(auth_path, "loginToken.json")
    authTokenJSONPath = os.path.join(auth_path, "authToken.json")
    verificationCodeResponseJSONPath = os.path.join(auth_path, "verificationCoderesponse.json")
    settings_path = os.path.join(client_path, "settings")
    encryption_path = os.path.join(client_path, "encryption")
    logs_path = os.path.join(client_path, "logs")
    settingsJSONPath = os.path.join(settings_path, "settings.json")
    keysJSONPath = os.path.join(encryption_path, "keys.json")
    bubbleOverviewJSONPath = os.path.join(chats_path, "bubbleOverview.json")
    os.makedirs(auth_path, exist_ok=True)
    os.makedirs(chats_path, exist_ok=True)
    os.makedirs(bubbles_path, exist_ok=True)  # Create the new folder
    os.makedirs(users_path, exist_ok=True)  # Create the new folder
    os.makedirs(settings_path, exist_ok=True)
    os.makedirs(encryption_path, exist_ok=True)
    os.makedirs(logs_path, exist_ok=True)

    if os.path.exists(loginTokenJSONPath):
        print("The file already exists:", loginTokenJSONPath)
    else:
        with open(loginTokenJSONPath, "w") as file:
            print("Login Token JSON has been created:", loginTokenJSONPath)
            pass

    if os.path.exists(authTokenJSONPath):
        print("The file already exists:", authTokenJSONPath)
    else:
        with open(authTokenJSONPath, "w") as file:
            print("Auth Token JSON has been created:", authTokenJSONPath)
            pass

    if os.path.exists(verificationCodeResponseJSONPath):
        print("The file already exists:", verificationCodeResponseJSONPath)
    else:
        with open(verificationCodeResponseJSONPath, "w") as file:
            print("Verification Code Response JSON has been created:", verificationCodeResponseJSONPath)
            pass

    if os.path.exists(settingsJSONPath):
        print("The file already exists:", settingsJSONPath)
    else:
        with open(settingsJSONPath, "w") as file:
            print("Settings JSON has been created:", settingsJSONPath)
            pass

    if os.path.exists(keysJSONPath):
        print("The file already exists:", keysJSONPath)
    else:
        with open(keysJSONPath, "w") as file:
            print("Keys JSON has been created:", keysJSONPath)
            pass

    if os.path.exists(bubbleOverviewJSONPath):
        print("The file already exists:", bubbleOverviewJSONPath)
    else:
        with open(bubbleOverviewJSONPath, "w") as file:
            print("Bubble Overview JSON has been created:", bubbleOverviewJSONPath)
            pass

    return auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path