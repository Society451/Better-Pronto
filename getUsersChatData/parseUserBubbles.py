import json

def parse_and_get_stats():
    with open(r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json") as file:
        data = json.load(file)

    stats_by_id = {stat["bubble_id"]: stat for stat in data["stats"]}
    dms, groupChats = [], {}

    for bubble in data["bubbles"]:
        info = {
            "title": bubble["title"],
            "id": bubble["id"],
            "unread": stats_by_id.get(bubble["id"], {}).get("unread", 0),
            "unread_mentions": stats_by_id.get(bubble["id"], {}).get("unread_mentions", 0),
            "latest_message_created_at": stats_by_id.get(bubble["id"], {}).get("latest_message_created_at", "")
        }
        if bubble.get("isdm", False):
            dms.append(info)
        else:
            category = bubble.get("category") or {}
            category_title = category.get("title", "No Category")
            groupChats.setdefault(category_title, []).append(info)

    key_func = lambda x: (-x["unread_mentions"], -x["unread"])
    sorted_dms = sorted(dms, key=key_func)
    sorted_groupChats = {k: sorted(v, key=key_func) for k, v in groupChats.items()}

    print("\nDMs:")
    for dm in sorted_dms:
        print(f'{dm["title"]}; {dm["id"]}; Unread: {dm["unread"]}; '
              f'Unread Mentions: {dm["unread_mentions"]}; '
              f'Latest Message Created At: {dm["latest_message_created_at"]}')

    print("\nGroup Chats with Stats:")
    for category in sorted(sorted_groupChats):
        print(f'{category}:')
        for chat in sorted_groupChats[category]:
            print(f'  {chat["title"]}; {chat["id"]}; Unread: {chat["unread"]}; '
                  f'Unread Mentions: {chat["unread_mentions"]}; '
                  f'Latest Message Created At: {chat["latest_message_created_at"]}')

parse_and_get_stats()
