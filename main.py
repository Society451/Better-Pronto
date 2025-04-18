#!/usr/bin/env python3
# main.py — Better‑Pronto
# Author: Paul Estrada <paul257@ohs.stanford.edu>

import os, re, json, datetime, threading, time, socket, webbrowser, sys
from flask import Flask, send_from_directory, jsonify, request, redirect
from flask_socketio import SocketIO
from bpro.systemcheck import createappfolders
from bpro.readjson import ReadJSON
from bpro.pronto import Pronto
from bproapi import Api

# ─── Debug: ensure this file is the one you're editing ───────────────────────────
print("=== LOADED main.py:", __file__, " | __name__=", __name__, " ===")

# ─── Configuration ──────────────────────────────────────────────────────────────
DEFAULT_PORT = 6969   # Define a default port
PORT = DEFAULT_PORT   # This will be potentially updated if default port is in use
default_chat_id = None
accesstoken = ""
ws_thread = None  # Track the websocket thread globally

# ─── Filesystem prep & token loading ────────────────────────────────────────────
(auth_path, chats_path, bubbles_path,
 loginTokenJSONPath, authTokenJSONPath,
 verificationCodeResponseJSONPath,
 settings_path, encryption_path,
 logs_path, settingsJSONPath,
 keysJSONPath, bubbleOverviewJSONPath,
 users_path) = createappfolders()

os.makedirs(os.path.dirname(settingsJSONPath), exist_ok=True)

def load_access_token():
    global accesstoken
    accesstoken = ReadJSON.getaccesstoken(authTokenJSONPath) or ""
    print("Loaded access token:", accesstoken[:5] + "…"+accesstoken[-5:] if accesstoken else "NONE")

load_access_token()
user_info = ReadJSON.get_clientUserInfo(authTokenJSONPath) or {}
userID = user_info.get("id")
print("User ID:", userID)

# ─── Pronto & API setup ─────────────────────────────────────────────────────────
pronto = Pronto()
api = Api(accesstoken)
print("API methods:", dir(api))

# ─── Flask & SocketIO setup ────────────────────────────────────────────────────
app = Flask(__name__, static_folder='frontend', static_url_path='/')
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins="*")
browser_opened = False

