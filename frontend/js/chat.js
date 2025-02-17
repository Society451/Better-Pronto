const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchContainer = document.querySelector('.search-container');
const clearSearch = document.getElementById('clear-search');
const toggleAllButton = document.getElementById('toggle-all');
const chatHeading = document.getElementById('chat-heading');

let lastSender = null; // Track the last message sender
const hasDeletePermission = true; // Message Delete permission
let isShiftPressed = false; // Track if Shift key is pressed


function updateUnreadCounts() {
    document.querySelectorAll('.chat-item').forEach(chatItem => {
        const unreadCountElement = chatItem.querySelector('.unread-count');
        const unreadCount = parseInt(unreadCountElement.textContent, 10);

        if (unreadCount === 0) {
            unreadCountElement.style.display = 'none'; // Hide unread count bubble with 0 unread messages
        } else {
            unreadCountElement.style.display = 'inline-block'; // Show unread count bubble with unread messages
        }
    });
}


// Function to set chat heading dynamically
function setChatHeading(name) {
    chatHeading.textContent = name;
}

// Example usage of setChatHeading
setChatHeading('Dynamic Chat Heading');

// Detect Shift key press and release
document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = false;
    }
});

// Message class to create message elements
class Message {
    constructor(content, sender, timestamp, user, isDefault = false) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.user = user;
        this.isDefault = isDefault;
    }

    // Create a message element
    createElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (this.isDefault) {
            messageElement.style.fontStyle = 'italic';
        }
        
        // Create a wrapper with flex layout for profile picture and text content
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper');

        // Always render profile picture (or fallback default)
        const profilePicElement = document.createElement('img');
        profilePicElement.classList.add('profile-pic');
        profilePicElement.alt = `${this.user && this.user.fullname ? this.user.fullname : "User"}'s profile picture`;
        if (this.user && this.user.profilepicurl) {
            profilePicElement.src = this.user.profilepicurl;
            profilePicElement.onerror = () => {
                console.error("Failed to load image:", this.user.profilepicurl);
                // Optionally assign a fallback local image if desired:
                profilePicElement.src = "../images/default-avatar.png";
            };
        } else {
            // Use a local default image instead of the ui-avatars.com fallback
            profilePicElement.src = "../images/default-avatar.png";
        }
        wrapper.appendChild(profilePicElement);

        // Create container for text content
        const textContainer = document.createElement('div');
        textContainer.classList.add('message-text');

        const senderElement = document.createElement('div');
        senderElement.classList.add('message-sender');
        senderElement.textContent = this.sender;
        textContainer.appendChild(senderElement);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = this.content;
        textContainer.appendChild(contentElement);

        const timestampElement = document.createElement('div');
        timestampElement.classList.add('message-timestamp');
        timestampElement.textContent = this.timestamp;
        textContainer.appendChild(timestampElement);

        wrapper.appendChild(textContainer);
        messageElement.appendChild(wrapper);

        /* Add delete icon if permission is granted */
        if (hasDeletePermission) {
            const deleteIcon = document.createElement('i');
            deleteIcon.classList.add('fas', 'fa-trash-alt', 'delete-icon');
            deleteIcon.title = 'Delete Message';
            // Add event listener for deletion if needed
            deleteIcon.addEventListener('click', (event) => {
                event.stopPropagation(); /* Prevent triggering message click */
                messagesContainer.removeChild(messageElement);
            });
            messageElement.appendChild(deleteIcon); /* Ensure deleteIcon is inside messageElement */

            // Change color on hover if Shift key is pressed
            messageElement.addEventListener('mouseover', () => {
                if (isShiftPressed) {
                    deleteIcon.style.color = 'red';
                }
            });

            messageElement.addEventListener('mouseout', () => {
                deleteIcon.style.color = ''; // Reset color
            });
        }

        return messageElement;
    }
}

