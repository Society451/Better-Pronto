import json
from .systemcheck import createappfolders
import os

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

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

def getdetailedbubbleoverview(bubbleOverviewJSONPath):
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
                [{"id": bubble["id"], "title": bubble["title"]} for bubble in bubbles if bubble.get("isdm")],
                key=lambda x: x["title"]
            )

            # Categorize and sort Non-DM bubbles
            categorizedgroups = {}
            uncategorizedgroups = []
            unread_bubbles = []

            for bubble in (b for b in bubbles if not b.get("isdm")):
                category = bubble.get("category")
                category_title = category["title"] if category and "title" in category else None
                bubble_info = {"id": bubble["id"], "title": bubble["title"]}
                if category_title:
                    if category_title not in categorizedgroups:
                        categorizedgroups[category_title] = []
                    categorizedgroups[category_title].append(bubble_info)
                else:
                    uncategorizedgroups.append(bubble_info)

            # Sort bubbles within each category
            for category in categorizedgroups:
                categorizedgroups[category].sort(key=lambda x: x["title"])
            # Sort the categories themselves
            categorizedgroups = dict(sorted(categorizedgroups.items()))

            # Sort uncategorized groups
            uncategorizedgroups.sort(key=lambda x: x["title"])

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

def get_categorized_bubbles(bubbleOverviewJSONPath):
    try:
        _, categorizedgroups, _, _ = getbubbleoverview(bubbleOverviewJSONPath)
        return categorizedgroups
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

def get_uncategorized_bubbles(bubbleOverviewJSONPath):
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

def get_categories(bubbleOverviewJSONPath):
    try:
        _, categorizedgroups, _, _ = getbubbleoverview(bubbleOverviewJSONPath)
        return list(categorizedgroups.keys())
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None


#create bubbles
def create_bubble_folders(bubbleOverviewJSONPath, bubbles_path):
    bubbles = getdetailedbubbleoverview(bubbleOverviewJSONPath)

    # Create folders for each category and bubble ID
    if bubbles:
        sorted_dm_bubbles, categorizedgroups, uncategorizedgroups, _ = bubbles
        
        # Create folders for categorized bubbles
        for category, bubble_list in categorizedgroups.items():
            category_folder_path = os.path.join(bubbles_path, category)
            os.makedirs(category_folder_path, exist_ok=True)
            print(f"Folder created for category {category}: {category_folder_path}")
            
            for bubble in bubble_list:
                bubble_id = bubble["id"]
                bubble_title = bubble["title"]
                bubble_folder_name = f"{bubble_id} - {bubble_title}"
                bubble_folder_path = os.path.join(category_folder_path, bubble_folder_name)
                os.makedirs(bubble_folder_path, exist_ok=True)
                print(f"Folder created for bubble {bubble_folder_name} in category {category}: {bubble_folder_path}")
        
        # Create folders for uncategorized bubbles
        uncategorized_folder_path = os.path.join(bubbles_path, "Uncategorized")
        os.makedirs(uncategorized_folder_path, exist_ok=True)
        print(f"Folder created for Uncategorized bubbles: {uncategorized_folder_path}")
        
        for bubble in uncategorizedgroups:
            bubble_id = bubble["id"]
            bubble_title = bubble["title"]
            bubble_folder_name = f"{bubble_id} - {bubble_title}"
            bubble_folder_path = os.path.join(uncategorized_folder_path, bubble_folder_name)
            os.makedirs(bubble_folder_path, exist_ok=True)
            print(f"Folder created for uncategorized bubble {bubble_folder_name}: {bubble_folder_path}")
        
        # Create folders for DM bubbles
        dm_folder_path = os.path.join(bubbles_path, "DMs")
        os.makedirs(dm_folder_path, exist_ok=True)
        print(f"Folder created for DM bubbles: {dm_folder_path}")
        
        for bubble in sorted_dm_bubbles:
            bubble_id = bubble["id"]
            bubble_title = bubble["title"]
            bubble_folder_name = f"{bubble_id} - {bubble_title}"
            bubble_folder_path = os.path.join(dm_folder_path, bubble_folder_name)
            os.makedirs(bubble_folder_path, exist_ok=True)
            print(f"Folder created for DM bubble {bubble_folder_name}: {bubble_folder_path}")

# Example usage:
#categories = get_categories(bubbleOverviewJSONPath)
#print(categories)
#print(get_dms(bubbleOverviewJSONPath))
#print(get_categorized_bubbles(bubbleOverviewJSONPath))
#print(get_uncategorized_bubbles(bubbleOverviewJSONPath))
#print(get_unread_bubbles(bubbleOverviewJSONPath))