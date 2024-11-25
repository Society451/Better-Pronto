import requests
import logging
import time
import json
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

# Main execution starts here
if __name__ == "__main__":
    email = "paul257@ohs.stanford.edu"
    try:
        print("Requesting verification code for", email)
        request_start_time = time.time()
        result = post_user_verify(email)
        request_end_time = time.time()
        total_time = request_end_time - request_start_time
        print(f"Request took {total_time:.2f} seconds.")
        print("Verification email sent:", result)
        print(f"Please check {email} for the verification code.")
    except BackendError as e:
        print(e)

    verification_code_to_accessToken(email)

    # Define the API base URL and endpoint
    api_base_url = "https://stanfordohs.pronto.io/"
    endpoint = "api/v1/user.tokenlogin"

    # Load the login token from the response file
    login_token = load_and_search(r"C:\Users\paul\Desktop\Better Pronto\Authentication\JSON\LoginToken_Response.json", 'logintoken')
    print(f"Login Token: {login_token}")

    # Create the payload
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

    # Send the POST request
    start_time = time.time()
    response = requests.post(f"{api_base_url}{endpoint}", json=payload)
    end_time = time.time()
    print(f"Request sent in {end_time - start_time} seconds")

    # Check the response
    if response.status_code == 200:
        response_data = response.json()
        print("Success:", response_data)
    else:
        response_data = {"error": response.status_code, "message": response.text}
        print(f"Error: {response.status_code} - {response.text}")

    # Save the response to a file in JSON format
    response_file_path = r"C:\Users\paul\Desktop\Better Pronto\Authentication\JSON\accessTokenResponse.json"
    with open(response_file_path, 'w') as file:
        json.dump(response_data, file, indent=4)