// Function to retrieve and display detailed messages for a specific bubble ID
async function loadMessages(bubbleID, bubbleName) {
    try {
        console.log(`Loading local messages for bubble ID: ${bubbleID}`); // Debug statement
        const localResponse = await window.pywebview.api.get_Localmessages(bubbleID);
        console.log('Local response retrieved:', localResponse); // Debug statement

        if (!localResponse || typeof localResponse !== 'object' || !Array.isArray(localResponse.messages)) {
            console.error("Invalid local response format received:", localResponse);
            return;
        }

        const localMessages = localResponse.messages.reverse(); // Reverse the order of the messages
        messagesContainer.innerHTML = ''; // Clear existing messages

        if (localMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            localMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing local message:', msg);
                const content = msg.message || msg.content;
                const author = msg.author;
                const timestamp = msg.time_of_sending;
                const user = { fullname: msg.author, profilepicurl: msg.profilepicurl };

                if (content && author && timestamp) {
                    const message = new Message(content, author, timestamp, user);
                    messagesContainer.appendChild(message.createElement()); // Display message in HTML
                } else {
                    console.warn('Incomplete local message data:', msg);
                }
            });
        }

        console.log(`Loading dynamic messages for bubble ID: ${bubbleID}`); // Debug statement
        const dynamicResponse = await window.pywebview.api.get_dynamicdetailed_messages(bubbleID);
        console.log('Dynamic response retrieved:', dynamicResponse); // Debug statement

        if (!dynamicResponse || typeof dynamicResponse !== 'object' || !Array.isArray(dynamicResponse.messages)) {
            console.error("Invalid dynamic response format received:", dynamicResponse);
            return;
        }

        const dynamicMessages = dynamicResponse.messages.reverse(); // Reverse the order of the messages

        if (dynamicMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            messagesContainer.innerHTML = ''; // Clear existing messages before adding dynamic messages
            dynamicMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing dynamic message:', msg);
                const content = msg.message || msg.content;
                const author = msg.author;
                const timestamp = msg.time_of_sending;
                const user = { fullname: msg.author, profilepicurl: msg.profilepicurl };

                if (content && author && timestamp) {
                    const message = new Message(content, author, timestamp, user);
                    messagesContainer.appendChild(message.createElement()); // Display message in HTML
                } else {
                    console.warn('Incomplete dynamic message data:', msg);
                }
            });
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        setChatHeading(bubbleName); // Update chat heading with the bubble name
    } catch (error) {
        console.error("Error loading messages:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
}

// Function to initialize categories and chats dynamically from backend
async function initializeCategories() {
    try {
        console.log("Initializing categories and chats"); // New debug statement

        const categories = await window.pywebview.api.get_Localcategories();
        const dms = await window.pywebview.api.get_Localdms();
        const categorizedBubbles = await window.pywebview.api.get_Localcategorized_bubbles();
        const uncategorizedBubbles = await window.pywebview.api.get_Localuncategorized_bubbles();
        const unreadBubbles = await window.pywebview.api.get_Localunread_bubbles();

        const unreadMap = {};
        unreadBubbles.forEach(item => {
            unreadMap[item.title] = item.unread;
        });

        const categoryElements = [];

        // Add DM category
        if (dms.length > 0) {
            categoryElements.push(new Category('Direct Messages', dms, unreadMap));
        }

        // Add categorized bubbles
        for (const [categoryName, chats] of Object.entries(categorizedBubbles)) {
            categoryElements.push(new Category(categoryName, chats, unreadMap));
        }

        // Add uncategorized bubbles
        if (uncategorizedBubbles.length > 0) {
            categoryElements.push(new Category('Uncategorized', uncategorizedBubbles, unreadMap));
        }

        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = ''; // Clear existing content
        categoryElements.forEach(category => {
            const categoryElement = category.createElement();
            if (categoryElement) {
                chatList.appendChild(categoryElement);
            } else {
                console.warn('Failed to create category element:', category.name);
            }
        });

        // Add event listeners for category headers and menu buttons
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isExpanded = content.classList.contains('expanded');

                // Toggle the 'expanded' and 'collapsed' classes
                content.classList.toggle('expanded');
                content.classList.toggle('collapsed');

                // Toggle the arrow direction
                header.classList.toggle('collapsed', isExpanded);
            });
        });

        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const dropdown = button.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        });

        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });

        // Update unread counts visibility after rendering
        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error); // Existing debug statement
    }
}

