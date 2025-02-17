### 02-15-25, 10:19:28 PM, CST
[@Society451](https://github.com/Society451)

- Found out that Pronto ignores parentmessageid payload :(

### 02-6-25, 12:38:34 PM, CST
[@Society451](https://github.com/Society451)

Backend Team:
- Simply imported everything from readjson.py and pronto.py in main.py
- Added method within main.yp and readjson.py to get userinfo

### 01-28-25, 11:39:28 PM, CST
[@Society451](https://github.com/Society451)

Backend Team:
- Ensured first login with empty accesstoken.json doesn't require a restart of the program upon initial login
- Worked on automatic writing of messages/bubbles
- Added getLocal and getDynamic functions for each bubble/message method, which will first get local messages and then dynamic messages from the Pronto servers

Frontend Team ([@di4rm4d4](https://github.com/di4rm4d4)):
- Removed red unread bubble icon when there are not any unread messages in said bubble
- Improved message rendering within bubbles
- Began work on timestamps and tags
----
### 01-22-2025, 3:15:29 PM, CST
[@Society451](https://github.com/Society451)

- Modified the create_bubble_folders function to not create the folder if it already exists
- Added proper handling of authtoken within main.py
- Added automatic local message storage
----
### 01-16-2025, 4:02:59 PM, CST
[@Society451](https://github.com/Society451)

- Added dynamic message fetching (FINALLY)!!
- [@di4rm4d4](https://github.com/di4rm4d4) started working on custom themes
- Added reroute to login.html after 401 error
- Began research on websockets
- Added requirements.txt
- Updated auth process
- Updated message parsing functions in chat.js
----
### 01-15-2025, 4:00:58 PM, CST
[@Society451](https://github.com/Society451)

- Added somewhat dynamic chat headings
- Added dynamic html path for main.py
- Began to fix auth process with corrected accesstoken handling
- ^Fixed auth process with corrected accesstoken handling
- Added function to get live bubbles upon page loading through chat.js
- Began to only make login required if accesstoken has expired (do accesstokens even expire??) / upon 401 error
----
### 01-14-2025, 5:20:58 PM. CST
[@Society451](https://github.com/Society451)

- Fixed main.py to use updated bubble fetching for local JSON without using auth token
- Updated chat.js api endpoints
- Updated scrolling speed for chat.css (hopefully!)
- Updated chat.html structure
- Began working on chatjson.py and messages.py to allow for dynamically loading messages in a given bubble on the frontend
- Added a function within readjson.py to create a bubble folder that contains folders for the individual bubbles in the format of "{bubbleID} - {bubbleTitlte}"
----
### 01-13-2025, 5:11:20 PM, CST
[@Society451](https://github.com/Society451)

- Fixed json and html paths within main.py
----
