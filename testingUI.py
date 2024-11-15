import colorama, requests, json
from colorama import Fore
import time
import os
import platform
import logging
from dataclasses import dataclass, asdict
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
        save_response_to_file(result, r"C:\Users\paul\Desktop\Better Pronto\Authentication\JSON\LoginToken_Response.json")
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




accesstoken = ""
ACCESSTOKEN = False
api_base_url = "https://stanfordohs.pronto.io/"
colorama.init(autoreset=True)
betterProntoLogo = """
 __   ___ ___ ___  ___  __      __   __   __       ___  __  
|__) |__   |   |  |__  |__)    |__) |__) /  \ |\ |  |  /  \ 
|__) |___  |   |  |___ |  \    |    |  \ \__/ | \|  |  \__/ 
"""
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

    print(Fore.BLUE + "Verification email sent:", result)
    print(Fore.BLUE + f"Request took {total_time:.2f} seconds.")
    verification_code = input(Fore.BLUE + f"Input verification code sent to {email}: ")

    start_time = time.time()
    logintoken = token_login(email, verification_code)
    end_time = time.time()
    total_time = end_time - start_time
    save_response_to_file(logintoken, r"C:\Users\paul\Desktop\Better Pronto Tests\terminalUI\LoginToken_Response.json")
    login_token = load_and_search(r"C:\Users\paul\Desktop\Better Pronto Tests\terminalUI\LoginToken_Response.json", 'logintoken')

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

    response_filePath = r"C:\Users\paul\Desktop\Better Pronto\Authentication\JSON\accessTokenResponse.json"
    with open(response_filePath, 'w') as file:
        json.dump(response_data, file , indent=4)

    print(Fore.BLUE + "Access Token saved to", Fore.GREEN + response_filePath)
    time.sleep(100)
    clear_screen()

def checkAccessToken():
    global ACCESSTOKEN, accesstoken
    try:
        with open(r'C:\Users\paul\Desktop\Better Pronto Tests\terminalUI\accessTokenResponse.json', 'r') as file:
            data = json.load(file)
            accesstoken = data["users"][0]["accesstoken"]
            user_id = data["users"][0]["user"]["id"]
            username = data["users"][0]["user"]["fullname"]
            print(Fore.GREEN + "UserID:", user_id)
            print(Fore.GREEN + "Username:", username)
            print(Fore.GREEN + "AccessToken:", accesstoken)
            if accesstoken != "":
                ACCESSTOKEN = True
    except FileNotFoundError:
        print(Fore.RED + "File not found. Please login to get an access token.")
        ACCESSTOKEN = False
    if ACCESSTOKEN == True:
        print(Fore.GREEN + f"Access Token already exists. Skipping login process.")
    elif ACCESSTOKEN == False:
        print(Fore.RED + "Access Token does not exist. Please login to get an access token.")
        login()

def get_users_bubbles():
    print(Fore.BLUE + "Retrieving bubbles...")
    listofBubbles = r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json"
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
        with open(listofBubbles, 'w') as outfile:
            json.dump(response.json(), outfile, indent=4)
        print(Fore.GREEN + f"Response successfully written to {listofBubbles}")
    except IOError as io_err:
        print(Fore.RED + f"File write error occurred: {io_err}")

clear_screen()
checkAccessToken()
get_users_bubbles()
