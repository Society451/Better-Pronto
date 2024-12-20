import webview
import time
from bpro.pronto import requestVerificationEmail

email = ""

class Api:
    def handle_email(self, email):
        if "stanford.edu" in email:
            email = email
            #print(requestVerificationEmail(email))
            print("Email accepted and verification code has been sent")
            return "Email accepted"
        else:
            return "Invalid email domain"

api = Api()
window = webview.create_window('Better Pronto Alpha', 'file:///home/paul/Desktop/Python Projects/BRPO/Better Pronto Alpha/pywebview/frontend/login.html', js_api=api)
webview.start()
