import json

def parse_user_bubbles():
    json_file_path = r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json"
    with open(json_file_path, 'r') as file:
        data = json.load(file)

    groupChats = {}
    dms = []

    for bubble in data["bubbles"]:
        if bubble["dmpartner"] is not None:
            dms.append(f'{bubble["title"]}; {bubble["id"]}')
        else:
            category_title = bubble["category"]["title"] if bubble["category"] else "No Category"
            if category_title not in groupChats:
                groupChats[category_title] = []
            groupChats[category_title].append(f'{bubble["title"]}; {bubble["id"]}')

    # Sort group chats by category title and then alphabetically by group chat title
    sorted_groupChats = {k: sorted(v) for k, v in sorted(groupChats.items())}

    #print("\nDMs:")
    #for dm in dms:
    #    print(dm)

    #print("\nGroup Chats:")
    #for category, groupChatList in sorted_groupChats.items():
    #    print(f'{category}:')
    #    for groupChat in groupChatList:
    #        print(f'  {groupChat}')

# Example usage
parse_user_bubbles()
def getStats():
    json_file_path = r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json"
    with open(json_file_path, 'r') as file:
        data = json.load(file)

    stats = data["stats"]
    groupChats = {}

    for stat in stats:
        bubble_id = stat["bubble_id"]
        unread = stat["unread"]
        unread_mentions = stat["unread_mentions"]
        latest_message_created_at = stat["latest_message_created_at"]

        for bubble in data["bubbles"]:
            if bubble["id"] == bubble_id:
                category_title = bubble["category"]["title"] if bubble["category"] else "No Category"
                if category_title not in groupChats:
                    groupChats[category_title] = []
                groupChats[category_title].append({
                    "title": bubble["title"],
                    "id": bubble["id"],
                    "unread": unread,
                    "unread_mentions": unread_mentions,
                    "latest_message_created_at": latest_message_created_at
                })

    # Sort group chats by category title and then alphabetically by group chat title
    sorted_groupChats = {k: sorted(v, key=lambda x: x["title"]) for k, v in sorted(groupChats.items())}

    print("\nGroup Chats with Stats:")
    for category, groupChatList in sorted_groupChats.items():
        print(f'{category}:')
        for groupChat in groupChatList:
            print(f'  {groupChat["title"]}; {groupChat["id"]}; Unread: {groupChat["unread"]}; '
                  f'Unread Mentions: {groupChat["unread_mentions"]}; '
                  f'Latest Message Created At: {groupChat["latest_message_created_at"]}')

# Example usage
getStats()
