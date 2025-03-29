import requests, logging
from datetime import datetime
from dataclasses import dataclass, asdict

class BackendError(Exception):
    pass

# Dataclass for device information
@dataclass
class DeviceInfo:
    browsername: str
    browserversion: str
    osname: str
    type: str

class Pronto:
    API_BASE_URL = "https://stanfordohs.pronto.io/"
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    def __init__(self):
        pass

    # AUTHENTICATION FUNCTIONS
    # Function to verify user email
    def requestVerificationEmail(self, email):
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
    def verification_code_to_login_token(self, email, verification_code):
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
        self.logger.info(f"Payload being sent: {request_payload}")
        try:
            response = requests.post(url, json=request_payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to get user accesstoken from logintoken
    def login_token_to_access_token(self, logintoken):
        url = f"{self.API_BASE_URL}api/v1/user.tokenlogin"
        device_info = {
            "browsername": "firefox",
            "browserversion": "130.0.0",
            "osname": "macOS",
            "type": "WEB",
            "uuid": "314c9314-d5e5-4ae4-84e2-9f2f3938ca28",
            "osversion": "10.15.6",
            "appversion": "1.0.0",
        }
        request_payload = {
            "logintokens": [logintoken],
            "device": device_info,
        }
        headers = {
            "Content-Type": "application/json"
        }
        try:
            response = requests.post(url, json=request_payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # BUBBLE FUNCTIONS
    # Function to get all user's bubbles
    def getUsersBubbles(self, access_token):
        url = f"{self.API_BASE_URL}api/v3/bubble.list"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",  # Ensure 'Bearer' is included
        }
        try:
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to get last 50 messages in a bubble, given bubble ID 
    # and an optional argument of latest message ID, which will return a list of 50 messages sent before that message
    def get_bubble_messages(self, access_token, bubbleID, latestMessageID=None):
        url = f"{self.API_BASE_URL}api/v1/bubble.history"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {"bubble_id": bubbleID}
        if latestMessageID is not None:
            request_payload["latest"] = latestMessageID
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to get information about a bubble
    def get_bubble_info(self, access_token, bubbleID):
        url = f"{self.API_BASE_URL}api/v2/bubble.info"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubble_id": bubbleID,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to mark a bubble as read
    def markBubble(self, access_token, bubbleID, message_id=None):
        url = f"{self.API_BASE_URL}api/v1/bubble.mark"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubble_id": bubbleID,
            "message_id": message_id
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    def membershipUpdate(self, access_token, bubbleID, marked_unread=False):
        url = f"{self.API_BASE_URL}api/v1/membership.update"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubble_id": bubbleID,
            "marked_unread": marked_unread,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to create DM
    def createDM(self, access_token, id, orgID):
        url = f"{self.API_BASE_URL}api/v1/dm.create"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "organization_id": orgID,
            "user_id": id,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to create a bubble/group
    def createBubble(self, access_token, orgID, title, category_id):
        url = f"{self.API_BASE_URL}api/v1/bubble.create"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        if category_id is not None:
            request_payload = {
                "organization_id": orgID,
                "title": title,
                "category_id": category_id,
            }
        else:
            request_payload = {
                "organization_id": orgID,
                "title": title,
            }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to add a member to a bubble
    # invitations is a list of user IDs, in the form of [{user_id: 5302519}, {user_id: 5302367}]
    def addMemberToBubble(self, access_token, bubbleID, invitations, sendemails, sendsms):
        url = f"{self.API_BASE_URL}api/v1/bubble.invite"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubbleID": bubbleID,
            "invitations": invitations,
            "sendemails": sendemails,
            "sendsms": sendsms,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to kick user from a bubble
    # users is a list of user IDs, in the form of [5302519]
    def kickUserFromBubble(self, access_token, bubbleID, users):
        url = f"{self.API_BASE_URL}api/v1/bubble.kick"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubble_id": bubbleID,
            users: users,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to update a bubble
    # title is the new title of the bubble, in the form of a string
    # category_id is the new category ID of the bubble, in the form of an integer such as 173528
    # changetitle = allow "owner" or "member" to change the title of the bubble
    # addmember = allow "owner" or "member" to add a member to the bubble
    # leavegroup = allow "owner" or "member" to leave the bubble
    # create_message = allow "owner" or "member" to create a message in the bubble
    # assign_task = allow "owner" or "member" to assign a task in the bubble
    # pin_message = allow "owner" or "member" to pin a message in the bubble or "null"
    # changecategory = allow "owner" or "member" to change the category of the bubble
    # removemember = allow "owner" or "member" to remove a member from the bubble
    # create_videosession = allow "owner" or "member" to create a video session in the bubble
    # videosessionrecordcloud = allow "owner" or "member" to record a video session in the cloud
    # create_announcement = allow "owner" or "member" to create an announcement in the bubble

    def updateBubble(self, access_token, bubbleID, title=None, category_id=None, changetitle=None, addmember=None, leavegroup=None, create_message=None, assign_task=None, pin_message=None, changecategory=None, removemember=None, create_videosession=None, videosessionrecordcloud=None, create_announcement=None):
        url = f"{self.API_BASE_URL}api/v1/bubble.update"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "bubble_id": bubbleID,
        }
        if title is not None:
            request_payload["title"] = title
        if category_id is not None:
            request_payload["category_id"] = category_id
        if changetitle is not None:
            request_payload["changetitle"] = changetitle
        if addmember is not None:
            request_payload["addmember"] = addmember
        if leavegroup is not None:
            request_payload["leavegroup"] = leavegroup
        if create_message is not None:
            request_payload["create_message"] = create_message
        if assign_task is not None:
            request_payload["assign_task"] = assign_task
        if pin_message is not None:
            request_payload["pin_message"] = pin_message
        if changecategory is not None:
            request_payload["changecategory"] = changecategory
        if removemember is not None:
            request_payload["removemember"] = removemember
        if create_videosession is not None:
            request_payload["create_videosession"] = create_videosession
        if videosessionrecordcloud is not None:
            request_payload["videosessionrecordcloud"] = videosessionrecordcloud
        if create_announcement is not None:
            request_payload["create_announcement"] = create_announcement
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to pin message to bubble
    # Example {bubble_id: 3955365, pinned_message_id: 96930584, pinned_message_expires_at: "2025-01-18 23:12:18"}
    # or send pinned_messageid: "null" to unpin the message
    def pinMessage(self, access_token, pinned_message_id, pinned_message_expires_at):
        url = f"{self.API_BASE_URL}api/v1/bubble.update"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "pinned_message_id": pinned_message_id,
            "pinned_message_expires_at": pinned_message_expires_at,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to create invite link
    # access is the access level of the invite, expiration is the expiration date of the invite
    # access example: access: "internal"
    # ^this allows for only users with the link and who are a part of the org to join
    # expiration example: expires: "2024-12-09T16:08:34.332Z"

    def createInvite(self, bubbleID, access, expires, access_token):
        url = f"{self.API_BASE_URL}api/clients/groups/{bubbleID}/invites"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "access": access,
            "expires": expires,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # MESSAGE FUNCTIONS
    # Function to send a message to a bubble
    def send_message_to_bubble(self, access_token, bubbleID, created_at, message, userID, uuid, parentmessage_id):
        url = f"{self.API_BASE_URL}api/v1/message.create"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        if parentmessage_id is None:
            request_payload = {
                "bubble_id": bubbleID,
                "created_at": created_at,
                "id": "Null",
                "message": message,
                "messagemedia": [],
                "user_id": userID,
                "uuid": uuid  
            }
        else:
            request_payload = {
                "bubble_id": bubbleID,
                "created_at": created_at,
                "id": "Null",
                "message": message,
                "messagemedia": [],
                "parentmessage_id": parentmessage_id,
                "user_id": userID,
                "uuid": uuid  
            }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to add a reaction to a message
    def addReaction(self, access_token, messageID, reactiontype_id):
        url = f"{self.API_BASE_URL}api/v1/message.addreaction"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "message_id": messageID,
            "reactiontype_id": reactiontype_id,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to remove a reaction from a message
    def removeReaction(self, access_token, messageID, reactiontype_id):
        url = f"{self.API_BASE_URL}api/v1/message.removereaction"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "message_id": messageID,
            "reactiontype_id": reactiontype_id,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to edit a message
    def editMessgae(self, access_token, newMessage, messageID):
        url = f"{self.API_BASE_URL}api/v1/message.edit"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "message": newMessage,
            "message_id": messageID,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to delete a message
    def deleteMessage(self, access_token, messageID):
        url = f"{self.API_BASE_URL}api/v1/message.delete"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "message_id": messageID,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # USER INFO FUNCTIONS
    # Function to get user information
    def userInfo(self, access_token, id):
        url = f"{self.API_BASE_URL}api/v1/user.info"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "id": id,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to get a user's mutual groups
    def mutualGroups(self, access_token, id):
        url = f"{self.API_BASE_URL}api/v1/user.mutualgroups"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "id": id,
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            response_json = response.json()
            return response_json
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # Function to set online/offline status
    def setStatus(self, access_token, userID, isonline, lastpresencetime):
        url = f"{self.API_BASE_URL}api/clients/users/presence"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {  
            "data": [
                {
                    "user_id": userID,
                    "isonline": isonline,
                    "lastpresencetime": lastpresencetime
                }
            ]
        }
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # OTHER Functions
    # Search for message function
    # EXAMPLE: {search_type: "files", size: 25, from: 0, orderby: "newest", query: "hello there", user_ids: [5302419]}
    def searchMessage(self, access_token, query, bubbleID=None, orderby=None, user_ids=None):
        url = f"{self.API_BASE_URL}api/v1/message.search"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "search_type": "messages",
            "size": 25,
            "from": 0,
            "query": query,
        }
        if bubbleID is not None:
            request_payload["bubble_id"] = bubbleID
        if orderby is not None:
            request_payload["orderby"] = orderby
        if user_ids is not None:
            request_payload["user_ids"] = user_ids
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")

    # {"orderby":["firstname","lastname"],"includeself":true,"bubble_id":"3640189","page":1}
    def bubbleMembershipSearch(self, access_token, bubble_id, orderby=["firstname", "lastname"], includeself=True, page=None):
        url = f"{self.API_BASE_URL}/api/v1/bubble.membershipsearch"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        request_payload = {
            "orderby": orderby,
            "includeself": includeself,
            "bubble_id": bubble_id,
        }
        if page is not None:
            request_payload["page"] = page
        try:
            response = requests.post(url, headers=headers, json=request_payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err} - Response: {response.text}")
            if response.status_code == 401:
                raise BackendError(f"HTTP error occurred: {http_err}")
            else:
                raise BackendError(f"HTTP error occurred: {http_err}")
        except requests.exceptions.RequestException as req_err:
            self.logger.error(f"Request exception occurred: {req_err}")
            raise BackendError(f"Request exception occurred: {req_err}")
        except Exception as err:
            self.logger.error(f"An unexpected error occurred: {err}")
            raise BackendError(f"An unexpected error occurred: {err}")