def check_port_available(port):
    """Check if the given port is available"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('0.0.0.0', port))
        s.close()
        return True
    except OSError:
        return False

def find_available_port(start_port, max_attempts=10):
    """Find an available port starting from start_port"""
    for port_offset in range(max_attempts):
        port = start_port + port_offset
        if check_port_available(port):
            return port
    return None

def is_authenticated():
    if not accesstoken: load_access_token()
    return bool(accesstoken)

def open_browser():
    global browser_opened, default_chat_id
    if browser_opened: return
    
    # wait for the server to accept connections
    print(f"✓ Waiting for server at port {PORT}...")
    ready = False
    for attempt in range(20):
        try:
            s = socket.create_connection(("localhost", PORT), timeout=1)
            s.close()
            ready = True
            print(f"✓ Server online at port {PORT} (attempt {attempt+1})")
            break
        except (OSError, ConnectionRefusedError) as e:
            print(f"× Connection attempt {attempt+1}: {e}")
            time.sleep(0.5)
    
    if not ready:
        print("× Server not responding after 10 seconds - not opening browser")
        return
        
    path = f"/chat/{default_chat_id}" if default_chat_id else ""
    url = f"http://localhost:{PORT}{path}"
    print(f"→ Opening browser to {url}")
    try:
        webbrowser.open(url)
        browser_opened = True
    except Exception as e:
        print(f"× Failed to open browser: {e}")

# ─── WebSocket client initialization ────────────────────────────────────────────
def start_websocket_client():
    global ws_thread

    try:
        from bpro.websockets2 import WebSocketClient
        
        bubble_to_sub = "3832006"  # Set default_chat_id in thread to avoid race conditions
        code = ReadJSON().get_channelcodes(bubbleOverviewJSONPath, bubble_to_sub)
        
        if not code:
            print("ERROR: No channel code found for bubble", bubble_to_sub)
            return False
            
        def ws_thread_target():
            try:
                print("WebSocket thread starting...")
                ws_client = WebSocketClient(api.api_base_url, accesstoken, bubble_to_sub, code, on_ws_event)
                ws_client.start()  # This will block the thread
            except Exception as ex:
                print("WebSocket thread error:", ex)
                
        # Create and start the thread
        ws_thread = threading.Thread(
            target=ws_thread_target,
            name="WebSocketThread",
            daemon=True
        )
        ws_thread.start()
        
        # Store the ID we want to open in the browser
        global default_chat_id
        default_chat_id = bubble_to_sub
        
        print("WebSocket thread started")
        return True
    except Exception as ex:
        print("Failed to start WebSocket client:", ex)
        return False

# ─── WebSocket → Socket.IO bridge ───────────────────────────────────────────────
def on_ws_event(e):
    et = e.get("event","").split("\\")[-1]
    data = json.loads(e.get("data","{}"))
    print("WS event:", et, data)
    if et=="UserTyping":
        socketio.emit("user_typing", {
            "user_id": data.get("user_id"),
            "thread_id": data.get("thread_id")
        }, broadcast=True)
    elif et=="UserStoppedTyping":
        socketio.emit("user_stopped_typing", {
            "user_id": data.get("user_id")
        }, broadcast=True)

# ─── Auth routes ────────────────────────────────────────────────────────────────
@app.route("/login")
def login_page():
    return send_from_directory("frontend/login_and_verificationCode/login", "login.html")

@app.route("/verification")
def verification_page():
    return send_from_directory("frontend/login_and_verificationCode/verificationCode", "verificationCode.html")

@app.route("/api/handle_email", methods=["POST"])
def handle_email():
    data = request.json or {}
    email = data.get("email")
    if not email: return jsonify(error="Email required"), 400
    if not email.endswith("@stanford.edu"):
        return jsonify(error="Invalid domain"), 400
    try:
        resp = pronto.requestVerificationEmail(email)
        return jsonify(success=True, response=resp)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/handle_verification_code", methods=["POST"])
def handle_verification_code():
    data = request.json or {}
    email, code = data.get("email"), data.get("code")
    if not email or not code:
        return jsonify(error="Email+code required"), 400
    try:
        resp = pronto.verification_code_to_login_token(email, code)
        if resp.get("ok"):
            ReadJSON.save_response_to_file(resp, loginTokenJSONPath)
            token = ReadJSON.getvalueLogin(loginTokenJSONPath, "logintoken")
            auth_resp = pronto.login_token_to_access_token(token)
            ReadJSON.save_response_to_file(auth_resp, authTokenJSONPath)
            load_access_token()
            return jsonify(success=True)
        return jsonify(error="Verification failed", response=resp), 401
    except Exception as e:
        return jsonify(error=str(e)), 500

# ─── Frontend routes ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if not is_authenticated(): return redirect("/login")
    return send_from_directory("frontend/chat", "chat-index.html")

@app.route("/chat/<chat_id>")
def chat_route(chat_id):
    if not is_authenticated(): return redirect("/login")
    return send_from_directory("frontend/chat", "chat-index.html")

# ─── Auth check middleware ─────────────────────────────────────────────────────
@app.before_request
def require_auth_on_api():
    exempt = {"/login","/verification","/api/handle_email","/api/handle_verification_code"}
    if request.path.startswith("/api/") and request.path not in exempt and not is_authenticated():
        return jsonify(error="Authentication required"), 401

# ─── API endpoints ─────────────────────────────────────────────────────────────
@app.route("/api/methods")  # New endpoint that sidebar.js is trying to access
def api_methods():
    return jsonify({"available_methods": dir(api)})

@app.route("/api/accesstoken")
def get_access_token():
    return jsonify(accesstoken=accesstoken) if accesstoken else (jsonify(error="No token"),404)

@app.route("/api/get_Localdms")
def get_local_dms():
    return jsonify(api.get_Localdms() or [])

@app.route("/api/get_Localcategorized_bubbles")
def get_local_cat_bubbles():
    return jsonify(api.get_Localcategorized_bubbles() or {})

@app.route("/api/get_Localuncategorized_bubbles")
def get_local_uncat_bubbles():
    return jsonify(api.get_Localuncategorized_bubbles() or [])

@app.route("/api/get_Localunread_bubbles")
def get_local_unread_bubbles():
    return jsonify(api.get_Localunread_bubbles() or [])

@app.route("/api/get_Localcategories")
def get_local_categories():
    return jsonify(api.get_Localcategories() or [])

@app.route("/api/get_live_bubbles")
def get_live_bubbles():
    try:
        api.get_live_bubbles()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/get_Localmessages")
def get_local_messages():
    bid = request.args.get("bubbleID")
    if not bid: return jsonify(error="bubbleID missing"),400
    return jsonify(api.get_Localmessages(bid) or [])

@app.route("/api/get_dynamicdetailed_messages")
def get_dynamic_messages():
    bid = request.args.get("bubbleID")
    if not bid: return jsonify(error="bubbleID missing"),400
    try:
        resp = api.get_dynamicdetailed_messages(bid)
        for m in resp.get("messages",[]):
            raw = m.get("time_of_sending")
            if raw:
                m["created_at"]=raw
                try:
                    dt = datetime.datetime.strptime(raw,"%Y-%m-%d %H:%M:%S")
                    m["time_of_sending"]=dt.strftime("%-I:%M %p")
                except:
                    pass
        return jsonify(resp)
    except Exception as e:
        return jsonify(error=str(e)),500

@app.route("/api/send_message", methods=["POST"])
def send_message():
    data = request.json or {}
    bid, txt = data.get("chatId"), data.get("message")
    if not bid or not txt:
        return jsonify(error="Missing chatId/message"),400
    res = api.send_message(bid, txt, userID, data.get("parentMessageId"))
    return (jsonify(res),200) if res.get("ok") else (jsonify(res),500)

@app.route("/api/markBubbleAsRead", methods=["POST"])
def mark_read():
    d = request.json or {}
    bid = d.get("bubbleId")
    if not bid: return jsonify(error="Missing bubbleId"),400
    r = api.markBubbleAsRead(bid, d.get("messageId"))
    return jsonify(ok=bool(r), response=r)

@app.route("/api/delete_message", methods=["POST"])
def delete_message():
    mid = (request.json or {}).get("messageId")
    if not mid: return jsonify(error="Missing messageId"),400
    res = api.delete_message(mid)
    return (jsonify(res),200) if res.get("ok") else (jsonify(res),500)

# ─── Socket.IO event handlers ─────────────────────────────────────────────
@socketio.on('connect')
def handle_connect():
    print(f"SocketIO: Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"SocketIO: Client disconnected")

@socketio.on('user_typing')
def handle_user_typing(data):
    print(f"SocketIO: User typing event: {data}")
    # No need to re-broadcast as the typing event already comes from the Pusher client
    # However, we could add server-side typing status tracking here if needed

@socketio.on('user_stopped_typing')
def handle_user_stopped_typing(data):
    print(f"SocketIO: User stopped typing event: {data}")
    # No need to re-broadcast as the event already comes from the Pusher client

# ─── Main entrypoint ────────────────────────────────────────────────────────────
if __name__=="__main__":
    print("=== Entering __main__ ===")
    
    # Find an available port
    PORT = find_available_port(DEFAULT_PORT)
    if PORT is None:
        print(f"ERROR: No available ports found in range {DEFAULT_PORT}-{DEFAULT_PORT+10}!")
        sys.exit(1)
    elif PORT != DEFAULT_PORT:
        print(f"NOTE: Default port {DEFAULT_PORT} is in use. Using port {PORT} instead.")

    # Browser opener - start after a delay to let server initialize
    threading.Timer(3.0, open_browser).start()

    # Print server start message
    print(f"\n{'='*60}")
    print(f"=== Starting server at http://localhost:{PORT} ===")
    print(f"{'='*60}\n")

    # Start the WebSocket client AFTER server initialization
    socketio.start_background_task(start_websocket_client)

    try:
        # Start the server - this call blocks until server stops
        socketio.run(app,
                    host="0.0.0.0",
                    port=PORT,
                    debug=False,
                    use_reloader=False,
                    log_output=True)
    except Exception as e:
        print(f"× Server failed to start: {e}")
        sys.exit(1)
