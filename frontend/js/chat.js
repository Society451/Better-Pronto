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
    constructor(content, sender, timestamp, isDefault = false) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.isDefault = isDefault;
    }

    // Create a message element
    createElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (this.isDefault) {
            messageElement.style.fontStyle = 'italic';
        }

        /* Always show sender and timestamp */
        const senderElement = document.createElement('div');
        senderElement.classList.add('message-sender');
        senderElement.textContent = `${this.sender} - ${this.timestamp}`;
        messageElement.appendChild(senderElement);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = this.content;
        messageElement.appendChild(contentElement);

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
            chatItem.innerHTML = `
                ${chat}
                <span class="unread-count">${this.unreadCounts[chat] || 0}</span>
                <button class="menu-button">⋮</button>
                <ul class="dropdown-menu">
                    ${this.createDropdownOptions(['Option 1', 'Option 2', 'Option 3', 'Option 4'])}
                </ul>
            `;
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

// Function to initialize categories and chats dynamically from backend
async function initializeCategories() {
    try {
        console.log("Initializing categories and chats"); // New debug statement
        // const accessTokenResponse = await window.pywebview.api.accessToken();
        // console.log('Access Token Response:', accessTokenResponse); // Existing debug statement

        // if (accessTokenResponse === "Ok") {
            const categories = await window.pywebview.api.get_categories("test_access_token");
            const dms = await window.pywebview.api.get_dms("test_access_token");
            const categorizedBubbles = await window.pywebview.api.get_categorized_bubbles("test_access_token");
            const uncategorizedBubbles = await window.pywebview.api.get_uncategorized_bubbles("test_access_token");
            const unreadBubbles = await window.pywebview.api.get_unread_bubbles("test_access_token");

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

        // } else {
        //     console.error("Access token retrieval failed with response:", accessTokenResponse); // Existing debug statement
        // }
    } catch (error) {
        console.error("Error initializing categories:", error); // Existing debug statement
    }
}

// Function to wait for pywebview API to be ready
function waitForPywebview() {
    if (window.pywebview && window.pywebview.api) {
        initializeCategories();
    } else {
        setTimeout(waitForPywebview, 100); // Check again after 100ms
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

    // Update button text
    toggleAllButton.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
});

// Add event listener to toggle search input
searchButton.addEventListener('click', () => {
    searchButton.style.display = 'none';
    searchContainer.style.display = 'flex';
    searchInput.focus();
});

// Add event listener to clear and exit search input
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchContainer.style.display = 'none';
    searchButton.style.display = 'block';
});
