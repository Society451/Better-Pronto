import colorama, requests, json
from colorama import Fore
import time
from auth import post_user_verify, token_login, save_response_to_file, load_and_search
import os
import platform

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
    except FileNotFoundError:
        print(Fore.RED + "File not found. Please login to get an access token.")
        ACCESSTOKEN = False
    if ACCESSTOKEN == True:
        print(Fore.GREEN + f"Access Token {accesstoken} already exists. Skipping login process.")
        exit()
    elif ACCESSTOKEN == False:
        print(Fore.RED + "Access Token does not exist. Please login to get an access token.")
        login()

clear_screen()

checkAccessToken()
