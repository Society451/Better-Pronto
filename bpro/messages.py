from pronto import get_bubble_messages
from readjson import save_response_to_file, getaccesstoken
from systemcheck import createappfolders

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

accesstoken = getaccesstoken(authTokenJSONPath)
bubbleID = 2828820

def get_detailed_messages(accesstoken, bubbleID):
    messages = get_bubble_messages(accesstoken, bubbleID)
    print(f"Retrieved messages: {messages}")  # Debug print
    detailed_messages = []

    if not messages:
        print("No messages found.")
        return detailed_messages

    for message in messages:
        if isinstance(message, dict):
            detailed_message = {
                "time_of_sending": message.get("created_at"),
                "author": message.get("user", {}).get("fullname"),
                "message_id": message.get("id"),
                "edit_count": message.get("user_edited_version", 0),
                "last_edited": message.get("user_edited_at"),
                "parent_message": message.get("parentmessage_id"),
                "reactions": message.get("reactionsummary", [])
            }
            detailed_messages.append(detailed_message)
    
    return detailed_messages

detailed_messages = get_detailed_messages(accesstoken, bubbleID)
print(detailed_messages)