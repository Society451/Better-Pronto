import json
from systemcheck import createappfolders

auth_path, chats_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

def save_response_to_file(response_data, file_path):
    try:
        with open(file_path, "w") as file:
            json.dump(response_data, file, indent=4)
    except Exception as e:
        print(f"Error saving response to file: {e}")

def getvalueLogin(file_path, value):
    try:
        with open(file_path, "r") as file:
            data = json.load(file)
            value = data["users"][0][f"{value}"]
            return value
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def getaccesstoken(file_path):
    try:
        with open(file_path, "r") as file:
            data = json.load(file)
            value = data["users"][0]["accesstoken"]
            return value
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def getbubbleoverview(bubbleOverviewJSONPath):
    try:
        with open(bubbleOverviewJSONPath, "r") as file:
            data = json.load(file)
            if not data or "bubbles" not in data or "stats" not in data:
                print("Invalid JSON structure or empty file.")
                return None, None, None, None

            bubbles = data["bubbles"]
            stats = data["stats"]

            # Separate and sort DM bubbles by name
            sorted_dm_bubbles = sorted(
                [bubble["title"] for bubble in bubbles if bubble.get("isdm")],
                key=lambda x: x
            )

            # Categorize and sort Non-DM bubbles
            categorizedgroups = {}
            uncategorizedgroups = []
            unread_bubbles = []

            for bubble in (b for b in bubbles if not b.get("isdm")):
                category = bubble.get("category")
                category_title = category["title"] if category and "title" in category else None
                if category_title:
                    if category_title not in categorizedgroups:
                        categorizedgroups[category_title] = []
                    categorizedgroups[category_title].append(bubble["title"])
                else:
                    uncategorizedgroups.append(bubble["title"])

            # Sort bubbles within each category
            for category in categorizedgroups:
                categorizedgroups[category].sort()
            # Sort the categories themselves
            categorizedgroups = dict(sorted(categorizedgroups.items()))

            # Sort uncategorized groups
            uncategorizedgroups.sort()

            # Identify unread bubbles
            bubble_id_to_title = {bubble["id"]: bubble["title"] for bubble in bubbles}
            unread_bubbles = [
                {
                    "title": bubble_id_to_title.get(stat["bubble_id"]),
                    "unread": stat.get("unread", 0),
                    "unread_mentions": stat.get("unread_mentions", 0)
                }
                for stat in stats
                if stat.get("marked_unread", 0) > 0 or stat.get("unread", 0) > 0 or stat.get("unread_mentions", 0) > 0
                if bubble_id_to_title.get(stat["bubble_id"])
            ]

            return sorted_dm_bubbles, categorizedgroups, uncategorizedgroups, unread_bubbles
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None, None, None, None

def get_dms(bubbleOverviewJSONPath):
    try:
        sorted_dm_bubbles, _, _, _ = getbubbleoverview(bubbleOverviewJSONPath)
        return sorted_dm_bubbles
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def get_categorized_groups(bubbleOverviewJSONPath):
    try:
        _, categorizedgroups, _, _ = getbubbleoverview(bubbleOverviewJSONPath)
        return categorizedgroups
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def get_uncategorized_groups(bubbleOverviewJSONPath):
    try:
        _, _, uncategorizedgroups, _ = getbubbleoverview(bubbleOverviewJSONPath)
        return uncategorizedgroups
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def get_unread_bubbles(bubbleOverviewJSONPath):
    try:
        _, _, _, unread_bubbles = getbubbleoverview(bubbleOverviewJSONPath)
        return unread_bubbles
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None



#print(get_dms(bubbleOverviewJSONPath))
#print(get_categorized_groups(bubbleOverviewJSONPath))
#print(get_uncategorized_groups(bubbleOverviewJSONPath))
#print(get_unread_bubbles(bubbleOverviewJSONPath))