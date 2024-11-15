from getValuefromAccessJSON import load_and_search
import json, requests, time

def get_users_bubbles(file_path, output_file_path):
    userID = load_and_search(file_path, "id")

    url = "https://stanfordohs.pronto.io/api/v3/bubble.list"

    # Load the access token
    access_token = load_and_search(file_path, "accesstoken")
    if not access_token:
        raise ValueError("Access token not found or invalid")

    userID = load_and_search(file_path, "id")
    if not userID:
        raise ValueError("User ID not found or invalid")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",  # Ensure 'Bearer' is included
    }

    try:
        start_time = time.time()
        response = requests.post(url, headers=headers)
        end_time = time.time()
        response.raise_for_status()  # Raise an error for bad status codes
        print("Access Token:", access_token)
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
        print(f"Request completed in {end_time - start_time} seconds")

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - Response: {response.text}")
        return
    except requests.exceptions.RequestException as req_err:
        print(f"Request exception occurred: {req_err}")
        return
    except Exception as err:
        print(f"An unexpected error occurred: {err}")
        return

    try:
        with open(output_file_path, 'w') as outfile:
            json.dump(response.json(), outfile, indent=4)
        print(f"Response successfully written to {output_file_path}")
    except IOError as io_err:
        print(f"File write error occurred: {io_err}")

# Example usage
file_path = r"C:\Users\paul\Desktop\Better Pronto\Authentication\JSON\accessTokenResponse.json"
output_file_path = r"C:\Users\paul\Desktop\Better Pronto\getUsersChatData\json\listofBubbles.json"
get_users_bubbles(file_path, output_file_path)
