import colorama, requests, json, time, os, platform, logging
from colorama import Fore
from dataclasses import dataclass, asdict
from fuzzywuzzy import process

LoginToken_ResponseFilePath = ""
accessTokenResponseFilePath = ""
listofBubblesFilePath = ""
bubbleFocus = ""
bubbleID = 0

accesstoken = ""
ACCESSTOKEN_STATUS = False
api_base_url = "https://stanfordohs.pronto.io/"
colorama.init(autoreset=True)
betterProntoLogo = """
 __   ___ ___ ___  ___  __      __   __   __       ___  __  
|__) |__   |   |  |__  |__)    |__) |__) /  \ |\ |  |  /  \ 
|__) |___  |   |  |___ |  \    |    |  \ \__/ | \|  |  \__/ 
"""

def check_and_create_json_files():
    # Define the path to the "Better Pronto" folder on the desktop
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    better_pronto_path = os.path.join(desktop_path, "Better Pronto 1.0")
    json_folder_path = os.path.join(better_pronto_path, "JSON")
    chatData_folder_path = os.path.join(json_folder_path, "Chat Data")

    # Define the names of the required JSON files
    required_files = ["accessTokenResponse.json", "LoginToken_Response.json", "listofBubbles.json"]

    # Check if the "Better Pronto" folder exists
    if os.path.exists(better_pronto_path):
        # Check if the "JSON" folder exists within "Better Pronto"
        if os.path.exists(json_folder_path):
            # Check for the required JSON files
            all_files_exist = all(os.path.exists(os.path.join(json_folder_path, file_name)) for file_name in required_files)
            if all_files_exist:
                print(f'All required JSON files already exist in: {json_folder_path}')
        else:
            # Create the "JSON" folder if it doesn't exist
            os.makedirs(json_folder_path)
            print(f'Created folder: {json_folder_path}')
    else:
        # Create the "Better Pronto" folder if it doesn't exist
        os.makedirs(better_pronto_path)
        print(f'Created folder: {better_pronto_path}')
        # Create the "JSON" folder
        os.makedirs(json_folder_path)
        print(f'Created folder: {json_folder_path}')

    # Create the "Chat Data" folder within the "JSON" folder if it doesn't exist
    if not os.path.exists(chatData_folder_path):
        os.makedirs(chatData_folder_path)
        print(f'Created folder: {chatData_folder_path}')
    else:
        print(f'Folder already exists: {chatData_folder_path}')

    # Create the required JSON files if they don't exist
    for file_name in required_files:
        file_path = os.path.join(json_folder_path, file_name)
        if not os.path.exists(file_path):
            # Create the JSON file with an empty string if it doesn't exist
            with open(file_path, 'w') as file:
                file.write('')
            print(f'Created blank file: {file_path}')
        else:
            print(f'File already exists: {file_path}')

def getsystemInfo():
    global LoginToken_ResponseFilePath, accessTokenResponseFilePath, listofBubblesFilePath
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    LoginToken_ResponseFilePath = os.path.join(desktop_path, "Better Pronto 1.0", "JSON", "LoginToken_Response.json")
    accessTokenResponseFilePath = os.path.join(desktop_path, "Better Pronto 1.0", "JSON", "accessTokenResponse.json")
    listofBubblesFilePath = os.path.join(desktop_path, "Better Pronto 1.0", "JSON", "listofBubbles.json")

def makeChatJson():
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    better_pronto_path = os.path.join(desktop_path, "Better Pronto 1.0")
    json_folder_path = os.path.join(better_pronto_path, "JSON")
    chatData_folder_path = os.path.join(json_folder_path, "Chat Data")
    
    # Ensure the Chat Data folder exists
    if not os.path.exists(chatData_folder_path):
        os.makedirs(chatData_folder_path)

    else:
        pass
    
    # Path to the listofBubbles.json file
    listofBubbles_path = os.path.join(json_folder_path, "listofBubbles.json")
    
    try:
        # Read the listofBubbles.json file
        with open(listofBubbles_path, 'r') as file:
            data = json.load(file)
        
        # Access the "bubbles" key in the JSON data
        bubbles_data = data.get("bubbles", [])
        
        # Create a folder for each bubble ID and a JSON file within each folder
        for bubble in bubbles_data:
            bubble_id = bubble.get("id")
            if bubble_id:
                bubble_folder_path = os.path.join(chatData_folder_path, str(bubble_id))
                if not os.path.exists(bubble_folder_path):
                    os.makedirs(bubble_folder_path)
                    
                
                json_file_path = os.path.join(bubble_folder_path, f"{bubble_id}.json")
                if not os.path.exists(json_file_path):
                    # Create an empty file
                    open(json_file_path, 'w').close()
                    
    except FileNotFoundError:
        print(Fore.RED + f"listofBubbles.json not found")
    except json.JSONDecodeError:
        print(Fore.RED + f"Invalid JSON in listofBubbles.json")

