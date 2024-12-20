import webview
import json
from bpro.pronto import requestVerificationEmail, verification_code_to_login_token

class Api:
    def __init__(self):
        self.email = ""

    # Method to handle email input
    def handle_email(self, email):
        # Check if the email domain is "stanford.edu"
        if "stanford.edu" in email:
            self.email = email
            # Request a verification email to be sent
            print(requestVerificationEmail(email))
            print("Email accepted and verification code has been sent")
            return "Email accepted"
        else:
            return "Invalid email domain"

    # Method to handle verification code input
    def handle_verification_code(self, code):
        print("Verification code checked")
        # Convert verification code to login token
        response = verification_code_to_login_token(self.email, code)
        print(response)
        # Save the response to a file
        save_response_to_file(response, "LoginToken_ResponseFilePath.json")
        return response

# Function to save response data to a file
def save_response_to_file(response_data, file_path):
    try:
        with open(file_path, "w") as file:
            json.dump(response_data, file, indent=4)
    except Exception as e:
        print(f"Error saving response to file: {e}")

# Create an instance of the Api class
api = Api()
# Create a webview window with the specified HTML file and API
window = webview.create_window('Better Pronto Alpha', 'file:///home/paul/Desktop/Python Projects/BRPO/Better Pronto Alpha/pywebview/frontend/login.html', js_api=api)
# Start the webview
webview.start()