// Category class to create category elements
class Category {
    constructor(name, chats, unreadCounts = {}) {
        this.name = name;
        this.chats = chats;
        this.unreadCounts = unreadCounts;
    }

    // Create a category element
    createElement() {
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category');

        const headerElement = document.createElement('div');
        headerElement.classList.add('category-header');
        headerElement.textContent = this.name;

        const contentElement = document.createElement('div');
        contentElement.classList.add('category-content', 'expanded');

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.setAttribute('data-chat-id', chat.id); // Set the data-chat-id attribute
            chatItem.innerHTML = `
                ${chat.title}
                <span class="unread-count">${this.unreadCounts[chat.title] || 0}</span>
                <button class="menu-button">⋮</button>
                <ul class="dropdown-menu">
                    ${this.createDropdownOptions(['Option 1', 'Option 2', 'Option 3', 'Option 4'])}
                </ul>
            `;
            // Add event listener to call Python function and load messages when clicked
            chatItem.addEventListener('click', () => {
                const chatID = chatItem.getAttribute('data-chat-id');
                window.pywebview.api.print_chat_info(chat.title, chatID);
                loadMessages(chatID, chat.title); // Load messages for the clicked chat and update heading
            });
            contentElement.appendChild(chatItem);
        });

        categoryElement.appendChild(headerElement);
        categoryElement.appendChild(contentElement);

        return categoryElement;
    }

    // Create dropdown options
    createDropdownOptions(options) {
        return options.map(option => `<li>${option}</li>`).join('');
    }
}

// Function to wait for pywebview API to be ready
function waitForPywebview() {
    if (window.pywebview && window.pywebview.api) {
        initializeLiveBubbles();
    } else {
        setTimeout(waitForPywebview, 100); // Check again after 100ms
    }
}

// Function to initialize live bubbles and then categories
async function initializeLiveBubbles() {
    try {
        console.log("Fetching live bubbles"); // Debug statement
        await window.pywebview.api.get_live_bubbles();
        initializeCategories(); // Call initializeCategories after fetching live bubbles
    } catch (error) {
        console.error("Error fetching live bubbles:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
}

// Display a default message when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    console.log('chat.html DOMContentLoaded');  // Debugging statement
    const defaultMessage = new Message('Started a private chat with Paul Estrada', 'System', new Date().toLocaleString(), true);
    messagesContainer.appendChild(defaultMessage.createElement());

    waitForPywebview(); // Wait for pywebview API to be ready

    // const accessTokenResponse = await window.pywebview.api.accessToken();
    // console.log('Access token response:', accessTokenResponse);
});

// Add event listener for the Enter key to send a message
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default Enter key behavior
        const messageText = messageInput.value.trim();
        if (messageText) {
            const sender = 'You'; // Replace with dynamic sender if needed
            const timestamp = new Date().toLocaleString();
            const message = new Message(messageText, sender, timestamp);
            messagesContainer.appendChild(message.createElement());
            messageInput.value = ''; // Clear the input after sending
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        }
    }
});

// Add event listener to toggle all categories
toggleAllButton.addEventListener('click', () => {
    const isCollapsing = toggleAllButton.textContent === 'Collapse All';

    document.querySelectorAll('.category-content').forEach(content => {
        content.classList.toggle('expanded', !isCollapsing);
        content.classList.toggle('collapsed', isCollapsing);
    });
    document.querySelectorAll('.category-header').forEach(header => {
        header.classList.toggle('collapsed', isCollapsing);
    });

    toggleAllButton.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
});

// Add event listener to show search input
searchButton.addEventListener('click', () => {
    searchButton.style.display = 'none';
    searchContainer.style.display = 'flex';
    searchInput.focus();
    toggleAllButton.style.zIndex = '2'; // Ensure the toggle-all button is above the search container
});

// Add event listener to clear and exit search input
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchContainer.style.display = 'none';
    searchButton.style.display = 'block';
    toggleAllButton.style.zIndex = ''; // Reset the z-index of the toggle-all button
});

// Remove any event listeners that might prevent text selection
document.addEventListener('mousedown', (event) => {
    // Do not call event.preventDefault()
});