# Custom exception for backend errors
class BackendError(Exception):
    pass

# Dataclass for device information
@dataclass
class DeviceInfo:
    browsername: str
    browserversion: str
    osname: str
    type: str
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Function to verify user email
def post_user_verify(email):
    url = "https://accounts.pronto.io/api/v1/user.verify"
    payload = {"email": email}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        raise BackendError(f"HTTP error occurred: {http_err}")
    except Exception as err:
        raise BackendError(f"An error occurred: {err}")

# Function to log in using email and verification code
def token_login(email, verification_code):
    url = "https://accounts.pronto.io/api/v3/user.login"
    device_info = DeviceInfo(
        browsername="Firefox",
        browserversion="130.0.0",
        osname="Windows",
        type="WEB"
    )
    request_payload = {
        "email": email,
        "code": verification_code,
        "device": asdict(device_info)
    }
    headers = {
        "Content-Type": "application/json"
    }
    logger.info(f"Payload being sent: {request_payload}")
    try:
        response = requests.post(url, json=request_payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
        raise BackendError(f"HTTP error occurred: {http_err}")
    except requests.exceptions.RequestException as req_err:
        logger.error(f"Request exception occurred: {req_err}")
        raise BackendError(f"Request exception occurred: {req_err}")
    except Exception as err:
        logger.error(f"An unexpected error occurred: {err}")
        raise BackendError(f"An unexpected error occurred: {err}")

# Function to save response data to a file
def save_response_to_file(response_data, file_path):
    try:
        with open(file_path, "w") as file:
            json.dump(response_data, file, indent=4)
        logger.info(f"Response data saved to {file_path}")
    except IOError as io_err:
        logger.error(f"File write error: {io_err}")

# Function to handle the verification code input and token login process
def verification_code_to_accessToken(email):
    verification_code = input("Please enter the verification code you received: ").strip()
    try:
        start_time = time.time()
        result = token_login(email, verification_code)
        end_time = time.time()
        total_time = end_time - start_time
        print(f"Time to get response: {total_time} seconds.")
        save_response_to_file(result, LoginToken_ResponseFilePath)
        if result.get("ok"):
            logger.info(f"User authenticated: {result}")
        else:
            logger.error(f"Authentication failed: {result.get('error', 'Unknown error')}")
    except BackendError as e:
        logger.error(e)

# Function to search for a key in nested dictionaries
def search_key(data, target_key):
    if isinstance(data, dict):
        for key, value in data.items():
            if key == target_key:
                return value
            elif isinstance(value, dict):
                result = search_key(value, target_key)
                if result is not None:
                    return result
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        result = search_key(item, target_key)
                        if result is not None:
                            return result
    return None

# Function to load data from a file
def load_data_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return str(e)

# Function to load data from a file and search for a specific key
def load_and_search(file_path, target_key):
    data = load_data_from_file(file_path)
    if isinstance(data, dict):
        value = search_key(data, target_key)
        return value if value is not None else f"Key '{target_key}' not found."
    return data
#
#
#
#Main code
#
#
def clear_screen():
    if platform.system() == "Windows":
        os.system("cls")
    else:
        os.system("clear")

def login():
    print(Fore.BLUE + betterProntoLogo)
    print("")
    email = input(Fore.BLUE + "Please enter @ohs.stanford.edu email to login: ")
    request_start_time = time.time()
    result = post_user_verify(email)
    request_end_time = time.time()
    total_time = request_end_time - request_start_time

    result_str = json.dumps(result)  # Convert response to string

    if "INVALID_EMAIL_EMAIL" in result_str:
        clear_screen()
        print(Fore.RED + "Invalid email entered. Please try again.")
        return login()  # Retry login
    if "EMAIL_NOT_FOUND" in result_str:
        clear_screen()
        print(Fore.RED + "Email not found. Please try again with an email registered with Stanford OHS.")
        return login()

    print(Fore.BLUE + "Verification email sent:", result)
    print(Fore.BLUE + f"Request took {total_time:.2f} seconds.")
    verification_code = input(Fore.BLUE + f"Input verification code sent to {email}: ")

    start_time = time.time()
    logintoken = token_login(email, verification_code)
    end_time = time.time()
    total_time = end_time - start_time
    save_response_to_file(logintoken, LoginToken_ResponseFilePath)
    login_token = load_and_search(LoginToken_ResponseFilePath, 'logintoken')

    device_info = {
        "browsername": "firefox",
        "browserversion": "130.0.0",
        "osname": "macOS",
        "type": "WEB",
        "uuid": "314c9314-d5e5-4ae4-84e2-9f2f3938ca28",
        "osversion": "10.15.6",
        "appversion": "1.0.0",
        }
    payload = {
        "logintokens": [login_token],
        "device": device_info,
        }
    start_time = time.time()
    response = requests.post(f"{api_base_url}api/v1/user.tokenlogin", json=payload)
    end_time = time.time()
    print(f"Login completed in {end_time - start_time} seconds")

    if response.status_code == 200:
        response_data = response.json()
        print(Fore.GREEN + "Success:", response_data)
        print(Fore.GREEN + "Login successful")
    else:
        response_data = {"error": response.status_code, "message": response.text}
        print(Fore.RED + f"Error: {response.status_code} - {response.text}")

    with open(accessTokenResponseFilePath, 'w') as file:
        json.dump(response_data, file , indent=4)

    print(Fore.BLUE + "Access Token saved to", Fore.GREEN + accessTokenResponseFilePath)
    clear_screen()

def checkAccessToken():
    global ACCESSTOKEN_STATUS, accesstoken
    try:
        with open(accessTokenResponseFilePath, 'r') as file:
            content = file.read().strip()
            if not content:
                raise FileNotFoundError("File is empty. Please login to get an access token.")
            data = json.loads(content)
            accesstoken = data["users"][0]["accesstoken"]
            user_id = data["users"][0]["user"]["id"]
            username = data["users"][0]["user"]["fullname"]
            print(Fore.GREEN + "UserID:", user_id)
            print(Fore.GREEN + "Username:", username)
            print(Fore.GREEN + "AccessToken:", accesstoken)
            if accesstoken != "":
                ACCESSTOKEN_STATUS = True
    except FileNotFoundError as e:
        print(Fore.RED + str(e))
        ACCESSTOKEN_STATUS = False
    except json.JSONDecodeError:
        print(Fore.RED + "Invalid JSON format. Please login to get a valid access token.")
        ACCESSTOKEN_STATUS = False

    if ACCESSTOKEN_STATUS:
        print(Fore.GREEN + f"Access Token already exists. Skipping login process.")
    else:
        print(Fore.RED + "Access Token does not exist. Please login to get an access token.")
        login()
        checkAccessToken()

def get_users_bubbles():
    print(Fore.BLUE + "Retrieving bubbles...")
    listofBubbles = listofBubblesFilePath
    url = f"{api_base_url}api/v3/bubble.list"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {accesstoken}",  # Ensure 'Bearer' is included
    }

    try:
        start_time = time.time()
        response = requests.post(url, headers=headers)
        end_time = time.time()
        print(f"Request completed in {end_time - start_time} seconds")
        if response.status_code == 200:
            print(Fore.GREEN + "Successfully retrieved bubbles")
        else:
            print(Fore.RED + "Failed to retrieve bubbles, try again")
        response_data = response.json()
        if "UNAUTHORIZED" in response_data:
            print(Fore.RED + "Unauthorized access. Please login to get a valid access token.")
            login()
            checkAccessToken()
            get_users_bubbles()
        response.raise_for_status()  # Raise an error for bad status codes
    except requests.exceptions.HTTPError as http_err:
        print(Fore.RED + f"HTTP error occurred: {http_err} - Response: {response.text}")
        return
    except requests.exceptions.RequestException as req_err:
        print(Fore.RED + f"Request exception occurred: {req_err}")
        return
    except Exception as err:
        print(Fore.RED + f"An unexpected error occurred: {err}")
        return
    

    try:
        with open(listofBubblesFilePath, 'w') as outfile:
            json.dump(response.json(), outfile, indent=4)
        print(Fore.GREEN + f"Response successfully written to {listofBubblesFilePath}")
    except IOError as io_err:
        print(Fore.RED + f"File write error occurred: {io_err}")

