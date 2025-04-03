import os, re
from bpro.pronto import Pronto
from bpro.systemcheck import *
from bpro.readjson import ReadJSON
from bproapi import *
import datetime
import webbrowser
from flask import Flask, send_from_directory, jsonify, request

# Port configuration - changed to higher port number that doesn't require root privileges
PORT = 6969

auth_path, chats_path, bubbles_path, loginTokenJSONPath, authTokenJSONPath, verificationCodeResponseJSONPath, settings_path, encryption_path, logs_path, settingsJSONPath, keysJSONPath, bubbleOverviewJSONPath, users_path = createappfolders()
# Verify the directory exists
if not os.path.exists(os.path.dirname(settingsJSONPath)):
    print(f"Creating settings directory: {os.path.dirname(settingsJSONPath)}")
    os.makedirs(os.path.dirname(settingsJSONPath), exist_ok=True)
accesstoken = ""
user_info = ReadJSON.get_clientUserInfo(authTokenJSONPath)
userID = user_info["id"] if user_info else None

# Initialize Pronto instance
pronto = Pronto()

def getLocalAccesstoken():
    global accesstoken
    accesstoken = ReadJSON.getaccesstoken(authTokenJSONPath)
    if accesstoken:
        print(f"Access token retrieved successfully: {accesstoken[:5]}...{accesstoken[-5:]}") 
    else:
        print("Access token not found or invalid")
getLocalAccesstoken()

current_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(current_dir, 'frontend', 'chat', 'chat-index.html')

# Function to save response data to a file
def save_response_to_file(response_data, file_path):
    ReadJSON.save_response_to_file(response_data, file_path)

def getvalueLogin(file_path, value):
    return ReadJSON.getvalueLogin(file_path, value)

# Function to sanitize folder names
def sanitize_folder_name(name):
    sanitized_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return sanitized_name

# Create an instance of the Api class with the accesstoken
api = Api(accesstoken)
print("Available API methods:", dir(api))

# Initialize Flask app
app = Flask(__name__, static_folder='frontend/chat', static_url_path='/')

# Flag to track if browser has been opened
browser_opened = False

# Function to open browser after server starts
def open_browser():
    global browser_opened
    # Only open browser in the main Flask worker process, not the reloader process
    if not browser_opened and os.environ.get('WERKZEUG_RUN_MAIN') == 'true':  
        url = f"http://localhost:{PORT}"
        print(f"Opening browser to {url}")
        webbrowser.open(url)
        browser_opened = True

# Serve the chat-index.html file
@app.route('/')
def index():
    return send_from_directory('frontend/chat', 'chat-index.html')

# API endpoints to match the functions in api class
@app.route('/api/methods', methods=['GET'])
def api_methods():
    return jsonify({"available_methods": dir(api)})

@app.route('/api/accesstoken', methods=['GET'])
def get_access_token():
    if accesstoken:
        return jsonify({"accesstoken": accesstoken})
    else:
        return jsonify({"error": "Access token not found or invalid"}), 404

@app.route('/api/get_Localdms', methods=['GET'])
def get_local_dms():
    result = api.get_Localdms()
    return jsonify(result if result else [])

@app.route('/api/get_Localcategorized_bubbles', methods=['GET'])
def get_local_categorized_bubbles():
    result = api.get_Localcategorized_bubbles()
    return jsonify(result if result else {})

@app.route('/api/get_Localuncategorized_bubbles', methods=['GET'])
def get_local_uncategorized_bubbles():
    result = api.get_Localuncategorized_bubbles()
    return jsonify(result if result else [])

@app.route('/api/get_Localunread_bubbles', methods=['GET'])
def get_local_unread_bubbles():
    result = api.get_Localunread_bubbles()
    return jsonify(result if result else [])

@app.route('/api/get_Localcategories', methods=['GET'])
def get_local_categories():
    result = api.get_Localcategories()
    return jsonify(result if result else [])

@app.route('/api/get_live_bubbles', methods=['GET'])
def get_live_bubbles():
    try:
        api.get_live_bubbles()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_Localmessages', methods=['GET'])
def get_local_messages():
    bubble_id = request.args.get('bubbleID')
    if not bubble_id:
        return jsonify({"error": "No bubble ID provided"}), 400
    
    result = api.get_Localmessages(bubble_id)
    return jsonify(result)

@app.route('/api/get_dynamicdetailed_messages', methods=['GET'])
def get_dynamic_detailed_messages():
    bubble_id = request.args.get('bubbleID')
    if not bubble_id:
        return jsonify({"error": "No bubble ID provided"}), 400
    
    result = api.get_dynamicdetailed_messages(bubble_id)
    return jsonify(result)

@app.route('/api/send_message', methods=['POST'])
def send_message():
    data = request.json
    if not data or 'chatId' not in data or 'message' not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    bubble_id = data['chatId']
    message_text = data['message']
    parent_message_id = data.get('parentMessageId')
    
    # Use the API to send the message
    result = api.send_message(bubble_id, message_text, userID, parent_message_id)
    if result.get('ok'):
        return jsonify(result)
    else:
        return jsonify(result), 500

@app.route('/api/markBubbleAsRead', methods=['POST'])
def mark_bubble_as_read():
    data = request.json
    if not data or 'bubbleId' not in data:
        return jsonify({"error": "Missing bubble ID"}), 400
    
    bubble_id = data['bubbleId']
    message_id = data.get('messageId')
    
    result = api.markBubbleAsRead(bubble_id, message_id)
    return jsonify({"ok": True if result else False, "response": result})

@app.route('/api/delete_message', methods=['POST'])
def delete_message():
    data = request.json
    if not data or 'messageId' not in data:
        return jsonify({"error": "Missing message ID"}), 400
    
    message_id = data['messageId']
    result = api.delete_message(message_id)
    if result.get('ok'):
        return jsonify(result)
    else:
        return jsonify(result), 500

# Start the Flask app
if __name__ == '__main__':
    # Open browser in a separate thread to avoid blocking
    import threading
    threading.Timer(1.5, open_browser).start()
    
    # Start the Flask app on localhost port 5451
    print(f"Starting server at http://localhost:{PORT}")
    app.run(debug=True, host='localhost', port=PORT)