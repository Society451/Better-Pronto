### 01-15-2025, 4:00:58 PM. CST
Paul Estrada

- Added somewhat dynamic chat headings
- Added dynamic html path for main.py
- Began to fix auth process with corrected accesstoken handling
- ^Fixed auth process with corrected accesstoken handling
- Added function to get live bubbles upon page loading through chat.js
- Began to only make login required if accesstoken has expired (do accesstokens even expire??) / upon 401 error

### 01-14-2025, 5:20:58 PM. CST
Paul Estrada

- Fixed main.py to use updated bubble fetching for local JSON without using auth token
- Updated chat.js api endpoints
- Updated scrolling speed for chat.css (hopefully!)
- Updated chat.html structure
- Began working on chatjson.py and messages.py to allow for dynamically loading messages in a given bubble on the frontend
- Added a function within readjson.py to create a bubble folder that contains folders for the individual bubbles in the format of "{bubbleID} - {bubbleTitlte}"

### 01-13-2025, 5:11:20 PM, CST
Paul Estrada

- Fixed json and html paths within main.py