def parse_and_get_stats():
    with open(listofBubblesFilePath) as file:
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
    sorted_dms = sorted(dms, key=lambda x: x["title"].lower())  # Sort DMs alphabetically by title
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

    # New section for Unreads
    print("\nUnreads:")
    unread_items = sorted_dms + [chat for chats in sorted_groupChats.values() for chat in chats]
    unread_items = [item for item in unread_items if item["unread"] > 0]
    for item in unread_items:
        print(f'{item["title"]}; {item["id"]}; Unread: {item["unread"]}; '
              f'Unread Mentions: {item["unread_mentions"]}; '
              f'Latest Message Created At: {item["latest_message_created_at"]}')

def pickBubble():
    global bubbleFocus, bubbleID
    bubbleFocus = input("Please enter which bubble you wish to view:")

    with open(listofBubblesFilePath, "r") as file:
        data = json.load(file)
        bubble_titles = [bubble["title"] for bubble in data["bubbles"]]
        closest_match = process.extractOne(bubbleFocus, bubble_titles, score_cutoff=66)
        
        if closest_match:
            for bubble in data["bubbles"]:
                if bubble["title"] == closest_match[0]:
                    bubbleFocus = {"title": bubble['title'], "id": bubble['id']}
                    bubbleID = bubble['id']
                    print(Fore.GREEN + f"Title: {bubble['title']}, ID: {bubble['id']}")
                    return bubbleFocus
                    
        else:
            clear_screen()
            print(Fore.RED + "No close match found, please try again")
            return pickBubble()

