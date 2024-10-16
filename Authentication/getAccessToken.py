import requests, time, json
from dataclasses import dataclass, asdict
from get_value_fromJSON import load_and_search

@dataclass
class DeviceInfo:
    browsername: str
    browserversion: str
    osname: str
    type: str

class BackendError(Exception):
    pass

# Define the API base URL
api_base_url = "https://stanfordohs.pronto.io/"
endpoint = "api/v1/user.tokenlogin"  # Adjust this based on the API documentation

file_path = r'C:\Users\paul\Desktop\Better Pronto\dictionary_response.txt'
key_to_search = "logintoken"

login_token = load_and_search(file_path, key_to_search)
print(f"Logintoken result: {login_token}")

# Create the payload
login_tokens = [f"{login_token}"] 
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
    "logintokens": login_tokens,
    "device": device_info,
}

# Send the POST request
start_time = time.time()
response = requests.post(f"{api_base_url}{endpoint}", json=payload)
end_time = time.time()
total_time = end_time - start_time
print(f"Request sent in {total_time} seconds")

# Check the response
if response.status_code == 200:
    print("Success:", response.json())
    response_data = response.json()
else:
    print(f"Error: {response.status_code} - {response.text}")
    response_data = {"error": response.status_code, "message": response.text}

# Save the response to a file in JSON format
response_file_path = r'C:\Users\paul\Desktop\Better Pronto\authToken_Response.txt'
with open(response_file_path, 'w') as file:
    json.dump(response_data, file, indent=4)
