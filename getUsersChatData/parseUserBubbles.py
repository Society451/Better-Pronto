import json

def parse_and_get_stats():
    json_file_path = r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json"
    with open(json_file_path, 'r') as file:
        data = json.load(file)

    groupChats = {}
    dms = []

    for bubble in data["bubbles"]:
        if bubble.get("isdm", False):
            dms.append({
                "title": bubble["title"],
                "id": bubble["id"],
                "unread": 0,
                "unread_mentions": 0,
                "latest_message_created_at": ""
            })
        else:
            category_title = bubble["category"]["title"] if bubble["category"] else "No Category"
            if category_title not in groupChats:
                groupChats[category_title] = []
            groupChats[category_title].append({
                "title": bubble["title"],
                "id": bubble["id"],
                "unread": 0,
                "unread_mentions": 0,
                "latest_message_created_at": ""
            })

    for stat in data["stats"]:
        bubble_id = stat["bubble_id"]
        for dm in dms:
            if dm["id"] == bubble_id:
                dm["unread"] = stat["unread"]
                dm["unread_mentions"] = stat["unread_mentions"]
                dm["latest_message_created_at"] = stat["latest_message_created_at"]
        for category, bubbles in groupChats.items():
            for bubble in bubbles:
                if bubble["id"] == bubble_id:
                    bubble["unread"] = stat["unread"]
                    bubble["unread_mentions"] = stat["unread_mentions"]
                    bubble["latest_message_created_at"] = stat["latest_message_created_at"]

    sorted_groupChats = {k: sorted(v, key=lambda x: (-x["unread_mentions"], -x["unread"])) for k, v in sorted(groupChats.items())}
    sorted_dms = sorted(dms, key=lambda x: (-x["unread_mentions"], -x["unread"]))

    print("\nDMs:")
    for dm in sorted_dms:
        print(f'{dm["title"]}; {dm["id"]}; Unread: {dm["unread"]}; '
              f'Unread Mentions: {dm["unread_mentions"]}; '
              f'Latest Message Created At: {dm["latest_message_created_at"]}')

    print("\nGroup Chats with Stats:")
    for category, groupChatList in sorted_groupChats.items():
        print(f'{category}:')
        for groupChat in groupChatList:
            print(f'  {groupChat["title"]}; {groupChat["id"]}; Unread: {groupChat["unread"]}; '
                  f'Unread Mentions: {groupChat["unread_mentions"]}; '
                  f'Latest Message Created At: {groupChat["latest_message_created_at"]}')

parse_and_get_stats()