def getBubbleMessages(bubbleID, latestMessageID):
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    better_pronto_path = os.path.join(desktop_path, "Better Pronto 1.0")
    json_folder_path = os.path.join(better_pronto_path, "JSON")
    chatData_folder_path = os.path.join(json_folder_path, "Chat Data")
    
    url = f"{api_base_url}/api/v1/bubble.history"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {accesstoken}",
    }
    if latestMessageID is None:
        payload = {"bubble_id": bubbleID}
    if latestMessageID is not None:
        payload = {"bubble_id": bubbleID, "latest": {latestMessageID}}

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        response_json = response.json()
        
        bubble_folder_path = os.path.join(chatData_folder_path, str(bubbleID))
        os.makedirs(bubble_folder_path, exist_ok=True)
        
        bubbleMessagesFilePath = os.path.join(bubble_folder_path, f"{bubbleID}.json")
        with open(bubbleMessagesFilePath, 'w') as infile:
            json.dump(response_json, infile, indent=4)
        print(f"Bubble messages for {bubbleID} have been written to {bubbleMessagesFilePath}")
        
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - Response: {response.text}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request exception occurred: {req_err}")
    except IOError as io_err:
        print(f"File write error occurred: {io_err}")
    except Exception as err:
        print(f"An unexpected error occurred: {err}")

def parseMessages(bubbleID):
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    better_pronto_path = os.path.join(desktop_path, "Better Pronto 1.0")
    json_folder_path = os.path.join(better_pronto_path, "JSON")
    chatData_folder_path = os.path.join(json_folder_path, "Chat Data")
    bubble_folder_path = os.path.join(chatData_folder_path, str(bubbleID))
    messageJSONPath = os.path.join(bubble_folder_path, f"{bubbleID}.json")

    if not os.path.exists(messageJSONPath):
        print("No messages found for bubble ID:", bubbleID)
        return

    with open(messageJSONPath, 'r') as file:
        data = json.load(file)

    if not data.get("ok"):
        print("Failed to retrieve messages")
        return

    messages = data.get("messages", [])
    messages.sort(key=lambda x: x["created_at"])

    for message in messages:
        time = message["created_at"]
        user = message["user"]["fullname"]
        text = message["message"]
        edited = message["user_edited_at"]
        numberofEdits = message["user_edited_version"]
        if edited:
            print(f"{time} {user}: {text} (edited {numberofEdits} times)")
        else:
            print(f"{time} {user}: {text}")


def main():
    check_and_create_json_files()
    getsystemInfo()
    clear_screen()
    checkAccessToken()
    get_users_bubbles()
    parse_and_get_stats()
    makeChatJson()
    pickBubble()
    getBubbleMessages(bubbleID, None)
    parseMessages(bubbleID)

main()
