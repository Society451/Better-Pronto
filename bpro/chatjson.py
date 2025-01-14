from readjson import save_response_to_file, getdetailedbubbleoverview
from systemcheck import createappfolders
import os

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath = createappfolders()

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

# Call the function to create the folders
create_bubble_folders(bubbleOverviewJSONPath, bubbles_path)
